import { NextRequest } from "next/server";
import { HttpError, json, route } from "@/lib/api";
import { getGameById, getGameBySlug, getScreenshots, getSimilarGames, toCard } from "@/lib/games";

export const dynamic = "force-dynamic";

/** Accepts either a UUID or a slug so /api/games/:slug (spec) and :id both work. */
export const GET = route(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const game = isUuid ? await getGameById(id) : await getGameBySlug(id);
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
      playableUrl: game.game_type === "html5" ? game.game_url : null,
    },
    screenshots: screenshots.map((row) => row.image_url),
    similar: similar.map(toCard),
  });
});
