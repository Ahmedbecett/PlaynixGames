# Deployment

Target setup: **Vercel (Next.js) + PostgreSQL (Neon/Supabase/RDS) + a Telegram bot you own.**

## 0. Prerequisites you control

- GitHub repository (this project)
- Vercel account and project
- PostgreSQL database (any managed provider)
- Telegram bot created with **@BotFather** (you own it)
- A domain (or the free `*.vercel.app` domain)

## 1. Environment variables

Copy `.env.example` and fill in. Required in production:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public https URL of the Mini App (no trailing slash) |
| `TELEGRAM_BOT_TOKEN` | Bot API auth + `initData` signature validation |
| `TELEGRAM_WEBHOOK_SECRET` | Rejects forged webhook calls |
| `SESSION_SECRET` | Signs session cookies (32+ random chars) |
| `DATABASE_URL` | `postgres://…?sslmode=require` (SQLite is dev-only) |
| `ADMIN_TELEGRAM_IDS` | Comma-separated Telegram IDs that receive the admin role |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Optional: `S3_*` (object storage for uploads), `S3_REGION`.
Never set `ALLOW_DEV_LOGIN=true` in production — the preview login is compiled out anyway, but keep it off.

## 2. Database

```bash
# locally, against the production database
DATABASE_URL="postgres://…?sslmode=require" npm run db:migrate
DATABASE_URL="postgres://…?sslmode=require" npm run db:seed
```

Deploys do this automatically: `prebuild` runs `scripts/ensure-db.ts`, which applies the idempotent schema and seeds the catalog the first time the `games` table is empty. Run the commands manually only when you want to pre-seed outside a deploy.

`db:migrate` is idempotent (`CREATE TABLE IF NOT EXISTS`), so it is safe to run on every deploy.
`db:seed` inserts categories, the sixteen games and the three plans, and never overwrites rows an admin has edited (`created_by IS NOT NULL`). The deploy bootstrap (`scripts/ensure-db.ts`) runs the same insert-only seed on every build, so newly bundled games appear in production without a manual migration.

## 3. Deploy

```bash
vercel link
vercel env add DATABASE_URL production   # repeat for each secret
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard; the defaults work (`npm run build`).

Notes:
- SQLite cannot be used on Vercel (read-only filesystem) — the code throws a clear error if `DATABASE_URL` is missing there.
- Local disk uploads also need `S3_*` in production; without it, admins should paste image URLs instead.

## 4. Telegram bot + Mini App

1. **@BotFather** → `/newbot` → keep the token secret.
2. `/setcommands`:
   ```
   start - Open Playnix
   games - Browse games
   search - Search games
   popular - Popular games
   new - Recently added
   premium - Premium membership
   profile - Your profile
   help - Help and support
   language - Change language
   ```
3. `/setuserpic` → upload `public/brand/icon-512.png` (rendered from the SVG with `npm run logo:png`).
4. `/setmenubutton` → set the button URL to `https://YOUR_DOMAIN` (this makes the Mini App one tap away).
5. **Configure the Mini App URL** in BotFather (`/mybots` → Bot → Bot Settings → Menu Button / Configure Mini App) or from the dashboard:
   admin → System → **Register webhook** (also sets the chat menu button to the Mini App).
6. Verify:
   ```bash
   curl -s "https://YOUR_DOMAIN/api/health" | jq
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
   ```
   `last_error_message` must be empty. Then send `/start` to the bot.

## 5. Telegram Stars

- Stars invoices require a bot token and a client that supports payments (Telegram 7.x+).
- Prices live in the `plans` table (`price` in Stars, currency `XTR`); edit them in admin → Plans.
- The only place Premium is granted is `fulfilStarsPayment()` on the `successful_payment` webhook.
- Refunds: admin → payment → refund calls `refundStarPayment` and cancels the subscription.

Test checklist for Stars (requires your live bot and a test account):
1. Open the Mini App → Premium → Subscribe → pay with Stars.
2. Confirm `/api/payments/verify` reports `premium: true` **after** Telegram confirms (not before).
3. Refresh the app: membership persists; expire date extends if you subscribe again.
4. Replay protection: send the same webhook payload twice (e.g. via `curl`) — only one subscription row, second call returns "already processed".

## 6. Backups & recovery

```bash
# 6-hourly dump to object storage (cron / GitHub Action)
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=playnix-$(date +%F-%H).dump
aws s3 cp playnix-$(date +%F-%H).dump s3://YOUR_BACKUP_BUCKET/
```

Restore drill (run at least quarterly):

```bash
createdb playnix_restore
pg_restore --no-owner --dbname=playnix_restore playnix-2026-11-06-00.dump
DATABASE_URL="postgres://…/playnix_restore" npm run verify:games
```

Local/dev SQLite: copy `data/playnix.db` (plus `-wal`/`-shm` when the server is stopped).

## 7. Rollback

Vercel keeps every deployment — promote the previous one. Schema changes are additive (`IF NOT EXISTS`), so a rollback does not require a down-migration. Never run the destructive `db:reset` against production: it refuses PostgreSQL unless `PLAYNIX_ALLOW_REMOTE_RESET=true`.

## 8. Operations checklist after go-live

- [ ] `GET /api/health` → `ok: true`
- [ ] `/admin` reachable only by allowlisted Telegram IDs
- [ ] `npm run smoke BASE_URL=https://YOUR_DOMAIN` → all green
- [ ] `getWebhookInfo` shows no errors, `pending_update_count` near 0
- [ ] Bot answers `/start`, `/search neon`, `/language`
- [ ] One free game launches and pauses correctly on a real phone
- [ ] One Subscribe flow completes and grants Premium server-side
- [ ] Backup job produced a file, and a restore was tested
