import type { MetadataRoute } from "next";
import { all } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * `/sitemap.xml`
 *
 * Lists every public, indexable surface: the home page, the category index,
 * each active category and every published game. Account-scoped pages
 * (profile, favorites, notifications, search) and iframes are excluded — they
 * are either private or duplicate the game page.
 *
 * Rendered per request so newly published games appear immediately; a DB
 * failure degrades to the static pages instead of returning a 500.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

type GameSitemapRow = {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
};

type CategorySitemapRow = {
  slug: string;
  created_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const now = new Date();

  // Stable per-day timestamp: a lastmod that changes on every request is
  // ignored (or distrusted) by Google.
  const today = new Date(now.toISOString().slice(0, 10));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: today, changeFrequency: "daily", priority: 1 },
    { url: `${base}/categories`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/premium`, lastModified: today, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const [games, categories] = await Promise.all([
      all<GameSitemapRow>(
        `SELECT slug, updated_at, published_at FROM games
         WHERE publication_status = 'published'
         ORDER BY COALESCE(published_at, created_at) DESC
         LIMIT 5000`,
      ),
      all<CategorySitemapRow>(
        "SELECT slug, created_at FROM categories WHERE is_active = 1 ORDER BY sort_order ASC",
      ),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${base}/category/${category.slug}`,
      lastModified: category.created_at ? new Date(category.created_at) : today,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const gameEntries: MetadataRoute.Sitemap = games.map((game) => ({
      url: `${base}/game/${game.slug}`,
      lastModified: game.updated_at ? new Date(game.updated_at) : today,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    return [...staticEntries, ...categoryEntries, ...gameEntries];
  } catch {
    // Never break crawling because the database hiccuped.
    return staticEntries;
  }
}
