/**
 * Deep-link helpers. The same format the bot and the Mini App already use:
 * `https://t.me/<bot>?startapp=<param>` with `game_<slug>`, `cat_<slug>`,
 * `search_<text>`, `premium`, `new`, `favorites`.
 */

const USERNAME = /^[a-zA-Z0-9_]{4,32}$/;

/** `@PlayNixGamesBot` → `PlayNixGamesBot`; anything invalid → `null`. */
export function normaliseBotUsername(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim().replace(/^@/, "");
  return USERNAME.test(value) ? value : null;
}

export function botLink(username: string | undefined | null, startParameter?: string): string | null {
  const name = normaliseBotUsername(username);
  if (!name) return null;
  return startParameter ? `https://t.me/${name}?start=${encodeURIComponent(startParameter)}` : `https://t.me/${name}`;
}

/** Opens the Mini App straight away, optionally on a screen. */
export function startAppLink(username: string | undefined | null, startAppParameter?: string): string | null {
  const name = normaliseBotUsername(username);
  if (!name) return null;
  return startAppParameter
    ? `https://t.me/${name}?startapp=${encodeURIComponent(startAppParameter)}`
    : `https://t.me/${name}`;
}

export const gameStartParam = (slug: string) => `game_${slug}`;
export const categoryStartParam = (slug: string) => `cat_${slug}`;
export const searchStartParam = (query: string) => `search_${query}`;

/**
 * Maps a `startapp` payload to an in-app route.
 * Returns `null` for unknown payloads so callers can fall back to the home page.
 */
export function resolveStartParam(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value === "premium") return "/premium";
  if (value === "new") return "/search?sort=newest";
  if (value === "favorites") return "/favorites";
  if (value.startsWith("game_")) {
    const slug = value.slice(5);
    return /^[a-z0-9-]{1,80}$/.test(slug) ? `/game/${slug}` : null;
  }
  if (value.startsWith("play_")) {
    const slug = value.slice(5);
    return /^[a-z0-9-]{1,80}$/.test(slug) ? `/play/${slug}` : null;
  }
  if (value.startsWith("cat_")) {
    const slug = value.slice(4);
    return /^[a-z0-9-]{1,80}$/.test(slug) ? `/category/${slug}` : null;
  }
  if (value.startsWith("search_")) {
    const query = value.slice(7);
    return query ? `/search?q=${encodeURIComponent(query)}` : null;
  }
  return null;
}

/**
 * Telegram share link for a game. `baseUrl` should be the deployment origin so
 * the shared card opens the Mini App through the bot.
 */
export function shareGameLink(options: {
  botUsername: string;
  slug: string;
  title?: string;
  baseUrl?: string;
}): string {
  const app = startAppLink(options.botUsername, gameStartParam(options.slug));
  const fallback = `${(options.baseUrl ?? "").replace(/\/+$/, "")}/game/${options.slug}`;
  const url = app ?? fallback;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(options.title ?? "Play on Playnix")}`;
}
