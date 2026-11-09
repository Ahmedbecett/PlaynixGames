# Building a game for Playnix

A Playnix game is a self-contained HTML5 page. This guide covers the technical
requirements, the SDK, and how a submission reaches players.

---

## The short version

```
public/games/my-game/
  index.html      ← everything: markup, CSS, JS
```

Then register it in `scripts/seed-data.ts`, generate a cover with
`npm run covers`, and run `npm run games:check`.

For games from outside developers, the flow is the **developer dashboard**
(`/developers`): upload a build URL, and a moderator reviews it before it goes
live.

## Hard requirements

1. **No external network requests.** The game must run with the network off.
   No CDNs, no analytics, no fonts fetched at runtime. Everything inlined or in
   the game's own folder.
2. **No tracking or ads of your own.** Playnix runs its own rewarded ads at the
   platform level. A game shipping its own ad script is rejected.
3. **Mobile first.** The Mini App is used on phones, inside Telegram's webview.
   Design for a 360×640 viewport and scale up.
4. **Touch and pointer.** Event listeners must work for both; assume no keyboard
   on phones and no mouse on desktop.
5. **`devicePixelRatio`.** A canvas that ignores DPR looks blurry on every
   modern phone:

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr);
```

6. **Pause when hidden.** Listen for `visibilitychange` and stop your loop, or
   the game drains battery in the background.

## Canvas vs DOM

Both are used by the shipped games:

- **Canvas** — action, physics, particles. `requestAnimationFrame` loop, scaled
  by delta time so a slow phone does not run the game in slow motion.
- **DOM** — puzzles, quizzes, cards. Easier accessibility, free text layout.

There is no requirement to use either. `math-rush` is pure DOM;
`connect-four-duel` is canvas.

## Fonts and colours

Use the system font stack and the Playnix palette so games feel like one
product:

```css
--bg: #090B14;  --card: #171E30;  --text: #F8FAFC;  --muted: #A1AABD;
--orange: #FF7A18;  --cyan: #22D3EE;  --violet: #8B5CF6;
```

## Saving progress

Three options, in increasing order of ambition:

| Approach | Scope | Code |
| --- | --- | --- |
| `localStorage` | This device | 2 lines |
| Playnix cloud save | Every device the player uses | `playnix.save()` |
| Both (recommended) | Instant + durable | `playnix.saveLocalFirst()` |

See [`SDK.md`](SDK.md) for the full API.

## Adding a game to the repository

1. Create `public/games/<slug>/index.html`.
2. Add a `SeedGame` entry in `scripts/seed-data.ts`:

```ts
{
  slug: "my-game",
  title: "My Game",
  categorySlug: "puzzle",
  shortDescription: "One line for the card.",
  description: "A paragraph for the detail page.",
  developer: ORIGINALS_DEV,
  publisher: "Playnix",
  pricing: "free",
  featured: false,
  orientation: "any",
  controls: "Tap / swipe",
  languages: "en,ar,fr",
  releasedAt: "2026-11-08",
  coverUrl: "/covers/my-game.jpg",
  screenshots: ["/covers/my-game.jpg"],
  license: ORIGINALS_LICENSE,
  source: ORIGINALS_SOURCE,
}
```

3. Add a cover motif in `scripts/gen-covers.mjs` and run `npm run covers`.
4. `npm run games:check` — boots every game in jsdom and fails on any uncaught
   exception. A game that does not boot is a game that does not ship.
5. `npm run db:seed` to push the new entry into your local database.

## Cover art

Covers are generated, not photographed: `gen-covers.mjs` draws vector SVG and
rasterises it with sharp at 1312×816. Adding a motif means writing a few
`roundRect` / `<text>` calls — see the existing entries for the pattern. This
keeps every cover consistent and reproducible from the repository.

## Review checklist

A moderator tests each submitted game against this list before publishing:

- [ ] Loads with no console errors
- [ ] Playable with touch: no dead zones, no hover-only interactions
- [ ] The description matches the game
- [ ] No external requests, no trackers, no third-party ads
- [ ] Survives a screen rotation and a background/foreground cycle
- [ ] Cover image is representative

Feedback goes back to the developer as a reviewer note, and they can resubmit.

## Performance targets

| Metric | Target |
| --- | --- |
| First interaction | < 1 s on a mid-range phone |
| Frame budget | 16 ms (60 fps) |
| Total transfer | < 500 KB including the cover |
| Time to playable | < 2 s on 3G |

A single-file game under 100 KB gets there easily. Image assets are usually what
blows the budget — prefer drawing with canvas over shipping PNGs.

## Gotchas

- **`maximum-scale=1, user-scalable=no`** in the viewport meta prevents
  double-tap zoom fighting the game. Every bundled game sets it.
- **`-webkit-tap-highlight-color: transparent`** stops the grey flash on tap.
- **`touch-action: none`** on a canvas is required for drag gestures to work
  without the page scrolling.
- **Never** call `alert()` or `confirm()` — Telegram's webview blocks them.
- **Do not** open a new window without a user gesture; it is blocked.

## Getting help

Open an issue, or ask in the Telegram chat. If you are shipping through the
developer dashboard, the reviewer note is the fastest way to get specific
feedback on your build.
