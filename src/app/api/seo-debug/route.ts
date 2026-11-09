import { NextResponse } from "next/server";
import { getPublishedGameBySlug, getScreenshots, getSimilarGames } from "@/lib/games";
import { all, one } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "neon-serpent";
  const steps: Record<string, unknown> = {};
  try {
    const game = await getPublishedGameBySlug(slug);
    steps.game = game ? { id: game.id, slug: game.slug, category_id: game.category_id } : null;
    if (game) {
      steps.screenshots = (await getScreenshots(game.id)).length;
      steps.similar = (await getSimilarGames(game, 8)).length;
      steps.ad = await one("SELECT enabled, image_url, target_url FROM ad_placements WHERE key = 'game_details'");
    }
    return NextResponse.json({ ok: true, steps });
  } catch (error) {
    return NextResponse.json(
      { ok: false, steps, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) },
      { status: 500 },
    );
  }
}
