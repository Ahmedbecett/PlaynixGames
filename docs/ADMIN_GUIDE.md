# Administrator guide

You get the `admin` role automatically when your Telegram ID is listed in `ADMIN_TELEGRAM_IDS` and you open the Mini App. There is **no public admin registration** and no password login.

Open the dashboard from your profile → *Admin dashboard*, or go to `/admin`.

## Adding a game (no code changes)

1. **Games → Add game.**
2. Required: title, slug (auto-generated from the title), launch URL.
3. Fill in developer, publisher, category, licence, source, controls, languages, orientation.
4. Cover: paste a URL or upload a file (uploads are re-encoded to WebP).
5. Choose `game_type`:
   - `html5` — runs inside the Mini App (iframe)
   - `external` — publisher-hosted page that cannot be embedded; users get "Open official game"
   - `native_apk` — needs a real install; listed for discovery only, never shown as instant play
6. Set status. **Publishing runs verification first** — if the URL fails any check the save is rejected and the failing checks are listed.

### The verification checks

| Check | Meaning |
| --- | --- |
| `url_present` | A URL was provided |
| `same_origin_file` | Path resolves to a real file in `/public` |
| `html_document` | The entry point is HTML |
| `https` | Only https is accepted for remote games |
| `public_host` | Blocks private/loopback hosts (SSRF guard) |
| `reachable` | HTTP 200 within 12s |
| `https_after_redirect` | Redirects stay on https |
| `html_content` | Content-Type is HTML |
| `frameable` / `csp_frame_ancestors` | Publisher doesn't block embedding |

If a publisher blocks framing, list the game as `external` instead of `html5` — do not pretend it is instant-play.

## Moderate

- **Reports**: reason, reporter, one-click *Mark resolved* / *Dismiss*. Fix the game first (edit or disable), then resolve.
- **Reviews**: hide abusive entries; ratings and averages recompute immediately.
- **Users**: search by username/ID, suspend with a reason (the Mini App blocks suspended accounts), restore later. Admins cannot suspend other admins.

## Monetization

- **Plans**: create a plan with a Stars price (`XTR`) and duration in days. Feature list accepts dictionary keys (e.g. `premium.benefit.library`) so it is translated. Deactivate a plan to hide it from the store.
- **Ads**: four placements exist (`home_banner`, `game_details`, `home_promo`, `search_sponsored`). Each is off by default and must be switched on explicitly. Only one placement should be active per page, creatives must carry the sponsored label, and nothing may cover game controls.
- **Campaigns**: sponsored listings with budget, start/end dates, impressions and clicks. Pause from the same screen.

## Announcements

Write a title + body; optionally tick **Also broadcast in the bot** to send the message to every active user. The in-app notification appears in `/notifications` for all users.

## Bot operations

**System** shows whether the bot token, webhook secret, session secret, admin IDs, database and storage are configured. **Register webhook** points Telegram at `https://<APP_URL>/api/telegram/webhook` and sets the chat menu button. Do this after every domain change.

## Rules the platform enforces for you

- Games cannot be published without a passing verification run.
- Premium games cannot be launched unless the subscription is active (server-side check, both page and API).
- Ratings are unique per user per game.
- Every admin mutation is appended to `admin_logs` with actor, entity, IP and timestamp.
- Deleting a game cascades its images, favourites, history and reviews. Prefer `disabled` if you may need the data.
