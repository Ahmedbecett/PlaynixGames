# Putting Playnix inside the bot

The Mini App is a website, and the bot is the front door. Three links connect them:

```
Telegram user
   │  taps "Open Playnix" (menu button / inline button / t.me deep link)
   ▼
https://YOUR_DOMAIN/…            ← the Mini App (Next.js, must be public HTTPS)
   │  initData signed by Telegram → POST /api/auth/telegram
   ▼
https://YOUR_DOMAIN/api/telegram/webhook   ← the bot (commands, Stars payments)
```

Nothing works until the Mini App has a **public HTTPS URL**. `localhost` is not reachable by Telegram.

---

## 1. Prerequisites

| Need | How |
| --- | --- |
| Bot + token | @BotFather → `/newbot` |
| Public HTTPS URL | Deploy (Vercel) — or a tunnel for local testing, see §7 |
| Environment | `NEXT_PUBLIC_APP_URL=https://your-domain`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot` (no `@`), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SESSION_SECRET`, `ADMIN_TELEGRAM_IDS` |
| Database | `DATABASE_URL` (Postgres in production) after `npm run db:migrate && npm run db:seed` |

`NEXT_PUBLIC_*` values are baked in at **build time** — set them before `npm run build`, and redeploy after changing the bot username.

## 2. BotFather – make the bot look like Playnix

1. `/setname` → **Playnix**
2. `/setdescription` → *Search, discover and play instantly inside Telegram.*
3. `/setabouttext` → *Your game search engine — thousands of games, instant play.*
4. `/setuserpic` → upload `public/brand/icon-512.png` (regenerate with `npm run logo:png`)
5. `/setcommands`:
   ```
   start - Open Playnix
   games - Browse categories
   search - Find a game
   popular - Trending now
   new - Recently added
   premium - Premium membership
   profile - Your profile
   help - Help
   language - Change language
   ```
6. `/setjoingroups` → **Disable** (a Mini App bot has no reason to sit in groups).

## 2b. Subscription funnel and welcome picture

The bot is the sales channel, so `/start` is not a plain text greeting:

- `sendPhoto` with `public/brand/welcome.jpg` (regenerate with `npm run welcome`) and an HTML caption.
- Inline keyboard: **Play now** (mini app), **⭐ Subscribe to Premium** (`callback_data: premium:plans`),
  **👑 Premium games** (mini app `/premium`).
- `premium:plans` lists every active plan with a `buy:<planId>` button; tapping one calls
  `createStarsInvoice` (which stores a `pending` row in `payments`) and replies with a **pay** URL button.
  Paying inside the chat fires `successful_payment` at `/api/telegram/webhook`, which grants the
  subscription and confirms the expiry date.
- If Telegram rejects the photo (bad URL, oversized file), the handler falls back to a text message.
- `scripts/ensure-bot.ts` also publishes `setMyCommands` on every deploy, so the blue menu lists
  `/start`, `/subscribe`, `/premium`, `/popular`, `/new`, `/language`, `/help`.

`npx tsx scripts/check-bot.ts` exercises the whole funnel offline (fetch is intercepted).

## 3. Register the webhook (bot side)

> **On Vercel this is automatic.** `npm run build` starts with `prebuild`, which runs
> `scripts/ensure-db.ts` and then `scripts/ensure-bot.ts`. Whenever `TELEGRAM_BOT_TOKEN`,
> `TELEGRAM_WEBHOOK_SECRET` and an `https://` `NEXT_PUBLIC_APP_URL` are all present in the
> project env, every deployment re-registers the webhook and the menu button against that URL
> (log lines: `[playnix] Bot reachable: @…`, `[playnix] Webhook → …`, `[playnix] Menu button → …`).
> Rotating the token or moving to a custom domain therefore only needs a redeploy. The manual
> command below is still the way to do it locally or from a tunnel.

```bash
# .env.local or host env must contain the real values
npm run bot:webhook
```

The script refuses to run unless the app URL is `https://` and `TELEGRAM_WEBHOOK_SECRET` exists. It then:

- calls `setWebhook` with `secret_token` → Telegram sends that value in `X-Telegram-Bot-Api-Secret-Token`, which `/api/telegram/webhook` verifies
- calls `setChatMenuButton` with `web_app: { url: NEXT_PUBLIC_APP_URL }` and the label **Open Playnix**

Same thing from the UI: **Admin → System → Register webhook** (uses the env of the running deployment).

Check it:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq
# url should be https://your-domain/api/telegram/webhook
# last_error_message: ""   pending_update_count: 0
```

## 4. Register the Mini App (client side)

A `web_app` button URL is enough to launch the app — Telegram does not require a separate "Mini App" registration when the button carries the URL. For a nicer entry point:

- **BotFather** → `/mybots` → your bot → **Bot Settings → Menu Button** → URL `https://your-domain`
- or rely on §3, which sets the menu button through the API.

Optional: **Configure Mini App** in BotFather (Bot Settings) with the same URL and a short name, which enables `https://t.me/your_bot/appname` links.

## 5. Test the whole chain

1. Open the bot → **/start** → the welcome message with the **🎮 Open Playnix** button.
2. Tap it → the Mini App opens and the header shows the real user greeting after `initData` is validated.
3. `SELECT telegram_id, role FROM users;` in your database — the row appeared, which proves the signature check passed.
4. If your Telegram ID is in `ADMIN_TELEGRAM_IDS`, the profile shows **Admin dashboard**.
5. `/search neon` in the chat → real titles from your catalog, each opening the Mini App on that game.
6. `/language` → switch to العربية → the Mini App opens RTL on the next launch.

## 6. Deep links and sharing

Any of these open the Mini App on a specific screen:

| Link | Opens |
| --- | --- |
| `https://t.me/YOUR_BOT` | Home |
| `https://t.me/YOUR_BOT?startapp=game_neon-serpent` | That game's page |
| `https://t.me/YOUR_BOT?startapp=play_neon-serpent` | Straight into the player |
| `https://t.me/YOUR_BOT?startapp=cat_arcade` | Category |
| `https://t.me/YOUR_BOT?startapp=search_neon` | Search results |
| `https://t.me/YOUR_BOT?startapp=premium` | Premium plans |

The in-app **Share** button and the game links inside bot messages use these `startapp` links automatically (`src/lib/telegram-links.ts`), so a shared game opens **inside Telegram** for the recipient instead of a browser tab. If `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is empty, they fall back to plain website URLs — still valid, just less seamless.

Payloads are mapped by `resolveStartParam()`: `game_`, `play_`, `cat_`, `search_`, `premium`, `new`, `favorites`. Unknown or malformed payloads are ignored (no open redirect).

## 7. Local development through a tunnel

Telegram must reach your machine over HTTPS:

```bash
# option A
cloudflared tunnel --url http://localhost:3000
# option B
ngrok http 3000
```

Copy the `https://…` URL the tunnel prints into `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://your-tunnel.trycloudflare.com
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot
```

Restart `npm run dev`, then `npm run bot:webhook`. Tunnels give a new hostname on every restart, so re-run the script each time. Alternatively, skip the webhook locally and run `npm run bot:poll` (long polling) — commands work, but `initData` still requires opening the app through an HTTPS URL.

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Button opens a blank page | URL not https, or the deployment is down | Check `NEXT_PUBLIC_APP_URL`, open it in a browser first |
| App loads but user is not signed in | Token mismatch (different bot), or clock skew > 24h | Same bot token in env as the one opening the app; check server time |
| `401` on `/api/telegram/webhook` in logs | `TELEGRAM_WEBHOOK_SECRET` differs between env and Telegram | Re-run `npm run bot:webhook` after fixing the env |
| `last_error_message: 404` in `getWebhookInfo` | Wrong URL path or deployment missing the route | Must end with `/api/telegram/webhook` |
| Bot silent, no errors | Webhook not set (e.g. still deleted) | `npm run bot:webhook`, or `getWebhookInfo` shows `url: ""` |
| Premium not granted after payment | Webhook unreachable while Telegram retried | Fix the webhook; Telegram retries, and `update_id` dedupe prevents double-granting |
| `t.me` share link 404s | Bot username typo | Fix `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` and **rebuild** |
| Mini App blocked inside Telegram | Strict CSP `frame-ancestors` | Production already allows `web.telegram.org` and `*.telegram.org` |

Logs: `vercel logs --follow` (or your host), plus **Admin → Activity log** for platform actions.
