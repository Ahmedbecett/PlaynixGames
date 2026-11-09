# Contributing to Playnix

Thanks for taking the time to contribute. Playnix is an open-source Telegram
Mini App game platform, and it only gets better with outside help — a new
game, a translation, a bug fix, or a docs improvement all count.

This document is the short version. The long version, with an architecture
tour and code conventions, lives in [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

---

## Quick start

```bash
git clone https://github.com/Ahmedbecett/PlaynixGames.git
cd PlaynixGames
npm install
cp .env.example .env.local        # defaults work for local development
npm run db:migrate && npm run db:seed
npm run dev                       # http://localhost:3000
```

You need **Node.js 22.5 or newer** (the local database uses `node:sqlite`).
No Postgres, no Docker, no Telegram bot required to run the site locally.

## Before you open a pull request

```bash
npm run typecheck    # tsc --noEmit (builds the SDK first)
npm run build        # production build
npm run games:check  # boots every bundled game in jsdom
npm run sdk:test     # SDK unit tests
```

All four must pass. CI runs the same commands.

## What we are looking for

| Area | Good first contributions |
| --- | --- |
| **Games** | A complete, self-hosted HTML5 game in `public/games/<slug>/` — no external assets, no tracking, works offline |
| **Translations** | `es` and `ru` dictionaries are in progress; missing keys are a compile error by design |
| **SDK** | New helpers in `sdk/src/`, always with a test in `sdk/test/` |
| **Platform** | Bug fixes, accessibility, performance, docs |
| **i18n** | Locale-aware formatting, RTL edge cases |

## Ground rules

1. **No placeholder content.** No lorem ipsum, no fake ratings, no invented
   studios. If a game is not playable, it does not ship.
2. **No new runtime dependencies** without a discussion in an issue first.
   The platform intentionally runs on a very small dependency surface.
3. **Every UI string goes through the dictionary.** Hardcoded user-facing text
   will be rejected in review. See `src/lib/i18n/dictionary.ts`.
4. **Server-side authority.** Anything that costs money, grants premium access
   or changes a score is validated on the server, never trusted from the client.
5. **No secrets in the repo.** Bot tokens, database URLs and secrets stay in
   environment variables.

## Commit messages

Conventional-ish and descriptive, imperative mood:

```
feat(sdk): add submitScore with per-game leaderboards
fix(api): reject reviews with an empty rating
docs: explain the portable SQL layer
```

## Games

A game is a single folder with an `index.html` entry point and everything it
needs inlined or placed beside it:

```
public/games/my-game/
  index.html     # inline CSS + JS, no external requests
```

Then add a `SeedGame` entry to `scripts/seed-data.ts`, run `npm run covers`,
and make sure `npm run games:check` passes. Full guide:
[`docs/GAME_DEVELOPMENT.md`](docs/GAME_DEVELOPMENT.md).

## Reporting bugs

Open an issue with the template. Include the browser, whether you were inside
Telegram or on the web, and the exact steps. Screenshots help.

## Security

Please **do not** open a public issue for a vulnerability. Email the
maintainers or use GitHub's private security advisory feature.

## License

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE) that covers this repository.
