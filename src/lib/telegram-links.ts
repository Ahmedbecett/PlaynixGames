/**
 * Deep-link helpers shared by the server (bot messages) and the client (share
 * button, `startapp` routing). `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is inlined at
 * build time, so the same function works on both sides.
 */

const USERNAME = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "")
  .trim()
  .replace(/^@/, "");

/** `@username` without the @, or "" when the bot username is not configured. */
export function botUsername(): string {
  return /^[a-zA-Z0-9_]{4,32}$/.test(USERNAME) ? USERNAME : "";
}

/**
 * Link that opens the Mini App directly inside Telegram, optionally on a screen.
 * Returns null when no bot username is configured, so callers can fall back to
 * a normal https URL.
 */
export function botStartAppLink(param?: string): string | null {
  const username = botUsername();
  if (!username) return null;
  const base = `https://t.me/${username}`;
  return param ? `${base}?startapp=${encodeURIComponent(param)}` : base;
}

export function gameStartParam(slug: string): string {
  return `game_${slug}`;
}

/**
 * Maps a `startapp` payload to an in-app route.
 * Supported: `game_<slug>`, `play_<slug>`, `cat_<slug>`, `search_<text>`,
 * `premium`, `new`, `favorites`.
 */
export function resolveStartParam(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const [kind, ...rest] = value.split("_");
  const tail = rest.join("_").trim();
  // Telegram hands back the decoded payload; tolerate accidentally encoded ones.
  let slug = tail;
  if (tail.includes("%")) {
    try {
      slug = decodeURIComponent(tail);
    } catch {
      slug = tail;
    }
  }

  switch (kind.toLowerCase()) {
    case "game":
      return /^[a-z0-9-]{1,80}$/i.test(slug) ? `/game/${slug}` : null;
    case "play":
      return /^[a-z0-9-]{1,80}$/i.test(slug) ? `/play/${slug}` : null;
    case "cat":
      return /^[a-z0-9-]{1,80}$/i.test(slug) ? `/category/${slug}` : null;
    case "search":
      return slug ? `/search?q=${encodeURIComponent(slug.slice(0, 60))}` : "/search";
    case "premium":
      return "/premium";
    case "new":
      return "/search?sort=newest";
    case "favorites":
      return "/favorites";
    default:
      return null;
  }
}
