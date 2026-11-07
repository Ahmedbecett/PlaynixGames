import { all, count, one, type Row } from "./db";
import { normaliseLocale, type Locale } from "./i18n";

export type GameRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_url: string | null;
  developer: string | null;
  publisher: string | null;
  category_id: string | null;
  game_url: string | null;
  game_type: "html5" | "external" | "native_apk";
  source: string | null;
  license: string | null;
  pricing_type: "free" | "premium";
  publication_status: string;
  featured: number;
  released_at: string | null;
  supported_devices: string | null;
  controls: string | null;
  languages: string | null;
  orientation: string | null;
  play_count: number;
  rating_avg: number;
  rating_count: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  category_name?: string | null;
  category_slug?: string | null;
};

export type GameCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  coverUrl: string | null;
  category: string;
  pricingType: "free" | "premium";
  ratingAvg: number;
  ratingCount: number;
  playCount: number;
  gameType: GameRow["game_type"];
  featured: boolean;
};

export function toCard(row: GameRow): GameCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description ?? "",
    coverUrl: row.cover_url,
    category: row.category_name ?? "",
    pricingType: row.pricing_type,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    playCount: Number(row.play_count ?? 0),
    gameType: row.game_type,
    featured: Number(row.featured) === 1,
  };
}

const SELECT = `
  SELECT g.*, c.name AS category_name, c.slug AS category_slug
  FROM games g
  LEFT JOIN categories c ON c.id = g.category_id
`;

export type SortKey = "relevance" | "popular" | "newest" | "rating";

export type SearchParams = {
  query?: string;
  category?: string;
  pricing?: "free" | "premium";
  sort?: SortKey;
  limit?: number;
  offset?: number;
  includePremium?: boolean;
};

/**
 * Catalog search. Only published games are ever returned to end users.
 * Relevance is scored with weighted token matches so partial names, keywords,
 * developer names and tags all resolve to real rows.
 */
export async function searchGames(params: SearchParams): Promise<{ games: GameRow[]; total: number }> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 60);
  const offset = Math.max(params.offset ?? 0, 0);
  const clauses: string[] = ["g.publication_status = 'published'"];
  const values: (string | number)[] = [];

  const query = params.query?.trim();
  if (query) {
    const tokens = query
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 0)
      .slice(0, 6);
    if (tokens.length === 0) {
      clauses.push("1 = 0");
    } else {
      const tokenClauses = tokens.map(() => "(g.search_text LIKE ?)");
      clauses.push(`(${tokenClauses.join(" AND ")})`);
      for (const token of tokens) values.push(`%${token}%`);
    }
  }
  if (params.category) {
    clauses.push("c.slug = ?");
    values.push(params.category);
  }
  if (params.pricing) {
    clauses.push("g.pricing_type = ?");
    values.push(params.pricing);
  }

  const where = clauses.join(" AND ");
  const totalRow = await one<{ total: unknown }>(
    `SELECT COUNT(*) AS total FROM games g LEFT JOIN categories c ON c.id = g.category_id WHERE ${where}`,
    values,
  );

  const order = (() => {
    switch (params.sort) {
      case "newest":
        return "COALESCE(g.published_at, g.created_at) DESC, g.title ASC";
      case "rating":
        return "g.rating_avg DESC, g.rating_count DESC, g.play_count DESC";
      case "popular":
        return "g.play_count DESC, g.rating_avg DESC";
      default:
        if (!query) return "g.featured DESC, g.play_count DESC, g.created_at DESC";
        return `(CASE WHEN LOWER(g.title) = ? THEN 0
                      WHEN LOWER(g.title) LIKE ? THEN 1
                      WHEN LOWER(g.title) LIKE ? THEN 2
                      ELSE 3 END) ASC, g.play_count DESC`;
    }
  })();

  const orderValues: (string | number)[] = [];
  if ((params.sort ?? "relevance") === "relevance" && query) {
    const lower = query.toLowerCase();
    orderValues.push(lower, `${lower}%`, `%${lower}%`);
  }

  const rows = await all<GameRow>(
    `${SELECT} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...values, ...orderValues, limit, offset],
  );

  return { games: rows, total: count(totalRow?.total) };
}

export async function listGamesByFlag(
  flag: "featured" | "trending" | "new" | "free" | "premium",
  limit = 10,
): Promise<GameRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);
  switch (flag) {
    case "featured":
      return all<GameRow>(
        `${SELECT} WHERE g.publication_status = 'published' AND g.featured = 1 ORDER BY g.play_count DESC LIMIT ?`,
        [safeLimit],
      );
    case "trending":
      return all<GameRow>(
        `${SELECT} WHERE g.publication_status = 'published' ORDER BY g.play_count DESC, g.rating_avg DESC LIMIT ?`,
        [safeLimit],
      );
    case "new":
      return all<GameRow>(
        `${SELECT} WHERE g.publication_status = 'published' ORDER BY COALESCE(g.published_at, g.created_at) DESC LIMIT ?`,
        [safeLimit],
      );
    case "free":
      return all<GameRow>(
        `${SELECT} WHERE g.publication_status = 'published' AND g.pricing_type = 'free' ORDER BY g.play_count DESC LIMIT ?`,
        [safeLimit],
      );
    case "premium":
      return all<GameRow>(
        `${SELECT} WHERE g.publication_status = 'published' AND g.pricing_type = 'premium' ORDER BY g.play_count DESC LIMIT ?`,
        [safeLimit],
      );
  }
}

export async function getGameBySlug(slug: string): Promise<GameRow | null> {
  return one<GameRow>(`${SELECT} WHERE g.slug = ?`, [slug]);
}

export async function getPublishedGameBySlug(slug: string): Promise<GameRow | null> {
  return one<GameRow>(`${SELECT} WHERE g.slug = ? AND g.publication_status = 'published'`, [slug]);
}

export async function getGameById(id: string): Promise<GameRow | null> {
  return one<GameRow>(`${SELECT} WHERE g.id = ?`, [id]);
}

export async function getScreenshots(gameId: string) {
  return all<{ id: string; image_url: string; image_type: string }>(
    "SELECT id, image_url, image_type FROM game_images WHERE game_id = ? ORDER BY sort_order ASC",
    [gameId],
  );
}

export async function getSimilarGames(game: GameRow, limit = 8): Promise<GameRow[]> {
  // Built in JS rather than `? IS NULL`: PostgreSQL cannot infer a type for a
  // bare NULL parameter, and the clause is clearer when it is only present when
  // a category exists. Same SQL, valid on both engines.
  const values: (string | number)[] = [game.id];
  let categoryClause = "";
  if (game.category_id) {
    categoryClause = "AND g.category_id = ?";
    values.push(game.category_id);
  }
  values.push(game.play_count, Math.min(limit, 12));

  return all<GameRow>(
    `${SELECT} WHERE g.publication_status = 'published' AND g.id != ?
       ${categoryClause}
     ORDER BY ABS(g.play_count - ?) ASC, g.rating_avg DESC LIMIT ?`,
    values,
  );
}

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  name_fr: string | null;
  description: string | null;
  description_ar: string | null;
  description_fr: string | null;
  icon: string | null;
  sort_order: number;
  is_active: number;
};

export function categoryName(category: CategoryRow, locale: Locale): string {
  const normalised = normaliseLocale(locale);
  if (normalised === "ar" && category.name_ar) return category.name_ar;
  if (normalised === "fr" && category.name_fr) return category.name_fr;
  return category.name;
}

export function categoryDescription(category: CategoryRow, locale: Locale): string {
  const normalised = normaliseLocale(locale);
  if (normalised === "ar" && category.description_ar) return category.description_ar;
  if (normalised === "fr" && category.description_fr) return category.description_fr;
  return category.description ?? "";
}

export async function listCategories(): Promise<CategoryRow[]> {
  return all<CategoryRow>("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC");
}

export async function listCategoriesWithCounts(locale: Locale) {
  const rows = await all<CategoryRow & { game_count: unknown }>(
    `SELECT c.*, COUNT(g.id) AS game_count
     FROM categories c
     LEFT JOIN games g ON g.category_id = c.id AND g.publication_status = 'published'
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`,
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: categoryName(row, locale),
    icon: row.icon ?? "🎮",
    gameCount: count(row.game_count),
  }));
}

/** Rebuilds the denormalised search blob used by the LIKE based search index. */
export function buildSearchText(input: {
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  developer?: string | null;
  publisher?: string | null;
  categoryName?: string | null;
  tags?: string | null;
}): string {
  return [
    input.title,
    input.shortDescription,
    input.description,
    input.developer,
    input.publisher,
    input.categoryName,
    input.tags,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

export async function recordSearch(userId: string | null, query: string, results: number): Promise<void> {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return;
  const { run } = await import("./db");
  const crypto = await import("node:crypto");
  await run("INSERT INTO search_queries (id, user_id, query, results_count, created_at) VALUES (?, ?, ?, ?, ?)", [
    crypto.randomUUID(),
    userId,
    trimmed,
    results,
    new Date().toISOString(),
  ]);
}

export async function popularSearches(limit = 8): Promise<string[]> {
  const rows = await all<{ query: string }>(
    `SELECT query, COUNT(*) AS hits FROM search_queries
     WHERE created_at > ?
     GROUP BY LOWER(query)
     ORDER BY hits DESC, MAX(created_at) DESC
     LIMIT ?`,
    [new Date(Date.now() - 30 * 86_400_000).toISOString(), limit],
  );
  return rows.map((row) => row.query);
}

export function isPlayable(game: GameRow): boolean {
  return game.game_type === "html5" && Boolean(game.game_url);
}

export function rowToGame(row: Row): GameRow {
  return row as GameRow;
}
