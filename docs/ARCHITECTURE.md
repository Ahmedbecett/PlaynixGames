# Architecture

## Layers

```
Telegram client (Android / iOS / Desktop / Web)
        │  initData (signed by Telegram)
        ▼
Next.js 15 App Router
  ├── Server Components  → read the DB directly, render HTML
  ├── Route Handlers     → /api/* REST surface (JSON only)
  └── Client Components  → interactions, optimistic UI, Telegram SDK
        │
        ▼
Data layer (src/lib/db.ts)  ──► PostgreSQL (production) | SQLite (local)
        │
        └── Telegram Bot API (messages, invoices, webhook)
```

No separate backend service: server components and route handlers share one deployment and one data layer. Business rules (premium access, payment fulfilment, moderation) live in `src/lib/*` and are only ever executed server-side.

## Request flows

**Authentication**
1. Mini App opens → `telegram-web-app.js` exposes `Telegram.WebApp.initData`.
2. `TelegramBridge` POSTs it to `/api/auth/telegram`.
3. Server recomputes `HMAC_SHA256(HMAC_SHA256("WebAppData", bot_token), data_check_string)`, compares with `hash` in constant time, rejects payloads older than 24h.
4. User row is upserted (role from `ADMIN_TELEGRAM_IDS`), a signed HttpOnly cookie (`playnix_session`) is issued: `base64url(payload).hmac_sha256(SESSION_SECRET)`.

**Search**
`/search` renders a server-provided first page, then `SearchExperience` calls `/api/games/search` with debounce + `IntersectionObserver` pagination. Relevance is a weighted `LIKE` score over a denormalised `games.search_text` (title, descriptions, developer, publisher, category, tags). Unknown queries return zero rows — the UI offers "suggest a game" instead of inventing results.

**Play**
1. `/play/[slug]` is a server component: it checks the game is published, `game_type='html5'`, the URL is same-origin or https, and that premium memberships are active. Failures redirect to `/premium`.
2. `GamePlayer` POSTs `/api/games/:id/play` → creates a `play_history` row and increments `play_count`.
3. Exiting posts duration to `/api/play-sessions/:id/end` (with `keepalive` on `pagehide`).
4. The iframe is sandboxed (`allow-scripts allow-same-origin`) and receives `playnix:pause` / `playnix:resume` messages.

**Telegram Stars**
1. `/api/payments/create-invoice` validates the plan, writes a `payments` row with a unique `planId:userId:nonce` payload (≤128 bytes), and asks Telegram for an invoice link.
2. Telegram sends `pre_checkout_query` → answered server-side.
3. Telegram sends `message.successful_payment` to `/api/telegram/webhook` (header `X-Telegram-Bot-Api-Secret-Token`).
4. `fulfilStarsPayment` verifies amount/currency, extends the subscription transactionally, marks the payment `paid`. Replays are detected by payload and return `alreadyProcessed`.
5. The client only *polls* `/api/payments/verify` (read-only). It can never grant Premium.

## Data model (22 tables)

`users` · `categories` · `games` · `game_images` · `favorites` · `play_history` · `reviews` · `plans` · `subscriptions` · `payments` · `game_reports` · `admin_logs` · `banners` · `announcements` · `notifications` · `user_notification_reads` · `ad_placements` · `ad_campaigns` · `search_queries` · `game_suggestions` · `app_settings` · `telegram_updates`

Portability rules (see `db/schema.sql`):
- ids are `TEXT` UUIDs generated in the app, so no `SERIAL`/`AUTOINCREMENT` split
- timestamps are `TEXT` ISO-8601 UTC — lexicographic comparisons work on both engines
- booleans are `INTEGER` 0/1
- `ON CONFLICT (...) DO NOTHING/UPDATE` is used everywhere instead of engine-specific upserts
- `transaction()` abstracts `BEGIN IMMEDIATE` (SQLite) and pooled clients (PostgreSQL)

Indexes cover the hot paths: publication status, category, pricing, popularity, `published_at`, user favourites/history, review aggregates, and admin log time.

Denormalised-but-derived fields (`rating_avg`, `rating_count`, `play_count`, `search_text`) are recomputed inside the same request that changes their source — never scheduled sweeps that could drift.

## Caching & performance

- Catalog reads are small indexed queries; server components avoid waterfalls with `Promise.all`.
- All API responses are `Cache-Control: no-store` (per-user data and freshness).
- Public game bundles are static files under `public/`, served from the CDN edge.
- Images are lazy-loaded; uploads are re-encoded to WebP (max 1600px) by sharp.
- A Next.js `<Suspense>`-style skeleton (`loading.tsx`) keeps navigation feeling instant.

## Extending

- **New game source**: add a row in `games` (or use the dashboard). Optional provider integrations belong in `src/lib/` behind the same `searchGames` shape.
- **New locale**: add a dictionary to `src/lib/i18n/dictionary.ts`; TypeScript fails the build until every key is translated.
- **Postgres-specific search**: swap the `LIKE` relevance block in `searchGames` for `tsvector`/`pg_trgm` — the function signature stays identical.
