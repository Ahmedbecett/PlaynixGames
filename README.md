# Playnix

**Search → Discover → View → Play.** A Telegram Mini App that is a gaming search engine plus an instant-play arcade, with a real Telegram bot and a real admin dashboard behind it.

Built as an independent product: own brand, own database, own code. Nothing is reused from other projects.

---

## What is actually working

| Area | Status | Notes |
| --- | --- | --- |
| Home, search, categories, game details | ✅ | Server-rendered, real DB queries, no mock data |
| Instant play (HTML5) | ✅ | 16 self-hosted Playnix Originals (7 free additions + 3 subscription titles in the latest drop), iframe player with pause/fullscreen/error handling |
| Search engine | ✅ | Partial name, keywords, developer, category, tags; filters, sort, infinite scroll, recent + popular searches, suggest-a-game |
| Telegram auth | ✅ | `initData` HMAC validation server-side, signed HttpOnly session, tested positive/negative |
| Favorites, play history, ratings/reviews, reports | ✅ | Persisted per user, unique rating per account, server recomputes aggregates |
| Premium gating | ✅ | Enforced in the player route and the play API, never in the client only |
| Rewarded ads (Monetag) | ✅ off by default | Watch one ad → play one premium game for 20 min (3/day, server-issued pass). Config, policy and the browser wrapper are covered by `npm run ads:check`; no live ad was served in this sandbox |
| Telegram Stars | ⚠️ implemented, needs a live bot | Invoice creation via Bot API, server-side fulfilment on `successful_payment`, idempotent replay protection, refund revocation. **Not executed against Telegram in this environment** (no outbound access to `api.telegram.org` here) |
| Admin dashboard | ✅ | Real aggregates, game CRUD + URL verification, users, reviews, reports, ads, plans, announcements, logs, system health |
| Bot commands | ✅ | `/start /subscribe /premium /popular /new /language /help` + broadcasts; `/start` sends a branded photo with a one-tap Stars subscribe button (21 offline contract tests) |
| i18n (ar / en / fr) + RTL | ✅ | Every UI string from typed dictionaries; Arabic flips to RTL |
| Security | ✅ | CSP, HMAC sessions, admin roles, rate limits, SSRF-guarded URL checks, audit log, input validation |

Legend: ✅ verified locally · ⚠️ implemented, blocked on live credentials/network.

---

## Quick start

```bash
cp .env.example .env.local     # fill in the values you have
npm install
npm run db:migrate             # creates the schema (SQLite locally)
npm run db:seed                # 16 categories, 16 games, 3 premium plans
npm run dev                    # http://localhost:3000
```

Outside Telegram you can browse in **preview mode** (`ALLOW_DEV_LOGIN=true`, development only): the banner on the home page signs you in as a local admin so the dashboard is explorable. This account is clearly labelled and refuses to exist in production.

Production:

```bash
# DATABASE_URL=postgres://…  (required on Vercel / any read-only filesystem)
npm run db:migrate && npm run db:seed
npm run build && npm start
npm run bot:webhook            # registers https://<APP_URL>/api/telegram/webhook
```

Arabic walkthrough: [`docs/SETUP_AR.md`](docs/SETUP_AR.md). Full steps in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md); bot wiring (BotFather, webhook, menu button, deep links, tunnel) in [`docs/BOT_SETUP.md`](docs/BOT_SETUP.md). Search-engine setup (Google verification, `robots.txt`, `sitemap.xml`, rich results) in [`docs/SEO_AR.md`](docs/SEO_AR.md).

---

## Stack

- **Next.js 15** (App Router, React 19, TypeScript strict) — UI + API in one deployable
- **PostgreSQL** in production, **SQLite** (`node:sqlite`, zero native deps) for local dev — one portable schema for both
- **Tailwind CSS v4** with the Playnix design tokens
- **Telegram**: Bot API, Mini App SDK, `initData` signature validation, Stars invoices
- **sharp** for server-side image re-encoding of admin uploads

Why one schema for two engines: TEXT/INTEGER/REAL columns, ISO-8601 timestamps, `?` placeholders translated to `$n` for PostgreSQL. See `src/lib/db.ts`.

---

## Project layout

```
db/schema.sql              portable schema (22 tables)
public/games/<slug>/       the six playable HTML5 games (self-hosted)
public/brand/              logo SVG + rendered PNGs (bot avatar, icons)
src/app/(main)/            Mini App pages (home, search, game, player outside this group)
src/app/admin/             admin dashboard pages
src/app/api/               REST endpoints (games, users, payments, admin, telegram webhook)
src/lib/                   db, auth, telegram, payments, bot, i18n, validation, storage, verify-game
scripts/                   migrate, seed, reset, webhook, polling, smoke tests, game verification
docs/                      architecture, API, deployment, admin guide, testing, licensing, security, SEO
```

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply schema (idempotent) |
| `npm run db:seed` | Seed catalog (never overwrites admin edits) |
| `npm run db:reset -- --yes` | Dev-only destructive reset |
| `npm run verify:games` | Re-run launch checks on every published game |
| `npm run smoke` | 38 acceptance checks (DB, auth, search, payments, HTTP, security) |
| `npm run bot:webhook` | Register the webhook + menu button |
| `npm run bot:poll` | Long-polling bot for local development |

---

## The bundled games

All sixteen are **Playnix Originals** — original code and generated art owned by this project, so there is no third-party licensing risk in shipping them. Each one is a real game with touch + keyboard input, pause handling and local high scores.

Free: `Neon Serpent` · `Void Breaker` · `Astro Dodge` · `Block Cascade` · `Memory Matrix` ·
`Tetra Stack` · `Tile Merge` · `Flap Quest` · `Maze Escape` · `Penalty Shot` · `Speed Runner` · `Sudoku Grid`

Subscription: `Tower Guard` · `Dungeon Depths` · `Card Blitz` · `Reversi Duel`

Licensing policy for adding third-party games: [`docs/GAME_SOURCES.md`](docs/GAME_SOURCES.md). **Publicly accessible ≠ free to redistribute** — nothing is published without a verified licence recorded in the `games.license` column.

---

## Rewarded ads

Free users who hit a premium game get a second path besides subscribing: watch one short
Monetag ad and play **that** game for a few minutes. The pass is issued server-side
(`ad_reward_passes`), capped per day, and checked by both the player route and the play API —
the browser only reports that the ad promise resolved.

```bash
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_ADS_ZONE_ID=12207042
npm run ads:check      # 30 offline checks (config, policy, jsdom SDK behaviour)
```

Full setup, formats (rewarded interstitial, rewarded popup, in-app interstitial), CSP notes and
the honest anti-abuse limits: [`docs/ADS.md`](docs/ADS.md).

## SDK

`playnix-sdk` (in [`sdk/`](./sdk)) is a standalone, dependency-free TypeScript package for anyone
building on top of this deployment — including its own bot.

```bash
npm run sdk:build      # ESM + CJS + .d.ts into sdk/dist
npm run sdk:test       # 21 contract tests, run against the built package
```

```ts
// browser / mini app
import { initMiniApp, haptic, resolveStartParam, startParam } from "playnix-sdk";

// server / bot
import { TelegramBot, createWebhookHandler, parseStarsPayment, validateInitData } from "playnix-sdk/server";
import { PlaynixClient } from "playnix-sdk";

const playnix = new PlaynixClient({ baseUrl: "https://playnix-ashen.vercel.app" });
await playnix.signIn(initData);                        // validates + stores the session cookie
const { premium, subscription } = await playnix.me();
```

The app itself consumes it: `src/lib/telegram.ts` is a thin adapter over `playnix-sdk/server` (config + error
mapping only), the webhook uses the SDK's constant-time secret check, and `/api/auth/telegram` uses the SDK's
`initData` validation — the bot that runs in production and the published package share one implementation.
`sdk:build` runs inside `prebuild`, so a fresh clone (and Vercel) builds the package before typechecking.

Full reference (Arabic) and examples: [`sdk/README.md`](./sdk/README.md), [`sdk/examples`](./sdk/examples).

---

## Search engines

`/robots.txt` and `/sitemap.xml` are generated from the database, every public page carries a canonical URL, `hreflang` alternates (ar/en/fr), Open Graph tags and schema.org JSON-LD (`VideoGame`, `BreadcrumbList`, `ItemList`), and account pages are `noindex`. Set `NEXT_PUBLIC_APP_URL` before building so canonical URLs point at the production domain. Rebuild the share card with `npm run og:image`. Full guide: [`docs/SEO_AR.md`](docs/SEO_AR.md).

---

## Secrets

Never commit real credentials. `.env.local` is gitignored; only `.env.example` ships.

> If a bot token was ever pasted into a chat, a ticket, or a screenshot, treat it as compromised and revoke it with `/revoke` in **@BotFather**, then set the new token in your host's environment variables.

---

## License

Application code © Playnix. The sixteen games in `public/games/` are original works by this project and may not be redistributed separately without permission. Third-party dependencies keep their own licenses (see `package.json`).
