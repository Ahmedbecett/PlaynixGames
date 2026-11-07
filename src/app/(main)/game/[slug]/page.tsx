import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { getPublishedGameBySlug, getScreenshots, getSimilarGames, toCard } from "@/lib/games";
import { getDictionary, formatDate, formatNumber } from "@/lib/i18n";
import { GameActions } from "@/components/GameActions";
import { GameCard } from "@/components/GameCard";
import { Icon } from "@/components/Icons";
import { Reviews, type Review } from "@/components/Reviews";
import { StarsDisplay } from "@/components/Rating";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug);
  if (!game) return { title: "Game" };
  return {
    title: game.title,
    description: game.short_description ?? undefined,
    openGraph: {
      title: `${game.title} · Playnix`,
      description: game.short_description ?? undefined,
      images: game.cover_url ? [game.cover_url] : undefined,
    },
  };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug);
  if (!game) notFound();

  const { dict, locale } = await getDictionary();
  const user = await getCurrentUser();
  const [screenshots, similar, premiumStatus, favoriteRow, myReview, reviewRows, adPlacement] = await Promise.all([
    getScreenshots(game.id),
    getSimilarGames(game, 8),
    getPremiumStatus(),
    user ? one<{ id: string }>("SELECT id FROM favorites WHERE user_id = ? AND game_id = ?", [user.id, game.id]) : Promise.resolve(null),
    user
      ? one<{ rating: number; review_text: string | null }>("SELECT rating, review_text FROM reviews WHERE user_id = ? AND game_id = ?", [user.id, game.id])
      : Promise.resolve(null),
    all<Review & { first_name: string | null; photo_url: string | null; username: string | null }>(
      `SELECT r.id, r.rating, r.review_text AS text, r.created_at AS "createdAt", u.first_name, u.photo_url, u.username
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.game_id = ? AND r.status = 'published' AND u.status = 'active'
       ORDER BY r.created_at DESC LIMIT 8`,
      [game.id],
    ),
    one<{ enabled: number; image_url: string | null; target_url: string | null }>(
      "SELECT enabled, image_url, target_url FROM ad_placements WHERE key = 'game_details'",
    ),
  ]);

  const canInteract = Boolean(user && user.status === "active");
  const isPremiumGame = game.pricing_type === "premium";
  const locked = isPremiumGame && !premiumStatus.premium;
  const playable = game.game_type === "html5" && Boolean(game.game_url);
  const reviews: Review[] = reviewRows.map((row) => ({
    id: row.id,
    rating: Number(row.rating),
    text: row.text,
    createdAt: row.createdAt,
    author: { name: row.first_name ?? row.username ?? "Player", photoUrl: row.photo_url, username: row.username },
  }));

  const facts: { label: string; value: string }[] = [
    { label: dict["game.developer"], value: game.developer ?? "—" },
    { label: dict["game.publisher"], value: game.publisher ?? "—" },
    { label: dict["game.category"], value: game.category_name ?? "—" },
    { label: dict["game.type"], value: dict[`game.type.${game.game_type}`] },
    { label: dict["game.releaseDate"], value: game.released_at ? formatDate(game.released_at, locale) : "—" },
    { label: dict["game.devices"], value: game.supported_devices ?? "—" },
    { label: dict["game.controls"], value: game.controls ?? "—" },
    { label: dict["game.languages"], value: game.languages ?? "—" },
    {
      label: dict["game.orientation"],
      value: dict[`game.orientation.${(game.orientation ?? "any") as "any" | "portrait" | "landscape"}`],
    },
    { label: dict["game.source"], value: game.source ?? "—" },
    { label: dict["game.license"], value: game.license ?? "—" },
  ];

  return (
    <div className="fade-up">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="min-w-0">
          {/* cover */}
          <div className="relative overflow-hidden rounded-[1.3rem] border border-[rgba(139,92,246,.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.cover_url || "/covers/placeholder.svg"} alt={game.title} className="aspect-[16/9] w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(9,11,20,.92))" }} />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-4">
              <span className={`game-card__badge ${isPremiumGame ? "badge-premium" : "badge-free"}`} style={{ position: "static" }}>
                {isPremiumGame ? dict["common.premium"] : dict["common.free"]}
              </span>
              {game.verified_at && (
                <span className="chip" style={{ color: "var(--color-success)", borderColor: "rgba(34,197,94,.4)" }}>
                  <Icon name="shield" size={11} /> {dict["common.verified"]}
                </span>
              )}
              {game.game_type === "external" && (
                <span className="chip">
                  <Icon name="external" size={11} /> {dict["game.externalTitle"]}
                </span>
              )}
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-[850] tracking-tight sm:text-3xl">{game.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <Link href={`/category/${game.category_slug ?? ""}`} className="font-semibold text-[var(--color-cyan)]">
              {game.category_name}
            </Link>
            <span>·</span>
            <span>{game.developer}</span>
            <span>·</span>
            <span>
              {formatNumber(Number(game.play_count), locale)} {dict["game.playCount"].replace("{count}", "").trim()}
            </span>
          </div>
          <div className="mt-2">
            <StarsDisplay value={Number(game.rating_avg)} count={Number(game.rating_count)} />
          </div>

          <div className="mt-4">
            <GameActions
              gameId={game.id}
              slug={game.slug}
              title={game.title}
              initiallyFavorite={Boolean(favoriteRow)}
              canInteract={canInteract}
              isPremiumGame={isPremiumGame}
              hasPremium={premiumStatus.premium}
              playable={playable}
              externalUrl={game.game_type === "external" ? game.game_url : null}
            />
          </div>

          {locked && (
            <div className="mt-4 rounded-xl border border-[rgba(139,92,246,.4)] p-3.5" style={{ background: "rgba(139,92,246,.1)" }}>
              <p className="flex items-center gap-2 text-sm font-bold">
                <Icon name="crown" size={15} /> {dict["game.premiumOnlyTitle"]}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{dict["game.premiumOnlyBody"]}</p>
            </div>
          )}
          {!playable && (
            <div className="mt-4 rounded-xl border border-[rgba(161,170,189,.3)] p-3.5" style={{ background: "rgba(23,30,48,.6)" }}>
              <p className="text-sm font-bold">
                {game.game_type === "external" ? dict["game.externalTitle"] : dict["game.nativeTitle"]}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {game.game_type === "external" ? dict["game.externalBody"] : dict["game.nativeBody"]}
              </p>
            </div>
          )}

          {game.description && (
            <section className="mt-6">
              <h2 className="mb-2 text-base font-extrabold">{dict["game.about"]}</h2>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--color-muted)]">{game.description}</p>
            </section>
          )}

          {screenshots.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-base font-extrabold">{dict["game.screenshots"]}</h2>
              <div className="scroll-x">
                {screenshots.map((shot) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={shot.id}
                    src={shot.image_url}
                    alt=""
                    loading="lazy"
                    className="h-36 rounded-xl border border-[rgba(139,92,246,.2)] object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          <Reviews
            gameId={game.id}
            initialReviews={reviews}
            average={Number(game.rating_avg)}
            total={Number(game.rating_count)}
            initialRating={myReview ? Number(myReview.rating) : 0}
            initialText={myReview?.review_text ?? ""}
            canReview={canInteract}
          />

          {similar.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-base font-extrabold">{dict["game.similar"]}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {similar.slice(0, 6).map((item) => (
                  <GameCard
                    key={item.id}
                    game={toCard(item)}
                    canFavorite={canInteract}
                    locked={item.pricing_type === "premium" && !premiumStatus.premium}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-[rgba(139,92,246,.22)] p-4" style={{ background: "rgba(23,30,48,.6)" }}>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-[var(--color-muted)]">{dict["game.details"]}</h2>
            <dl className="space-y-2">
              {facts.map((fact) => (
                <div key={fact.label} className="flex gap-3 text-[12.5px]">
                  <dt className="w-28 shrink-0 text-[var(--color-muted)]">{fact.label}</dt>
                  <dd className="min-w-0 flex-1 font-semibold break-words">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {adPlacement && Number(adPlacement.enabled) === 1 && adPlacement.image_url && (
            <a
              href={adPlacement.target_url ?? "#"}
              className="block overflow-hidden rounded-2xl border border-[rgba(139,92,246,.22)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={adPlacement.image_url} alt="" className="w-full" loading="lazy" />
              <span className="block px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                {dict["common.sponsored"]}
              </span>
            </a>
          )}

          <div className="rounded-2xl border border-[rgba(34,211,238,.22)] p-4" style={{ background: "rgba(34,211,238,.06)" }}>
            <p className="flex items-center gap-2 text-xs font-bold text-[var(--color-cyan)]">
              <Icon name="shield" size={14} /> {dict["common.verified"]}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted)]">{dict["footer.legal"]}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
