import { NextRequest } from "next/server";
import { HttpError, json, route } from "@/lib/api";
import { getGameBySlug, getScreenshots, getSimilarGames, toCard } from "@/lib/games";

export const dynamic = "force-dynamic";

export const GET = route(async (_request: NextRequest, context) => {
  const { slug } = await context.params;
  const game = await getGameBySlug(slug);
  if (!game || game.publication_status !== "published") {
    throw new HttpError(404, "Game not found.", "not_found");
  }
  const [screenshots, similar] = await Promise.all([getScreenshots(game.id), getSimilarGames(game, 8)]);

  return json({
    game: {
      ...toCard(game),
      description: game.description,
      developer: game.developer,
      publisher: game.publisher,
      releaseDate: game.released_at,
      supportedDevices: game.supported_devices,
      controls: game.controls,
      languages: game.languages,
      license: game.license,
      source: game.source,
      orientation: game.orientation,
      verified: Boolean(game.verified_at),
    },
    screenshots: screenshots.map((row) => row.image_url),
    similar: similar.map(toCard),
  });
});
