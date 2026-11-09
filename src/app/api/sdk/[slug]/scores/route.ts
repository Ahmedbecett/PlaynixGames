import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireUser, route } from "@/lib/api";
import { one } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { submitScore, getLeaderboard } from "@/lib/progression";
import { z } from "zod";

export const dynamic = "force-dynamic";

const scoreSchema = z.object({
  score: z.number().finite(),
  board: z.string().trim().max(48).optional(),
  direction: z.enum(["asc", "desc"]).optional(),
});

/** Resolves `:slug` to a published game, rejecting unknown or unpublished ones. */
async function gameBySlug(slug: string) {
  const game = await one<{ id: string; slug: string; publication_status: string }>(
    "SELECT id, slug, publication_status FROM games WHERE slug = ?",
    [slug],
  );
  if (!game) throw new HttpError(404, "Game not found.", "not_found");
  if (game.publication_status !== "published") {
    throw new HttpError(403, "This game is not published yet.", "not_published");
  }
  return game;
}

export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!consume(`sdk:score:${user.id}:${clientIp(request)}`, 60, 60_000).ok) {
    throw new HttpError(429, "Slow down — too many score submissions.", "rate_limited");
  }

  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const input = await parseBody(request, scoreSchema);
  const result = await submitScore({
    userId: user.id,
    gameId: game.id,
    score: input.score,
    board: input.board,
    direction: input.direction,
  });
  return json(result);
});

export const GET = route(async (request: NextRequest, context) => {
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const board = request.nextUrl.searchParams.get("board") ?? undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);

  // Viewing a leaderboard never requires an account; identifying yourself adds `me`.
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  const result = await getLeaderboard({ gameId: game.id, board, limit, viewerId: user?.id });
  return json({ game: game.slug, ...result });
});
