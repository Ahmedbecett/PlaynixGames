import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, requireUser, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { defineAchievements, listAchievements, unlockAchievement } from "@/lib/progression";
import { z } from "zod";

export const dynamic = "force-dynamic";

const defineSchema = z.object({
  achievements: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(300).optional(),
        points: z.number().int().min(0).max(1000).optional(),
      }),
    )
    .max(100),
});

const unlockSchema = z.object({ key: z.string().trim().min(1).max(64) });

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

/** GET — the achievement list, with the caller's unlocked state when signed in. */
export const GET = route(async (_request: NextRequest, context) => {
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const user = await getCurrentUser();
  const result = await listAchievements(game.id, user?.id);
  return json({ game: game.slug, ...result });
});

/** PUT — declare the achievement catalogue. Signed-in only; definitions are per game. */
export const PUT = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!consume(`sdk:achdef:${user.id}:${clientIp(request)}`, 20, 60_000).ok) {
    throw new HttpError(429, "Too many definition updates.", "rate_limited");
  }
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const body = await request.json().catch(() => null);
  const input = defineSchema.parse(body);
  const result = await defineAchievements(game.id, input.achievements);
  return json(result);
});

/** POST — unlock one achievement for the signed-in player. Idempotent. */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!consume(`sdk:unlock:${user.id}:${clientIp(request)}`, 120, 60_000).ok) {
    throw new HttpError(429, "Too many unlock attempts.", "rate_limited");
  }
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const input = await request.json().catch(() => {
    throw new HttpError(400, "Request body is not valid JSON.", "bad_request");
  });
  const { key } = unlockSchema.parse(input);
  const result = await unlockAchievement({ userId: user.id, gameId: game.id, key });
  return json(result);
});
