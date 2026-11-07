# Game sources and licenses

## Bundled catalog (shipped in this repository)

All six titles are **Playnix Originals**: original code, original canvas-rendered art, no third-party assets, no ripped sprites and no copied game code. Playnix owns them, so they can be hosted and distributed by this app without restriction.

| Game | Category | Type | Owner / licence | Bundle |
| --- | --- | --- | --- | --- |
| Neon Serpent | Arcade | HTML5 | © Playnix Originals — self-hosted, all rights reserved | `public/games/neon-serpent/` |
| Void Breaker | Arcade | HTML5 | © Playnix Originals — self-hosted, all rights reserved | `public/games/void-breaker/` |
| Astro Dodge | Action | HTML5 | © Playnix Originals — self-hosted, all rights reserved | `public/games/astro-dodge/` |
| Block Cascade | Puzzle | HTML5 | © Playnix Originals — self-hosted, all rights reserved | `public/games/block-cascade/` |
| Memory Matrix | Casual | HTML5 | © Playnix Originals — self-hosted, all rights reserved | `public/games/memory-matrix/` |
| Reversi Duel | Board | HTML5 (Premium) | © Playnix Originals — self-hosted, all rights reserved | `public/games/reversi-duel/` |

Game *mechanics* (snake, brick-breaker, falling blocks, memory pairs, Reversi) are not copyrightable; every line of code and every asset here was written for this project.

Each game records its ownership in the database (`games.license`, `games.source`) and the details page shows it, so users can always see where a game comes from.

## Adding third-party games

Publicly accessible is **not** the same as free to redistribute. Before publishing any external title, record all of the following in the admin form:

1. **Licence type** — e.g. MIT, GPL-3.0, CC-BY-4.0, commercial distribution agreement, publisher-written permission.
2. **Evidence** — link to the licence file or the written agreement (store the reference in `games.source`).
3. **Hosting model** — self-hosted bundle, publisher-hosted iframe, or external link only.
4. **Attribution** — author/publisher name plus required credit text.

### Source suitability

| Source | How to approach it |
| --- | --- |
| Open-source GitHub HTML5 games | Only with a permissive/compatible licence and attribution. Check for asset licences separately — a MIT code licence often does not cover bundled art. |
| itch.io | Each game has its own licence. Distributing an itch game inside another platform requires explicit permission from the developer; most itch games do not allow redistribution. |
| Publisher-hosted HTML5 games | Allowed if the publisher's terms permit embedding. Verify with the `frameable` check and use `game_type = external` when embedding is blocked. |
| Licensed game APIs/providers | Follow the provider's contract: attribution, revenue share, geo restrictions, and whether they allow Telegram distribution. |
| Partner submissions | Require a signed submission stating ownership and permission to distribute inside Telegram. |

### Never

- Copy a game from another portal, or bypass a paywall, login, DRM or region lock.
- Present an APK-only title as instant play.
- Host a game whose licence you cannot produce on request.
- Reuse another platform's branding, database, accounts or payment configuration.

## Removing a game

Set `publication_status = 'disabled'` (keeps history for reports) or delete it. If a rights holder reports a problem, take it down first and investigate afterwards — the report appears instantly in **Admin → Reports**.
