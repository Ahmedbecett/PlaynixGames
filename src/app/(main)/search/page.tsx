import type { Metadata } from "next";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { all } from "@/lib/db";
import { listCategoriesWithCounts, popularSearches, searchGames, toCard, type SortKey } from "@/lib/games";
import { getDictionary } from "@/lib/i18n";
import { SearchExperience } from "@/components/SearchExperience";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search" };

const SORTS: SortKey[] = ["relevance", "popular", "newest", "rating"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; pricing?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const sort = SORTS.includes(params.sort as SortKey) ? (params.sort as SortKey) : "relevance";
  const pricing = params.pricing === "free" || params.pricing === "premium" ? params.pricing : undefined;
  const { dict, locale } = await getDictionary();
  const user = await getCurrentUser();

  const [results, categories, popular, favorites, premiumStatus, premiumGames] = await Promise.all([
    searchGames({ query: query || undefined, sort, pricing, category: params.category, limit: 12 }),
    listCategoriesWithCounts(locale),
    popularSearches(8),
    user ? all<{ game_id: string }>("SELECT game_id FROM favorites WHERE user_id = ?", [user.id]) : Promise.resolve([]),
    getPremiumStatus(),
    all<{ id: string }>("SELECT id FROM games WHERE pricing_type = 'premium' AND publication_status = 'published'"),
  ]);

  const lockedIds = premiumStatus.premium ? [] : premiumGames.map((row) => row.id);

  return (
    <div>
      <h1 className="mb-1 hidden text-xl font-extrabold tracking-tight sm:block">{dict["search.titleFor"]}</h1>
      <p className="mb-4 hidden text-xs text-[var(--color-muted)] sm:block">{dict["search.placeholder"]}</p>
      <SearchExperience
        initialQuery={query}
        initialGames={results.games.map(toCard)}
        initialTotal={results.total}
        categories={categories}
        popular={popular}
        favoriteIds={favorites.map((row) => row.game_id)}
        canFavorite={Boolean(user && user.status === "active")}
        lockedIds={lockedIds}
      />
      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--color-muted)]">
        <Icon name="shield" size={12} /> {dict["home.catalogNote"]}
      </p>
    </div>
  );
}
