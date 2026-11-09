# Playnix Game SDK

Everything a game needs to talk to the Playnix platform: **leaderboards**,
**achievements** and **cloud saves**, bound to the player's Telegram account.

The SDK is one file you include with a `<script>` tag. No build step, no
dependencies, roughly 4 KB. Every call fails soft — a network error never
freezes a player's session.

```html
<script src="/sdk/playnix-sdk.js"></script>
<script>
  const playnix = Playnix.create({ game: "my-game" });
</script>
```

`game` must be the slug your game was published under. That slug is how the
API knows which game is reporting a score.

---

## Leaderboards

```js
// Submit a score. Only a personal best is stored, so call it whenever you like.
const result = await playnix.score(1250);
// { score: 1250, best: true, rank: 1, total: 34, board: "default" }

// A "lower is better" board (race times, move counts):
await playnix.score(42.7, { board: "time", direction: "asc" });

// Read the top of a board. Works for signed-out visitors too.
const board = await playnix.leaderboard({ board: "default", limit: 10 });
// { entries: [{ rank, name, username, photoUrl, score }], me: {...} | null }
```

One game can own several boards ("default", "endless", "time"). Each board has
its own direction, fixed on first write.

## Achievements

Declare the catalogue once — usually at start-up — then unlock keys as the
player earns them:

```js
await playnix.defineAchievements([
  { key: "first-win", name: "First Win", description: "Win one round.", points: 10 },
  { key: "streak-10", name: "On Fire", description: "Ten correct answers in a row.", points: 40 },
]);

const unlocked = await playnix.unlock("first-win");
// { new: true, total: 10, points: 10 }

// Show progress:
const all = await playnix.achievements();
// { achievements: [{ key, name, description, points, unlocked, unlockedAt }], points }
```

`unlock` is idempotent — calling it twice does not double the points. Unlocking
a key the game never declared is rejected with `unknown_achievement`, so a
client cannot invent achievements to inflate its own total.

## Cloud saves

```js
// Write
await playnix.save({ level: 4, coins: 90, inventory: ["key", "map"] });

// Read
const { save } = await playnix.load();
if (save) resumeFrom(save.payload);

// Multi-device safety: pass the revision you loaded
await playnix.save(next, { expectedRevision: save.revision });
// throws code "revision_conflict" if another device saved in between

// Reset
await playnix.clearSave();
```

Saves are capped at **64 KB** of JSON and are private to each player. Use
`slot` to keep several saves per game (`{ slot: "level-2" }`).

### Offline-first helper

Mobile players lose connection. `saveLocalFirst` writes to `localStorage`
immediately and mirrors to the cloud in the background:

```js
playnix.saveLocalFirst({ level: 4, coins: 90 });
const local = playnix.loadLocal();   // synchronous, always available
```

---

## Full API

| Method | Returns | Notes |
| --- | --- | --- |
| `score(value, { board, direction })` | `{ score, best, rank, total }` | Stores only personal bests |
| `leaderboard({ board, limit })` | `{ entries, me }` | Public; `me` needs a session |
| `defineAchievements(list)` | `{ defined }` | Idempotent upsert |
| `unlock(key)` | `{ new, total, points }` | Idempotent; unknown keys rejected |
| `achievements()` | `{ achievements, points }` | Includes locked entries |
| `load({ slot })` | `{ save }` | `save` is `null` when empty |
| `save(payload, { slot, expectedRevision })` | `{ save }` | 64 KB limit |
| `clearSave({ slot })` | `{ deleted }` | |
| `saveLocalFirst(payload, opts)` | same as `save` | Writes `localStorage` first |
| `loadLocal(opts)` | object \| null | Synchronous |

Every call resolves an object; on failure it resolves
`{ ok: false, error, code }` instead of throwing. Pass `{ debug: true }` to
`create` to log failures to the console. Use `opts.timeout` per call if you need
a different limit than the 8-second default.

## How the player is identified

The game runs in an iframe on the Playnix origin, so the platform's HttpOnly
session cookie travels with every request. The SDK never sees a token, and the
game cannot impersonate another player. A visitor who is not signed in through
the Telegram bot can still play — their scores simply are not recorded.

## HTTP reference

If you would rather call the endpoints directly (native game, Unity export,
server-side job), the shapes are:

```
POST   /api/sdk/:slug/scores        { score, board?, direction? }
GET    /api/sdk/:slug/scores        ?board=&limit=
PUT    /api/sdk/:slug/achievements  { achievements: [{ key, name, points? }] }
POST   /api/sdk/:slug/achievements  { key }
GET    /api/sdk/:slug/achievements
GET    /api/sdk/:slug/save          ?slot=
PUT    /api/sdk/:slug/save          { payload, slot?, expectedRevision? }
DELETE /api/sdk/:slug/save          ?slot=
```

Writes require a signed-in session and a same-origin `Origin` header. Reads of a
leaderboard and an achievement list are public; saves are always private.

## Limits

| Limit | Value |
| --- | --- |
| Score submissions | 60 / minute / player |
| Achievement unlocks | 120 / minute / player |
| Save writes | 60 / minute / player |
| Cloud save size | 64 KB |
| Achievement definitions | 100 per game |

## Testing locally

The bundled games live in `public/games/<slug>/index.html` and load the SDK with
a relative path, so they work in dev and in production without changes:

```html
<script src="/sdk/playnix-sdk.js"></script>
```

Run `npm run games:check` to boot every bundled game headlessly.
