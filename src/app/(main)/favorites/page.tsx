import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { all } from "@/lib/db";
import { toCard, type GameRow } from "@/lib/games";
import { getDictionary } from "@/lib/i18n";
import { GameCard } from "@/components/GameCard";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const { dict } = await getDictionary();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="fade-up mx-auto max-w-md py-10 text-center">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "rgba(255,122,24,.14)" }}>
          <Icon name="heart" size={26} style={{ color: "var(--color-orange)" }} />
        </span>
        <h1 className="text-lg font-extrabold">{dict["profile.notSignedIn"]}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">{dict["profile.notSignedInBody"]}</p>
        <Link href="/" className="btn mt-4">{dict["nav.home"]}</Link>
      </div>
    );
  }

  const [rows, premiumStatus, premiumGames] = await Promise.all([
    all<GameRow>(
      `SELECT g.*, c.name AS category_name, c.slug AS category_slug
       FROM favorites f JOIN games g ON g.id = f.game_id
       LEFT JOIN categories c ON c.id = g.category_id
       WHERE f.user_id = ? AND g.publication_status = 'published'
       ORDER BY f.created_at DESC`,
      [user.id],
    ),
    getPremiumStatus(),
    all<{ id: string }>("SELECT id FROM games WHERE pricing_type = 'premium' AND publication_status = 'published'"),
  ]);

  const lockedIds = new Set(premiumStatus.premium ? [] : premiumGames.map((row) => row.id));
  const canFavorite = user.status === "active";

  return (
    <div className="fade-up">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="heart" size={20} style={{ color: "var(--color-orange)" }} filled />
        <h1 className="text-xl font-extrabold tracking-tight">{dict["favorites.title"]}</h1>
        <span className="chip ms-auto">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(139,92,246,.3)] p-8 text-center">
          <Icon name="heart" size={26} style={{ color: "var(--color-muted)", margin: "0 auto 8px" }} />
          <p className="text-sm font-bold">{dict["favorites.empty"]}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{dict["favorites.emptyBody"]}</p>
          <Link href="/search" className="btn btn-sm mt-3">{dict["common.search"]}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <GameCard key={row.id} game={toCard(row)} canFavorite={canFavorite} initiallyFavorite locked={lockedIds.has(row.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
