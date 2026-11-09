# Contributing — architecture and conventions

This is the long version of [`CONTRIBUTING.md`](../CONTRIBUTING.md): a tour of
the codebase and the conventions that keep it coherent. Read it before your
first non-trivial pull request.

---

## Getting oriented

```
Request flow for a game page:

  browser
    → src/app/(main)/game/[slug]/page.tsx     (server component)
      → src/lib/games.ts                      (SQL, published-only)
      → src/lib/seo.ts                        (canonical, JSON-LD)
      → <GameCard>, <Reviews>, <TelegramCta>  (client islands)

Playing it:

  /play/<slug>  → src/app/play/[slug]/page.tsx   (premium check, server-side)
                → <GamePlayer>                   (iframe + session tracking)
                → POST /api/games/[id]/play      (server-authoritative session)
                → iframe: public/games/<slug>/index.html
                    → /sdk/playnix-sdk.js
                    → /api/sdk/<slug>/{scores,achievements,save}
```

## Layers, and what belongs in each

| Layer | Location | Rules |
| --- | --- | --- |
| **Route handlers** | `src/app/api/**/route.ts` | Parse, authorize, delegate. No SQL, no business logic. |
| **Domain modules** | `src/lib/*.ts` | SQL + rules. No HTTP types, no UI. |
| **Server components** | `src/app/**/page.tsx` | Fetch and render. Data fetching only — no mutations. |
| **Client components** | `src/components/**` | Interaction. Talk to the API, never to the DB. |

A route handler should read like this:

```ts
export const POST = route(async (request, context) => {
  assertSameOrigin(request);          // CSRF in depth
  const user = await requireUser();   // 401/403 handled centrally
  const input = await parseBody(request, schema);  // zod
  const result = await doTheThing(user, input);    // domain module
  return json(result);
});
```

`route()` in `src/lib/api.ts` catches `HttpError`, `DomainError` (status-carrying
domain errors) and `ZodError`, and turns them into uniform JSON. Never build an
error response by hand.

## The database

One schema, two engines. When you add a table or a column:

1. Add it to `db/schema.sql` with `CREATE TABLE IF NOT EXISTS` /
   `CREATE INDEX IF NOT EXISTS`.
2. **If it is a new column on an existing table**, `IF NOT EXISTS` will not help
   — the table already exists in production. Add an entry to `ADDED_COLUMNS` in
   `src/lib/db.ts`, which runs an idempotent `ALTER TABLE`.
3. Keep it portable: no `SERIAL`, no `BOOLEAN`, no `NOW()`. Use `TEXT` UUIDs,
   ISO-8601 `TEXT` timestamps and `INTEGER` 0/1.
4. `npm run db:migrate` on a **fresh** file (`SQLITE_PATH=/tmp/x.db`) to prove
   the schema builds from scratch, not just incrementally.

`?` placeholders only. They are translated to `$n` for Postgres by
`toPgPlaceholders`, which respects string literals — so do not hand-write `$1`.

Watch out for `COUNT(*)`: Postgres returns `int8` as a string. Wrap it in
`count()` from `src/lib/db.ts`.

## Internationalisation

`src/lib/i18n/dictionary.ts` holds every string.

- `en` is complete and is the type source: `type DictKey = keyof typeof en`.
- `ar` and `fr` are `Record<DictKey, string>` — a missing key is a **build
  error**, which is deliberate for locales we ship as complete.
- `es` and `ru` are `PartialDict` — partial by design, falling back to English.

Adding a string:

```ts
// 1. English (required)
"developers.title": "Developer dashboard",

// 2. Arabic and French (required — they are typed as complete)
"developers.title": "لوحة المطور",

// 3. Spanish and Russian (optional, welcome)
"developers.title": "Panel de desarrollador",
```

Then `npm run i18n:coverage` to see where each locale stands.

Never hardcode user-facing text in a component. If a string varies by state, add
a key rather than concatenating in JSX — word order differs across languages.

## Components

- Server components by default. Add `"use client"` only when you need state,
  effects, or browser APIs.
- Interactive islands stay small: fetch in the server component, pass data down,
  mutate through the API.
- Use `<Icon name="…" />` from `src/components/Icons.tsx`; add a path to the
  `paths` map rather than importing an icon library.
- Styling is Tailwind utility classes plus the tokens in `globals.css`
  (`--color-cyan`, `--color-muted`, `var(--color-violet)`). Reusable shells are
  `.btn`, `.btn-sm`, `.btn-ghost`, `.btn-outline`, `.input`, `.textarea`,
  `.select`, `.chip`, `.glass`, `.icon-btn`.
- RTL: prefer logical properties (`ms-`, `me-`, `start-`, `end-`) over
  `ml-`/`mr-`. The Arabic locale flips `dir="rtl"` on `<html>`.

## Games and the SDK

- A game is `public/games/<slug>/index.html` — single file, no external
  requests. See [`GAME_DEVELOPMENT.md`](GAME_DEVELOPMENT.md).
- `npm run games:check` boots every game in jsdom with a stubbed canvas and fails
  on any uncaught exception. It catches typos and broken loops without a browser.
- The browser SDK is `public/sdk/playnix-sdk.js` — plain ES5-ish JavaScript, no
  build step, no dependencies. Keep it that way.
- The npm package in `sdk/` is separate: a typed client and bot helpers. Changes
  there need a test in `sdk/test/`.

## Security conventions

- `assertSameOrigin(request)` on every state-changing route.
- `requireUser()` / `requireAdmin()` — never read the session cookie by hand.
- Rate limits through `consume()` in `src/lib/rate-limit.ts`.
- Validate with zod in `src/lib/validation.ts`; keep schemas next to each other
  so limits stay consistent.
- Uploads always go through `storeImage()`, which re-encodes server-side.
- Never log a token, a session cookie or `initData`.

## Tests and checks

| Command | What it proves |
| --- | --- |
| `npm run typecheck` | Types are sound across app + SDK |
| `npm run build` | It compiles and every route renders |
| `npm run games:check` | All bundled games boot |
| `npm run sdk:test` | SDK contract tests |
| `npm run smoke` | DB, auth, search, payments, HTTP, security |
| `npm run i18n:coverage` | No locale defines a key English does not have |

CI runs typecheck, build, games:check and sdk:test on every pull request.

## Commit style

Imperative mood, scoped where useful:

```
feat(sdk): add submitScore with per-game leaderboards
fix(api): return 409 instead of 500 on a duplicate slug
docs: explain the portable SQL layer
refactor(i18n): allow partial locale dictionaries
```

One logical change per commit. If a commit needs "and" in the message, it is
probably two commits.

## Reviewing your own work

Before opening the pull request, ask:

- Does this work on a 360px-wide screen, in Arabic (RTL), and in dark mode?
- Is every new string in the dictionary?
- Does a failure path exist — what does the user see when the network dies?
- Is anything authoritative happening in the browser that should be on the server?
- Did you add a table or column? Did you also add it to `ADDED_COLUMNS`?
