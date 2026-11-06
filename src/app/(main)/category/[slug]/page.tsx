import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { categoryDescription, categoryName, listCategoriesWithCounts, searchGames, toCard, type CategoryRow } from "@/lib/games";
import { getDictionary, formatNumber } from "@/lib/i18n";
import { CategoryChips } from "@/components/CategoryChips";
import { GameCard } from "@/components/GameCard";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await one<CategoryRow>("SELECT * FROM categories WHERE slug = ? AND is_active = 1", [slug]);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await one<CategoryRow>("SELECT * FROM categories WHERE slug = ? AND is_active = 1", [slug]);
  if (!category) notFound();

  const { dict, locale } = await getDictionary();
  const user = await getCurrentUser();
  const [results, categories, favorites, premiumStatus, premiumGames] = await Promise.all([
    searchGames({ category: slug, sort: "popular", limit: 48 }),
    listCategoriesWithCounts(locale),
    user ? all<{ game_id: string }>("SELECT game_id FROM favorites WHERE user_id = ?", [user.id]) : Promise.resolve([]),
    getPremiumStatus(),
    all<{ id: string }>("SELECT id FROM games WHERE pricing_type = 'premium' AND publication_status = 'published'"),
  ]);
  const favoriteIds = new Set(favorites.map((row) => row.game_id));
  const lockedIds = new Set(premiumStatus.premium ? [] : premiumGames.map((row) => row.id));
  const canFavorite = Boolean(user && user.status === "active");

  return (
    <div className="fade-up">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: "rgba(139,92,246,.16)" }}>
          {category.icon ?? "🎮"}
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{categoryName(category, locale)}</h1>
          <p className="text-[11px] text-[var(--color-muted)]">
            {formatNumber(results.total, locale)} {dict["home.stat.games"]} · {categoryDescription(category, locale)}
          </p>
        </div>
      </div>

      <CategoryChips categories={categories} activeSlug={slug} />

      {results.games.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(139,92,246,.25)] p-6 text-center" style={{ background: "rgba(23,30,48,.6)" }}>
          <Icon name="gamepad" size={26} style={{ color: "var(--color-muted)", margin: "0 auto 8px" }} />
          <p className="text-sm font-semibold">{dict["categories.empty"]}</p>
          <Link href="/search" className="btn btn-sm mt-3">
            {dict["common.search"]}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.games.map((game) => (
            <GameCard
              key={game.id}
              game={toCard(game)}
              canFavorite={canFavorite}
              initiallyFavorite={favoriteIds.has(game.id)}
              locked={lockedIds.has(game.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
