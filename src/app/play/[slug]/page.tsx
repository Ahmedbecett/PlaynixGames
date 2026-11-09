import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { getPublishedGameBySlug } from "@/lib/games";
import { GamePlayer } from "@/components/GamePlayer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug);
  // The iframe shell is a duplicate of /game/<slug> — keep it out of the index.
  return {
    title: game ? `Playing ${game.title}` : "Play",
    robots: { index: false, follow: false },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug);
  if (!game) redirect("/search");

  // Server-side enforcement: never trust the client for premium or playability.
  if (game.game_type !== "html5" || !game.game_url) redirect(`/game/${game.slug}`);

  if (game.pricing_type === "premium") {
    const [user, premium] = await Promise.all([getCurrentUser(), getPremiumStatus()]);
    if (!user) redirect("/premium?reason=login");
    if (!premium.premium) redirect("/premium?reason=locked");
  }

  // Only same-origin paths and https URLs can reach the iframe.
  const url = game.game_url;
  const allowed = url.startsWith("/") || /^https:\/\//i.test(url);
  if (!allowed) redirect(`/game/${game.slug}`);

  return <GamePlayer gameId={game.id} slug={game.slug} title={game.title} gameUrl={url} orientation={game.orientation ?? "any"} />;
}
