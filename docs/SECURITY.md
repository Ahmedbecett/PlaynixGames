# Security

## Authentication

- **Telegram `initData` is never trusted raw.** The server recomputes
  `secretKey = HMAC_SHA256("WebAppData", bot_token)` and
  `hash = HMAC_SHA256(secretKey, data_check_string)` and compares in constant time.
- `auth_date` older than 24 hours is rejected (replay window).
- Sessions are stateless signed cookies: `base64url(payload).HMAC_SHA256(SESSION_SECRET)`, `HttpOnly`, `SameSite=Lax`, `Secure` in production, 30-day expiry. The role inside the token is re-checked against the database on every request.
- Admin roles come only from `ADMIN_TELEGRAM_IDS` (or a role already stored for that user). There is no admin signup and no password login.
- Development preview login is hard-disabled when `NODE_ENV=production` **and** requires `ALLOW_DEV_LOGIN=true`.

## Authorization

Every admin route handler calls `requireAdmin()` (session + role + active status) before touching data. `/admin/*` pages render a gate instead of the shell for non-admins. Premium access is checked in both `/play/[slug]` and `/api/games/:id/play` — a client can never unlock content.

## Input & output

- All request bodies validated with **zod** schemas (`src/lib/validation.ts`); unknown types are rejected before reaching SQL.
- Queries use parameter binding only. `?` placeholders are translated to `$n` for PostgreSQL by a tokenizer that ignores quoted literals — no string interpolation of user input.
- React escapes rendered text; no `dangerouslySetInnerHTML` anywhere. Bot messages escape by construction (only catalog fields derived from validated admin input are interpolated into HTML).
- URL fields accept absolute http(s) URLs or same-origin paths, with `..` traversal rejected.

## SSRF & embedding safety

`verifyGameUrl()` refuses non-https targets, blocks private/loopback/link-local hosts, times out at 12s, follows redirects only to https, and reports `X-Frame-Options: DENY` / `frame-ancestors 'none'` so an un-embeddable game is never published as instant-play. The player additionally only accepts same-origin paths or `https://` URLs.

## Transport & headers

Set in `next.config.ts` for every route:

- `Content-Security-Policy` with `frame-ancestors` limited to Telegram web clients, `script-src 'self' 'unsafe-inline' https://telegram.org` (no `unsafe-eval` in production), `object-src` implicitly none
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, restrictive `Permissions-Policy`
- `poweredByHeader: false`

## Abuse & rate limits

| Surface | Limit |
| --- | --- |
| `/api/auth/telegram` | 30 / min / IP |
| Search logging | 40 / min / IP |
| Game launches | 30 / min / user+IP |
| Reviews | 10 / hour / user |
| Reports | 10 / hour / user |
| Suggestions | 5 / hour / IP |
| Invoice creation | 8 / 10 min / user |
| Admin uploads | 30 / hour / admin |

The limiter is in-memory (single instance). For multi-instance deployments swap `src/lib/rate-limit.ts` for Redis/Upstash behind the same `consume()` interface.

## Payments

Premium is granted **only** by `fulfilStarsPayment()` on a webhook `successful_payment`, after checking currency `XTR`, amount ≥ plan price, and payload ownership. Replays are ignored. The client can only *read* `/api/payments/verify`. Refunds call Telegram first and revoke only on success. `pre_checkout_query` is answered server-side.

## Webhook authenticity

`POST /api/telegram/webhook` requires the `X-Telegram-Bot-Api-Secret-Token` header to equal `TELEGRAM_WEBHOOK_SECRET`; mismatch → 401. `update_id` is persisted so a retried update cannot double-grant anything.

## Uploads

Allowed types: JPEG/PNG/WebP/AVIF/GIF, max 5 MB. Every image is decoded and re-encoded to WebP with **sharp** (strips EXIF and defeats polyglot files); unreadable files are rejected. Production uses S3-compatible storage with a signed request; local disk is development-only.

## Audit & privacy

`admin_logs` records actor, action, entity, metadata and IP for every admin mutation, shown in Admin → Activity log. Users can delete their account: favorites, history, reviews, reports and notification reads are removed, payment records are retained (accounting obligation) but detached, and the Telegram identity is tombstoned so the user can start fresh.

## Secrets

Only `.env.example` is committed. `.env.local`, `data/` and `public/uploads/` are gitignored. Secrets are read exclusively on the server (`src/lib/env.ts` is never imported by client components; the build fails if that changes).

> **Token hygiene:** any bot token shared in a chat or screenshot must be revoked with `/revoke` in @BotFather and replaced in your host's environment. A leaked token lets anyone impersonate your bot and read updates.

## Incident response

1. Revoke the bot token in BotFather; update `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`; re-register the webhook (Admin → System).
2. Rotate `SESSION_SECRET` (invalidates all sessions) and, if needed, `ADMIN_TELEGRAM_IDS`.
3. Suspend abusive accounts; disable affected games (`publication_status = 'disabled'`).
4. Review Admin → Activity log and `payments` for anomalies.
5. Restore from the most recent verified backup if data integrity is in question.
