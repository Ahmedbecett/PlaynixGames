# Testing report

## Automated suite

```bash
npm run db:migrate && npm run db:seed
npm run dev            # terminal 1
npm run smoke          # terminal 2
```

Result in this environment: **38 / 38 checks passed** (`tsc --noEmit` clean, `next build` clean).

### What is covered

| Group | Checks |
| --- | --- |
| Database & catalog | 22 tables exist; 6 games; unique slugs; every published game has a launch URL; a premium title exists; 16 categories; active plans with Stars prices |
| Game verification | Every published HTML5 game passes the real launch checks (≥5 required) — 6/6 |
| Telegram auth | Valid `initData` accepted; tampered payload rejected; 48h-old payload rejected |
| Search | Partial name, description keyword, unknown query → 0 rows, category filter, premium filter |
| Stars fulfilment | Verified payment activates Premium, expiry stored, replay is idempotent, unknown payload refused |
| HTTP surface | Home 200 + renders real cards, security headers, `/api/games`, game details, player for a free game, **premium player redirects**, 404 for unknown slug, `/admin` not public, `/api/admin/dashboard` → 401, reviews → 401 when anonymous, cross-origin write → 403, all six game bundles served |

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
