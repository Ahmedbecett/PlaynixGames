# REST API

All responses are JSON. Authenticated endpoints read the `playnix_session` HttpOnly cookie set by `/api/auth/telegram`.
Mutating endpoints additionally enforce same-origin (`Origin` must match `Host`) and per-user/IP rate limits.

Errors are uniform:

```json
{ "error": { "message": "Human readable", "code": "machine_code", "details": {} } }
```

---

## Public

### `GET /api/games`
Query: `q`, `category`, `pricing` (`free|premium`), `sort` (`relevance|popular|newest|rating`), `limit` (≤60), `offset`.

### `GET /api/games/search`
Same filters plus `suggest=1` (skips logging/popular lookups). Returns `{ games, total, query, popular, suggestions }`. Deliberate searches are logged to `search_queries` for the "popular searches" feature (40/min per IP).

### `GET /api/games/:idOrSlug`
Published game only: card fields, long description, licence/source, orientation, screenshots, similar games.

### `GET /api/categories`
Active categories with published game counts.

### `GET /api/premium/plans`
Localised plan names, Stars prices, durations, feature keys.

### `POST /api/games/suggestions`
`{ title, url?, note? }` — "game not found" submissions. Anonymous allowed, 5/hour per IP.

---

## Authenticated (user)

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/auth/telegram` | POST | `{ initData }` → validates signature, upserts user, sets session |
| `/api/auth/dev` | POST | **development only**, 404 in production (`ALLOW_DEV_LOGIN=true`) |
| `/api/auth/logout` | POST | Clears session |
| `/api/auth/session` | GET | `{ user, premium, subscription }` |
| `/api/users/me` | GET / PATCH / DELETE | PATCH `{ language }`; DELETE = data deletion + tombstone |
| `/api/users/favorites` | GET / POST | POST `{ gameId }` |
| `/api/users/favorites/:gameId` | DELETE | |
| `/api/games/:id/play` | POST | Premium + playability enforced; returns `{ sessionId }` |
| `/api/play-sessions/:id/end` | POST | `{ durationMs }`, capped at 12h |
| `/api/games/:id/reviews` | GET / POST | POST `{ rating 1-5, reviewText? }`, one review per user per game |
| `/api/games/:id/report` | POST | `{ reason, details? }`, 10/hour per user |
| `/api/payments/create-invoice` | POST | `{ planId }` → `{ invoiceLink }`; 8 attempts / 10 min |
| `/api/payments/verify` | GET | Read-only premium state (never grants) |
| `/api/notifications/read` | POST | Marks notifications read |
| `/api/locale` | POST | `{ locale: en\|ar\|fr }` sets cookie + user preference |

## Admin (role `admin` required server-side)

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/admin/dashboard` | GET | Live aggregates, top games, health, config status |
| `/api/admin/games` | GET / POST | List with `q`/`status`; create (publishing runs URL verification) |
| `/api/admin/games/:id` | PUT / DELETE | Update / delete |
| `/api/admin/games/:id/verify` | POST | Reachability, https, embeddability checks; stamps `verified_at` |
| `/api/admin/upload` | POST | `multipart/form-data` field `file`; re-encoded to WebP |
| `/api/admin/categories` `/api/admin/categories/:id` | GET/POST/PUT/DELETE | |
| `/api/admin/users/:id` | PATCH | `{ status: active\|suspended, reason? }` |
| `/api/admin/reviews/:id` | PATCH | `{ status: published\|hidden\|pending }` + aggregate recompute |
| `/api/admin/reports/:id` | PATCH | `{ status: open\|resolved\|dismissed }` |
| `/api/admin/ads` | PUT | Placement toggle + creative |
| `/api/admin/ads/campaigns` | POST / PATCH | Sponsored campaign lifecycle |
| `/api/admin/plans` | GET/POST/PUT | Plan creation and activation |
| `/api/admin/announcements` | POST | In-app notification + optional bot broadcast |
| `/api/admin/payments/:id/refund` | POST | Telegram `refundStarPayment` + entitlement revocation |
| `/api/admin/bot` | GET / POST | Webhook info / `{ action: "set_webhook" }` |

## Webhook

`POST /api/telegram/webhook` — requires `X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET`.
Handles: commands, callback queries (language switch), `pre_checkout_query`, `message.successful_payment`.
`update_id` is stored in `telegram_updates` so retries never double-process.

## Health

`GET /api/health` → `{ ok, dialect, checks }` (database reachability + configured integrations).
