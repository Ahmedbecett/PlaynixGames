import Link from "next/link";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { all, count, one } from "@/lib/db";
import {
  listCategoriesWithCounts,
  listGamesByFlag,
  toCard,
  type GameCard as GameCardData,
  type GameRow as GameRecord,
} from "@/lib/games";
import { getDictionary, formatNumber } from "@/lib/i18n";
import { getContinuePlaying, getRecommendations } from "@/lib/recommend";
import { CategoryChips } from "@/components/CategoryChips";
import { GameRow, SectionHeader } from "@/components/GameRow";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  badge: string | null;
  game_slug: string | null;
};

async function loadHome(locale: Awaited<ReturnType<typeof getDictionary>>["locale"]) {
  const user = await getCurrentUser();
  const [categories, trending, newest, free, premium, featured, recommendations, resume, banners, favoriteRows, stats, promo] =
    await Promise.all([
      listCategoriesWithCounts(locale),
      listGamesByFlag("trending", 10),
      listGamesByFlag("new", 10),
      listGamesByFlag("free", 10),
      listGamesByFlag("premium", 10),
      listGamesByFlag("featured", 6),
      getRecommendations(user?.id ?? null, 10),
      user ? getContinuePlaying(user.id, 8) : Promise.resolve([] as GameRecord[]),
      all<Banner>(
        `SELECT b.*, g.slug AS game_slug FROM banners b LEFT JOIN games g ON g.id = b.game_id
         WHERE b.active = 1 ORDER BY b.sort_order ASC LIMIT 3`,
      ),
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
    recommendations,
    resume,
    banners,
    favoriteIds: new Set(favoriteRows.map((row) => row.game_id)),
    gameCount: count(stats[0]?.total),
    reviewCount: count(stats[1]?.total),
    promo,
  };
}

export default async function HomePage() {
  const { dict, locale } = await getDictionary();
  const [data, premiumStatus] = await Promise.all([loadHome(locale), getPremiumStatus()]);
  const t = (key: keyof typeof dict) => dict[key];

  const hero = data.banners[0];
  const daily = data.featured[0] ?? data.trending[0];
  const canFavorite = Boolean(data.user && data.user.status === "active");
  const lockedIds = new Set<string>(
    premiumStatus.premium ? [] : data.premium.map((game) => game.id),
  );

  const cards = (rows: GameRecord[]): GameCardData[] => rows.map(toCard);

  return (
    <div className="fade-up">
      {/* ------------------------------------------------------------- hero */}
      <section className="relative mb-6 overflow-hidden rounded-[1.4rem] border border-[rgba(139,92,246,.28)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero?.image_url || daily?.cover_url || "/covers/placeholder.svg"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(1.05)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(9,11,20,.96) 8%, rgba(9,11,20,.78) 45%, rgba(9,11,20,.35) 100%)",
          }}
        />
        <div className="relative z-10 flex flex-col gap-3 p-5 sm:p-8">
          <span className="eyebrow flex items-center gap-1.5">
            <Icon name="bolt" size={13} style={{ color: "var(--color-orange)" }} />
            {t("home.heroEyebrow")}
          </span>
          <h1 className="max-w-xl text-[1.65rem] font-[850] leading-[1.1] tracking-tight sm:text-4xl">
            <span className="text-gradient">{hero?.title ?? t("home.heroTitle")}</span>
          </h1>
          <p className="max-w-md text-[13px] leading-relaxed text-[var(--color-muted)] sm:text-sm">
            {hero?.subtitle ?? t("home.heroSubtitle")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link href={hero?.cta_url ?? (daily ? `/game/${daily.slug}` : "/search")} className="btn">
              <Icon name="play" size={16} filled />
              {t("home.heroCta")}
            </Link>
            <Link href="/categories" className="btn btn-ghost">
              <Icon name="grid" size={16} />
              {t("nav.categories")}
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[var(--color-muted)]">
            <span>
              <b className="text-[var(--color-cream)]">{formatNumber(data.gameCount, locale)}</b> {t("home.stat.games")}
            </span>
            <span>
              <b className="text-[var(--color-cream)]">{formatNumber(data.categories.length, locale)}</b> {t("home.stat.categories")}
            </span>
            <span>
              <b className="text-[var(--color-cream)]">{formatNumber(data.reviewCount, locale)}</b> {t("home.stat.reviews")}
            </span>
          </div>
        </div>
      </section>

      <CategoryChips categories={data.categories} />

      {data.user && (
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          {t("home.greeting")}, <b className="text-[var(--color-cream)]">{data.user.first_name ?? t("nav.profile")}</b>
        </p>
      )}

      <GameRow
        titleKey="home.continuePlaying"
        games={cards(data.resume)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/profile"
        track="continue"
      />

      <GameRow
        titleKey="home.trending"
        games={cards(data.trending)}
        favoriteIds={data.favoriteIds}
        canFavorite={canFavorite}
        lockedIds={lockedIds}
        href="/search?sort=popular"
        track="trending"
      />

      {/* ---------------------------------------------------- game of the day */}
      {daily && (
        <section className="mb-7">
          <SectionHeader titleKey="home.dailyFeatured" href={`/game/${daily.slug}`} />
          <Link
            href={`/game/${daily.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-[1.3rem] border border-[rgba(34,211,238,.22)] sm:flex-row"
            style={{ background: "linear-gradient(150deg,#15203a,#101526)" }}
          >
            <div className="relative sm:w-[46%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={daily.cover_url || "/covers/placeholder.svg"}
                alt=""
                className="h-44 w-full object-cover sm:h-full"
                loading="lazy"
              />
              <span className="game-card__badge badge-free" style={{ top: ".6rem", insetInlineStart: ".6rem" }}>
                {t("home.dailyFeatured")}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4 sm:p-6">
              <span className="eyebrow">{daily.category_name ?? "Playnix"}</span>
              <h3 className="text-xl font-extrabold tracking-tight">{daily.title}</h3>
              <p className="line-clamp-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
                {daily.short_description}
              </p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                <span className="btn btn-sm">
                  <Icon name="play" size={13} filled />
                  {t("common.playNow")}
                </span>
                <span className="text-[11px] text-[var(--color-muted)]">
                  {Number(daily.rating_count) > 0
                    ? `★ ${Number(daily.rating_avg).toFixed(1)} · ${formatNumber(Number(daily.rating_count), locale)}`
                    : t("home.catalogNote")}
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

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

      {data.promo && Number(data.promo.enabled) === 1 && data.promo.image_url && (
        <a
          href={data.promo.target_url ?? "#"}
          className="mb-7 block overflow-hidden rounded-2xl border border-[rgba(139,92,246,.25)]"
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

      {/* ------------------------------------------------------- categories */}
      <section className="mb-2">
        <SectionHeader titleKey="home.categories" href="/categories" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {data.categories.slice(0, 8).map((category) => (
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

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--color-muted)]">{t("home.catalogNote")}</p>
    </div>
  );
}
