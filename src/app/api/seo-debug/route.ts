import { NextResponse } from "next/server";
import { getPublishedGameBySlug, getScreenshots, getSimilarGames } from "@/lib/games";
import { getDictionary, formatDate, formatNumber } from "@/lib/i18n";
import { breadcrumbNode, jsonLdGraph, videoGameNode } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "neon-serpent";
  const steps: Record<string, unknown> = {};
  try {
    const game = await getPublishedGameBySlug(slug);
    if (!game) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    const { dict, locale } = await getDictionary();
    steps.dict = { brand: dict["brand.name"], screenshotsKey: dict["game.screenshots"] };
    steps.locale = locale;
    steps.jsonld = jsonLdGraph([
      breadcrumbNode([
        { name: dict["nav.home"], path: "/" },
        { name: game.title, path: `/game/${game.slug}` },
      ]),
      videoGameNode(game, Number(game.rating_count), Number(game.rating_avg)),
    ]).slice(0, 200);
    steps.formatDate = game.released_at ? formatDate(game.released_at, locale) : "none";
    steps.formatNumber = formatNumber(Number(game.play_count), locale);
    steps.factsCount = 11;
    steps.orientation = dict[`game.orientation.${(game.orientation ?? "any") as "any"}`];
    return NextResponse.json({ ok: true, steps });
  } catch (error) {
    return NextResponse.json(
      { ok: false, steps, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) },
      { status: 500 },
    );
  }
}
