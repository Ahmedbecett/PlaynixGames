import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, requireUser, route } from "@/lib/api";
import { one } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { deleteCloudSave, readCloudSave, writeCloudSave } from "@/lib/progression";
import { z } from "zod";

export const dynamic = "force-dynamic";

const writeSchema = z.object({
  slot: z.string().trim().max(32).optional(),
  payload: z.unknown(),
  expectedRevision: z.number().int().min(0).optional(),
});

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

/** GET /api/sdk/<slug>/save?slot=default — read the player's save. */
export const GET = route(async (request: NextRequest, context) => {
  const user = await requireUser();
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const slot = request.nextUrl.searchParams.get("slot") ?? undefined;
  const save = await readCloudSave({ userId: user.id, gameId: game.id, slot });
  return json({ game: game.slug, save });
});

/** PUT — create or overwrite a save slot. */
export const PUT = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!consume(`sdk:save:${user.id}:${clientIp(request)}`, 60, 60_000).ok) {
    throw new HttpError(429, "Too many saves. Slow down.", "rate_limited");
  }
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const input = await request.json().catch(() => {
    throw new HttpError(400, "Request body is not valid JSON.", "bad_request");
  });
  const body = writeSchema.parse(input);
  const save = await writeCloudSave({
    userId: user.id,
    gameId: game.id,
    slot: body.slot,
    payload: body.payload,
    expectedRevision: body.expectedRevision,
  });
  return json({ game: game.slug, save });
});

/** DELETE — remove a save slot (used by "reset progress"). */
export const DELETE = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { slug } = await context.params;
  const game = await gameBySlug(slug);
  const slot = request.nextUrl.searchParams.get("slot") ?? undefined;
  const deleted = await deleteCloudSave({ userId: user.id, gameId: game.id, slot });
  return json({ game: game.slug, deleted });
});
