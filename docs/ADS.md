# Rewarded ads (Monetag)

Playnix monetises in three layers; this document covers the middle one.

| Layer | Who pays | Where it lives |
| --- | --- | --- |
| Telegram Stars subscriptions | players | `src/lib/payments.ts`, `/premium` |
| **Rewarded ads (Monetag)** | ad network | `src/lib/ads.ts`, `src/components/ads/*`, `/api/ads/reward` |
| Internal sponsored placements | developers | `ad_placements` / `ad_campaigns`, `/admin/ads` |

## What the user experiences

1. A free user opens a premium game → the player redirects to
   `/premium?reason=locked&game=<slug>`.
2. That page offers **two** paths: subscribe with Stars, or **watch one short ad**
   to play *that* game for a few minutes.
3. The ad is a Monetag **rewarded interstitial** (`show_<zone>()`). If the
   provider refuses that format, the **rewarded popup** (`show_<zone>('pop')`) is
   tried once (disable with `NEXT_PUBLIC_ADS_POPUP_FALLBACK=false`).
4. Only after the provider's promise resolves does the browser call
   `POST /api/ads/reward`, which issues a server-side pass.
5. The player page and `POST /api/games/:id/play` both check the pass — the client
   is never the authority.

The third format, the **automatic in-app interstitial**, is implemented and
**off by default** (`NEXT_PUBLIC_ADS_INAPP_ENABLED=true` to enable). It never runs
inside `/play/*` or `/admin/*`, never runs for premium members, and is started
once per browser session.

## Configuration

```bash
# .env.local / Vercel
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_ADS_ZONE_ID=12207042
NEXT_PUBLIC_ADS_SDK_URL=https://libtl.com/sdk.js
NEXT_PUBLIC_ADS_POPUP_FALLBACK=true

# automatic interstitials (optional)
NEXT_PUBLIC_ADS_INAPP_ENABLED=false
NEXT_PUBLIC_ADS_INAPP_FREQUENCY=2
NEXT_PUBLIC_ADS_INAPP_CAPPING_HOURS=0.1
NEXT_PUBLIC_ADS_INAPP_INTERVAL=30
NEXT_PUBLIC_ADS_INAPP_TIMEOUT=5
NEXT_PUBLIC_ADS_INAPP_EVERY_PAGE=false

# server-only policy
ADS_REWARD_MINUTES=20
ADS_DAILY_LIMIT=3
ADS_COOLDOWN_SECONDS=45
```

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_ADS_ENABLED` | Master switch. Anything other than `true`/`1` hides every ad surface. |
| `NEXT_PUBLIC_ADS_ZONE_ID` | Monetag zone. Must be 4–12 digits, otherwise ads stay **off** (a malformed id would silently break `show_<zone>()`). |
| `ADS_REWARD_MINUTES` | Minutes of access to one premium game per watched ad. |
| `ADS_DAILY_LIMIT` | Rewarded unlocks per user per rolling 24 h. |
| `ADS_COOLDOWN_SECONDS` | Minimum gap between two unlocks (anti-spam). `0` disables it. |

`NEXT_PUBLIC_*` values are inlined at **build** time — change them in Vercel and
redeploy, not only at runtime.

### Content Security Policy

`next.config.ts` adds the ad hosts to `script-src`, `connect-src`, `frame-src` and
`media-src` **only when a valid zone is configured**. The host list lives in
`src/lib/ads-shared.ts` (`ADS_CSP`) so the policy and the contract test cannot
drift apart. With ads disabled the CSP is exactly what it was before.

## Data model

```sql
ad_reward_passes (
  id, user_id, game_id, source, zone, created_at, expires_at
)
```

Deliberately separate from `subscriptions` and `payments`: an ad pass can never
look like a paid entitlement in the ledger, and refunding a subscription cannot
touch it. Two indexes cover the daily-cap query and per-game lookups.

## API

| Route | Behaviour |
| --- | --- |
| `GET /api/ads/reward` | Session required. Returns `{ enabled, zoneId, rewardMinutes, dailyLimit, remainingToday, premium, activePasses }`. |
| `POST /api/ads/reward` `{ gameId }` | Same-origin + session + rate limit (12/min). Grants or reuses a pass. |

Responses: `200` granted/reused, `409 already_free`, `404 not_found`,
`429 ad_limit_reached` / `ad_cooldown`, `503 ads_disabled`, `401 unauthorized`,
`403 cross_origin`.

## Honest limits

- **Ad completion cannot be proven cryptographically.** The Monetag SDK runs in
  the browser, so a determined user can call `POST /api/ads/reward` without
  watching anything. That is why the upside is bounded: one game, a few minutes,
  a hard daily cap and a cooldown — plus everything is logged in
  `ad_reward_passes` so abuse is visible in `/admin/ads`.
- **No server-side postback is used.** Monetag offers postback URLs for some
  formats; if you wire one, replace the trust in the client with a signed
  postback check before granting.
- **Ad blockers win.** When the SDK is blocked, `AdUnavailableError("blocked")`
  is raised, the user sees a clear message, and the subscription CTA stays
  available. Nothing in the player breaks.
- **Telegram policy.** Third-party rewarded networks are common in Mini Apps, but
  digital goods must still be sold with Stars — the subscription flow stays the
  only paid path. Keep creatives compliant (no gambling/adult) or Telegram may
  restrict the Mini App.

## Verification

```bash
npm run ads:check     # 30 offline checks: config, policy, grant/reuse/cap/expiry, jsdom SDK
npm run smoke         # 38 checks, unchanged with ads disabled
npm run build         # must pass with ads off *and* on
```

`ads:check` injects a **synthetic** Monetag global (`show_12207042`) into jsdom, so
the rewarded flow, popup fallback, timeout and in-app settings are executed
without network access. The one thing no sandbox here can do is see a real ad
served by Monetag — that needs a device.

## Enabling on Vercel

```bash
vercel env add NEXT_PUBLIC_ADS_ENABLED production     # true
vercel env add NEXT_PUBLIC_ADS_ZONE_ID production     # 12207042
vercel --prod                                          # rebuild, since NEXT_PUBLIC_* is inlined
```

Then open a premium game as a non-subscriber: the premium page must show
«شاهد إعلانًا». Confirm `GET /api/ads/reward` returns `enabled: true`, and that
`/admin/ads` shows the zone and today's unlock counters.
