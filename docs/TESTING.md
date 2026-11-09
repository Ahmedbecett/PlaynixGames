# Testing report

## Automated suite

```bash
npm run db:migrate && npm run db:seed
npm run dev            # terminal 1
npm run smoke          # terminal 2
```

Result in this environment: **38 / 38 checks passed** on **both engines** (`tsc --noEmit` clean, `next build` clean).

The suite is split so it can be pointed at a live deployment without writing to its database:

```bash
npm run smoke                      # everything, against http://127.0.0.1:3000 + local DB
SMOKE_DB_ONLY=1 npm run smoke      # schema / catalog / search / payments only
SMOKE_HTTP_ONLY=1 BASE_URL=https://your-domain npm run smoke   # read-only HTTP checks
```

### PostgreSQL run (production engine)

The production engine was executed for real, not assumed: PostgreSQL 18 (PGlite/WASM) served through a local socket and the app was pointed at it with `DATABASE_URL=postgres://…` + `DATABASE_POOL_MAX=1`.

| Phase | Result |
| --- | --- |
| `ensureSchema()` — full 22-table schema | created cleanly on PostgreSQL |
| `db:seed` — 16 categories, 16 games, 3 plans | 40 rows inserted |
| `npm run games:check` — boots all 16 games in jsdom | 16/16 clean (start, keys, buttons) |
| `npm run bot:check` — subscription funnel offline | photo welcome, 3 plan buttons, XTR invoice, text fallback |
| DB suite (`SMOKE_DB_ONLY=1`) | **20/20** |
| HTTP suite (`SMOKE_HTTP_ONLY=1`) | **18/18** |
| 13 admin pages + 3 admin APIs | all 200 |
| Admin write path (create → verify → delete game) | works |
| Favorites, review with aggregate recompute, play session | works |

Two queries were fixed as a result of this run (they only ever worked on SQLite):

- `getSimilarGames` used `? IS NULL` inside the WHERE clause — PostgreSQL cannot infer a type for a bare NULL parameter. The clause is now built in JS.
- Admin user search used `? IS NULL OR …` and case-sensitive `LIKE`; it now uses a conditional WHERE plus `LOWER()`.

Reproduce (no server needed):

```bash
npm i --no-save @electric-sql/pglite @electric-sql/pglite-socket
# start a PGlite socket server on 127.0.0.1:5433, then:
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres DATABASE_POOL_MAX=1 npm run db:seed
SMOKE_DB_ONLY=1 DATABASE_URL=… DATABASE_POOL_MAX=1 npm run smoke
```

`DATABASE_POOL_MAX` also caps connection concurrency in production (serverless limits, small Postgres plans).

### What is covered

| Group | Checks |
| --- | --- |
| Database & catalog | 22 tables exist; 16 games; unique slugs; every published game has a launch URL; premium titles exist (3 subscription games + Reversi Duel); 16 categories; active plans with Stars prices |
| Game verification | Every published HTML5 game passes the real launch checks (≥5 required) — 16/16 |
| Telegram auth | Valid `initData` accepted; tampered payload rejected; 48h-old payload rejected |
| Search | Partial name, description keyword, unknown query → 0 rows, category filter, premium filter |
| Stars fulfilment | Verified payment activates Premium, expiry stored, replay is idempotent, unknown payload refused |
| HTTP surface | Home 200 + renders real cards, security headers, `/api/games`, game details, player for a free game, **premium player redirects**, 404 for unknown slug, `/admin` not public, `/api/admin/dashboard` → 401, reviews → 401 when anonymous, cross-origin write → 403, all six game bundles served |

### SDK (`playnix-sdk`)

The SDK ships with two independent layers of verification, both runnable offline:

```bash
npm run sdk:build      # tsc ESM + CJS, then postbuild asserts dist/esm, dist/cjs and .d.ts
npm run sdk:test       # 21 contract tests against the built output (node:test)
npm run sdk:check      # live contract check; defaults to http://localhost:3000, or PLAYNIX_BASE=…
```

| Layer | What it proves | Result |
| --- | --- | --- |
| `ads:check` | Rewarded ads end to end: config parsing (bad zone disables ads), CSP host list, grant/reuse/cooldown/daily-cap/expiry, premium gate with and without a pass, and the browser wrapper against a synthetic Monetag global in jsdom (interstitial, popup fallback, timeout, in-app settings) | **30/30** |
| `bot:check` | The refactored bot over the SDK client: photo welcome, 3 plan buttons, XTR invoice, text fallback, **and** `setWebhook` (secret + allowed updates), `setChatMenuButton`, `setMyCommands` bodies | **5/5** |
| HTTP (live server) | `POST /api/telegram/webhook` → 401 without/with wrong secret, 200 with the right one, 400 on malformed JSON; `/api/auth/telegram` accepts a signed `initData` (200 + session cookie), `/api/users/me` returns the profile, a tampered payload is rejected with `invalid` | verified |
| `sdk:test` | `initData` HMAC (golden vector, tamper, expiry, wrong token), webhook secret rejection + `update_id` de-duplication + error policy, Bot API error surfacing, invoice payload shape (`XTR`), client query building, `PlaynixError` mapping (`premium_required`, `rate_limited` retryable), session-cookie capture, timeout vs network distinction, deep-link/`start_param` routing | **21/21** |
| `sdk:check` | The published client against a real server: health, 16 categories, 16 games, 4 premium titles, search, game detail, plan prices (`250/650/2000 XTR`), unauthenticated `me`/`createInvoice`/`startPlaySession` → `unauthorized`, unknown game → `not_found`, deep links | **16/16** |

The live check caught one real drift while being written (`playableUrl` returns the asset path, not the `/play/` route), which is exactly why it is kept in the repo.

Dual publishing was verified against real consumers, not assumed: two throwaway projects (`moduleResolution: nodenext`) importing `playnix-sdk` + `playnix-sdk/server` typecheck and run under both ESM (`import`) and CommonJS (`require`), against `dist/esm` and `dist/cjs` respectively.

### Not executed here (and why)

This build sandbox has outbound access only to GitHub/npm/PyPI, so `api.telegram.org` is unreachable:

- Live `getMe`, `setWebhook`, `createInvoiceLink`, `refundStarPayment`
- A real `successful_payment` delivery end-to-end (the fulfilment function itself is tested directly, including replay protection)

Both are wired and documented; complete these on a machine with internet access and a real bot (see `DEPLOYMENT.md` §5).

## Manual QA checklist (device matrix)

Run on a real Telegram client before launch:

| Case | Android | iOS | Desktop | Web |
| --- | --- | --- | --- | --- |
| Mini App opens from the menu button | ☐ | ☐ | ☐ | ☐ |
| Header safe-area not clipped (notch) | ☐ | ☐ | n/a | n/a |
| Search suggestions appear while typing | ☐ | ☐ | ☐ | ☐ |
| Infinite scroll loads page 2 | ☐ | ☐ | ☐ | ☐ |
| Favorite toggle survives app reopen | ☐ | ☐ | ☐ | ☐ |
| Rating + review published once (no duplicates) | ☐ | ☐ | ☐ | ☐ |
| Game launches, touch controls work | ☐ | ☐ | ☐ | ☐ |
| Pause when the app is backgrounded | ☐ | ☐ | ☐ | ☐ |
| Fullscreen + exit back to details | ☐ | ☐ | ☐ | ☐ |
| Landscape game shows rotate hint in portrait | ☐ | ☐ | n/a | n/a |
| Premium game blocked for free users | ☐ | ☐ | ☐ | ☐ |
| Stars purchase grants Premium after confirmation | ☐ | ☐ | ☐ | ☐ |
| Language switch to العربية flips layout to RTL | ☐ | ☐ | ☐ | ☐ |
| Account deletion clears favorites/history | ☐ | ☐ | ☐ | ☐ |

## Browser verification performed here

- `npm run build` (production bundle) — passes, no type errors.
- Route smoke: `/`, `/search?q=…`, `/game/<slug>`, `/categories`, `/category/<slug>`, `/play/<slug>`, `/favorites`, `/premium`, `/profile`, `/notifications`, `/admin*` all render (200) with real data.
- i18n: `lang/dir` switch to `ar`/`rtl` and `fr`/`ltr` verified in the served HTML.
- Admin write path: create game → verification → appears in search → delete, all verified over HTTP with a real session.
- Games: every `index.html` executes its script without syntax errors (`new Function` parse check) and is served at its launch URL.

## Regression protection

- `npm run verify:games` fails the build if fewer than five games pass verification or any launch URL breaks.
- `npm run smoke` exits non-zero on any failed check — wire it into CI before deploys.
- `npm run typecheck` catches missing translation keys (dictionaries are type-checked against English).
