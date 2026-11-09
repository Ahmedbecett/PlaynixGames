import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { all, count, one } from "@/lib/db";
import {
  listCategoriesWithCounts,
  listGamesByFlag,
  listPublishedByCategorySlug,
  toCard,
  type GameCard as GameCardData,
  type GameRow as GameRecord,
} from "@/lib/games";
import { getDictionary, formatNumber } from "@/lib/i18n";
import { getContinuePlaying, getRecommendations } from "@/lib/recommend";
import { CategoryChips } from "@/components/CategoryChips";
import { GameRow, SectionHeader } from "@/components/GameRow";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TelegramCta } from "@/components/TelegramCta";
import { buildMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function loadHome(locale: Awaited<ReturnType<typeof getDictionary>>["locale"]) {
  const user = await getCurrentUser();
  const [
    categories,
    trending,
    newest,
    free,
    premium,
    featured,
    topRated,
    multiplayer,
    recommendations,
    resume,
    favoriteRows,
    stats,
    promo,
  ] = await Promise.all([
    listCategoriesWithCounts(locale),
    listGamesByFlag("trending", 12),
    listGamesByFlag("new", 12),
    listGamesByFlag("free", 12),
    listGamesByFlag("premium", 8),
    listGamesByFlag("featured", 8),
    listGamesByFlag("rating", 12),
    listPublishedByCategorySlug("multiplayer", 12),
    getRecommendations(user?.id ?? null, 12),
    user ? getContinuePlaying(user.id, 8) : Promise.resolve([] as GameRecord[]),
    user ? all<{ game_id: string }>("SELECT game_id FROM favorites WHERE user_id = ?", [user.id]) : Promise.resolve([]),
    Promise.all([
      one<{ total: unknown }>("SELECT COUNT(*) AS total FROM games WHERE publication_status = 'published'"),
      one<{ total: unknown }>("SELECT COUNT(*) AS total FROM reviews WHERE status = 'published'"),
    ]),
    one<{ enabled: number; image_url: string | null; target_url: string | null }>(
      "SELECT enabled, image_url, target_url FROM ad_placements WHERE key = 'home_promo'",
    ),
  ]);

  return {
    user,
    categories,
    trending,
    newest,
    free,
    premium,
    featured,
    topRated,
    multiplayer,
    recommendations,
    resume,
    favoriteIds: new Set(favoriteRows.map((row) => row.game_id)),
    gameCount: count(stats[0]?.total),
    reviewCount: count(stats[1]?.total),
    promo,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict, locale } = await getDictionary();
  const title = `${dict["brand.name"] ?? SITE_NAME} — ${SITE_TAGLINE}`;
  return {
    ...buildMetadata({
      title,
      description: dict["home.heroSubtitle"] ?? SITE_DESCRIPTION,
      path: "/",
      locale,
      keywords: ["Playnix", "Telegram games", "instant play", "ألعاب تيليجرام", "jeux Telegram"],
    }),
    // Absolute title: the home page must not get the "· Playnix" suffix twice.
    title: { absolute: title },
  };
}

export default async function HomePage() {
  const { dict, locale } = await getDictionary();
  const [data, premiumStatus] = await Promise.all([loadHome(locale), getPremiumStatus()]);
  const t = (key: keyof typeof dict) => dict[key];

  const canFavorite = Boolean(data.user && data.user.status === "active");
  const lockedIds = new Set<string>(premiumStatus.premium ? [] : data.premium.map((game) => game.id));
  /**
   * A game should appear once on the home page. Every row is ordered by a
   * different key, but with no plays the "trending" and "newest" sorts collapse
   * onto the same rows, and the same cover ends up in two sections. Each
   * section claims its games first, and a later section quietly drops any it
   * has already shown (GameRow renders nothing when the list is empty).
   */
  const shown = new Set<string>();
  const cards = (rows: GameRecord[]): GameCardData[] =>
    rows
      .filter((row) => {
        if (shown.has(row.id)) return false;
        shown.add(row.id);
        return true;
      })
      .map(toCard);

  const heroSource = (data.featured.length > 0 ? data.featured : data.trending).slice(0, 6);
  const heroGames = heroSource.map((game) => ({
    slug: game.slug,
    title: game.title,
    shortDescription: game.short_description ?? "",
    coverUrl: game.cover_url,
    category: game.category_name ?? "",
    ratingAvg: Number(game.rating_avg ?? 0),
    ratingCount: Number(game.rating_count ?? 0),
    pricingType: game.pricing_type,
  }));

  return (
    <div className="fade-up">
      <HeroCarousel
        games={heroGames}
        eyebrow={t("home.heroEyebrow")}
        playLabel={t("common.playNow")}
        detailsLabel={t("common.learnMore")}
        premiumLabel={t("common.premium")}
      />

      <div className="mt-5">
        <TelegramCta />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[var(--color-muted)]">
        <span>
          <b className="text-[var(--color-cream)]">{formatNumber(data.gameCount, locale)}</b> {t("home.stat.games")}
        </span>
        <span>
          <b className="text-[var(--color-cream)]">{formatNumber(data.categories.length, locale)}</b> {t("home.stat.categories")}
        </span>
        <span>
          <b className="text-[var(--color-cream)]">{formatNumber(data.reviewCount, locale)}</b> {t("home.stat.reviews")}
        </span>
        {data.user?.first_name ? (
          <span className="ms-auto">
            {t("home.greeting")}, <b className="text-[var(--color-cream)]">{data.user.first_name}</b>
          </span>
        ) : null}
      </div>

      <CategoryChips categories={data.categories} allLabel={t("common.all")} />

      <GameRow
        titleKey="home.trending"
        games={cards(data.trending)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/search?sort=popular"
        track="trending"
      />

      <GameRow
        titleKey="home.newGames"
        games={cards(data.newest)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/search?sort=newest"
        track="new"
      />

      <GameRow
        titleKey="home.recommended"
        games={cards(data.recommendations)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        track="recommended"
      />

      <section className="mb-5">
        <SectionHeader titleKey="home.categories" href="/categories" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {data.categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="hover-lift press flex items-center gap-2.5 rounded-xl border border-[rgba(139,92,246,.2)] p-3"
              style={{ background: "rgba(23,30,48,.65)" }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg text-lg" style={{ background: "rgba(139,92,246,.16)" }}>
                {category.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold">{category.name}</span>
                <span className="block text-[10px] text-[var(--color-muted)]">
                  {formatNumber(category.gameCount, locale)} {t("home.stat.games")}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <GameRow
        titleKey="home.topRated"
        games={cards(data.topRated)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/search?sort=rating"
        track="rating"
      />

      <GameRow
        titleKey="home.multiplayer"
        games={cards(data.multiplayer)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/category/multiplayer"
        track="multiplayer"
      />

      <GameRow
        titleKey="home.editorsPicks"
        games={cards(data.featured)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        track="featured"
      />

      <GameRow
        titleKey="home.continuePlaying"
        games={cards(data.resume)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/profile"
        track="continue"
      />

      {data.promo && Number(data.promo.enabled) === 1 && data.promo.image_url && (
        <a
          href={data.promo.target_url ?? "#"}
          className="mb-5 block overflow-hidden rounded-2xl border border-[rgba(139,92,246,.25)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.promo.image_url} alt={t("common.sponsored")} className="w-full object-cover" loading="lazy" />
          <span className="block px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
            {t("common.sponsored")}
          </span>
        </a>
      )}

      <GameRow
        titleKey="home.freeGames"
        games={cards(data.free)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/search?pricing=free"
        track="free"
      />

      <GameRow
        titleKey="home.premiumGames"
        games={cards(data.premium)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/premium"
        track="premium"
      />

      <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--color-muted)]">{t("home.catalogNote")}</p>
    </div>
  );
}
