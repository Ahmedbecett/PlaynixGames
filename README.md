<div align="center">

# Playnix

**An open-source Telegram Mini App game platform.**

Search → discover → play instantly. Bot, web app, admin dashboard,
developer portal and game SDK — one deployable.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Quick start](#quick-start) · [Architecture](#architecture) · [Game SDK](#game-sdk) · [Developer portal](#developer-portal) · [Contributing](#contributing)

</div>

---

## What this is

Playnix is a complete platform for HTML5 games inside Telegram:

- **A storefront** — search, categories, ratings, favourites, play history.
- **An instant-play player** — games run in an iframe, no downloads, no APKs.
- **A Telegram bot** — `/start`, catalogue browsing, deep links into specific
  games, and Stars subscriptions.
- **An admin dashboard** — catalog CRUD, users, reviews, reports, ads,
  announcements, audit log.
- **A developer portal** — outside studios apply, upload builds, and track a
  review queue.
- **A game SDK** — leaderboards, achievements and cloud saves in three lines.
- **i18n** — English, Arabic, French complete; Spanish and Russian in progress.

Everything is real: a real database, real authentication via Telegram `initData`,
real server-side premium enforcement. There is no mock data layer.

## Screens in thirty seconds

| Area | Path |
| --- | --- |
| Storefront | `/` `/categories` `/category/<slug>` `/search` |
| Game detail | `/game/<slug>` |
| Player | `/play/<slug>` |
| Premium | `/premium` |
| Developer portal | `/developers` |
| Admin | `/admin` |
| Bot webhook | `/api/telegram/webhook` |
| SDK | `/api/sdk/<slug>/*` |

---

## Quick start

Requires **Node.js 22.5+** (the local database uses `node:sqlite`).

```bash
git clone https://github.com/Ahmedbecett/PlaynixGames.git
cd PlaynixGames
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3000
```

No Postgres, no Docker, no bot token needed to browse the site. Set
`ALLOW_DEV_LOGIN=true` in `.env.local` to sign in as a local admin and explore
the dashboard — that path is hard-disabled when `NODE_ENV=production`.

### Production

```bash
DATABASE_URL=postgres://…     # required on Vercel (read-only filesystem)
npm run db:migrate && npm run db:seed
npm run build && npm start
npm run bot:webhook           # registers https://<APP_URL>/api/telegram/webhook
```

Full walkthroughs: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) ·
[`docs/BOT_SETUP.md`](docs/BOT_SETUP.md) · [`docs/SETUP_AR.md`](docs/SETUP_AR.md) (Arabic)

---

## Architecture

```
db/schema.sql              portable schema — 31 tables, one dialect for Postgres + SQLite
public/games/<slug>/       self-hosted HTML5 games (single-file each)
public/sdk/playnix-sdk.js  browser SDK used by every game
public/covers/             generated cover art (SVG → JPEG, reproducible)
src/app/(main)/            storefront pages
src/app/admin/             admin dashboard
src/app/developers/        developer portal
src/app/play/[slug]/       iframe player shell
src/app/api/               REST endpoints
src/lib/                   db, auth, telegram, payments, bot, i18n, progression, developers
sdk/                       `playnix-sdk` npm package (typed client + bot helpers)
scripts/                   migrate, seed, covers, checks, smoke tests
docs/                      architecture, API, deployment, SDK, game dev, security, SEO
```

### One schema, two engines

Production runs PostgreSQL; local development runs SQLite through
`node:sqlite` with zero native dependencies. The same `db/schema.sql` applies to
both, which is enforced by three conventions:

- `TEXT` ids (UUIDs), ISO-8601 `TEXT` timestamps, `INTEGER` 0/1 booleans
- `?` placeholders, translated to `$1..$n` for Postgres
- `CREATE TABLE IF NOT EXISTS` everywhere, plus idempotent `ALTER`s for columns
  added later (`src/lib/db.ts`)

This means `git clone && npm install && npm run dev` works with no database
server, and migrations are the same file in both environments.

### Server-side authority

Nothing that matters is trusted from the browser:

| Concern | Where it is enforced |
| --- | --- |
| Premium access | `/play/[slug]` route **and** `/api/games/[id]/play` |
| Scores | `/api/sdk/:slug/scores`, personal best computed in SQL |
| Achievements | Must be declared by the game before it can be unlocked |
| Saves | Private per player, optimistic concurrency via `revision` |
| Publishing | Only `POST /api/admin/review/:id` can set `published` |

---

## Game SDK

Games get leaderboards, achievements and cloud saves with one script tag.

```html
<script src="/sdk/playnix-sdk.js"></script>
<script>
  const playnix = Playnix.create({ game: "my-game" });

  playnix.score(1250);                          // leaderboard, best-score only
  playnix.unlock("first-win");                  // achievement
  playnix.saveLocalFirst({ level: 4 });         // offline-first cloud save
</script>
```

- No dependencies, ~4 KB, every call fails soft so a bad network cannot freeze
  a session.
- The player is identified by the platform's HttpOnly cookie — the game never
  holds a token.
- Full reference: [`docs/SDK.md`](docs/SDK.md)

The API is also usable directly (see the HTTP table in that document), so a
Unity export or a server-side job can report scores the same way.

---

## Developer portal

Outside developers publish without a maintainer touching the database:

```
/developers  →  apply  →  moderator approves  →  submit a game
             →  review queue  →  published or sent back with a note
```

Rules baked into the code:

- A submission always enters `pending`. A developer cannot publish their own game.
- Approval writes a `game_reviews` audit row with the reviewer's id.
- Any edit after approval sends the game back through review.
- Reviewers can request changes with a note the developer sees in their dashboard
  and as a Telegram notification.

Admin side: `/admin/developers`.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + design tokens |
| Database | PostgreSQL (prod) / SQLite via `node:sqlite` (dev) |
| Auth | Telegram `initData` HMAC validation, signed HttpOnly session |
| Payments | Telegram Stars invoices, server-side fulfilment |
| Images | `sharp` — server-side re-encode of every upload |
| Tests | Node test runner (SDK), jsdom (games), HTTP smoke suite |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run typecheck` | `tsc --noEmit` (builds the SDK first) |
| `npm run db:migrate` | Apply schema (idempotent) |
| `npm run db:seed` | Seed the catalog (never overwrites admin edits) |
| `npm run covers` | Regenerate cover art |
| `npm run games:check` | Boot every bundled game in jsdom |
| `npm run i18n:coverage` | Translation coverage per locale |
| `npm run sdk:build` / `sdk:test` | Build and test the SDK package |
| `npm run ads:check` | 30 offline rewarded-ad checks |
| `npm run smoke` | 38 acceptance checks (DB, auth, search, payments, HTTP, security) |
| `npm run bot:webhook` / `bot:poll` | Register the webhook / long-poll locally |

---

## The bundled games

Twenty **Playnix Originals** — original code, generated cover art, no
third-party licensing risk. Every category ships at least one playable title.

`Neon Serpent` · `Void Breaker` · `Astro Dodge` · `Block Cascade` ·
`Memory Matrix` · `Tetra Stack` · `Tile Merge` · `Flap Quest` · `Maze Escape` ·
`Penalty Shot` · `Speed Runner` · `Sudoku Grid` · `Tower Guard` ·
`Dungeon Depths` · `Card Blitz` · `Reversi Duel` · `Skyline Builder` ·
`Turret Line` · `Math Rush` · `Connect Four Duel`

Adding your own: [`docs/GAME_DEVELOPMENT.md`](docs/GAME_DEVELOPMENT.md).

---

## Internationalisation

Every UI string lives in `src/lib/i18n/dictionary.ts`. English is the source of
truth and is complete; other locales may be partial and fall back to English at
runtime, so a half-finished translation never shows a raw key.

| Locale | Coverage |
| --- | --- |
| English | 100% |
| Arabic (RTL) | 100% |
| French | 100% |
| Spanish | in progress |
| Russian | in progress |

```bash
npm run i18n:coverage          # table of every locale
npm run i18n:coverage -- --missing ru   # print the exact keys to translate
```

Translations are a genuinely useful first contribution — see
[`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Contributing

Contributions are welcome: a game, a translation, a bug fix, a docs improvement.

```bash
npm run typecheck && npm run build && npm run games:check && npm run sdk:test
```

All four must pass before a pull request is reviewed.

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — process, ground rules, commit style
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — architecture tour and code conventions
- [`docs/GAME_DEVELOPMENT.md`](docs/GAME_DEVELOPMENT.md) — build a game

### Ground rules

1. No placeholder content — no fake ratings, no invented studios.
2. No new runtime dependencies without an issue first.
3. Every user-facing string goes through the dictionary.
4. Anything involving money, access or scores is validated on the server.

---

## Security

- CSP, HMAC-signed sessions, SameSite cookies, per-route rate limits
- SSRF-guarded URL verification before a game can go live
- Server-side image re-encoding (strips EXIF, blocks polyglot files)
- Admin actions written to an audit log
- Secrets only ever in environment variables — `.env.local` is gitignored

Found a vulnerability? Please report it privately rather than in a public issue.

---

## License

**MIT** — see [`LICENSE`](LICENSE). Use it, fork it, ship your own platform.

The games in `public/games/` are original works by this project, also MIT.
Third-party dependencies keep their own licenses.
