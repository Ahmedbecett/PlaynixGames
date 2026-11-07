import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, json, parseBody, requireUser, route } from "@/lib/api";
import { all, one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ gameId: z.string().uuid() });

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await all(
    `SELECT g.*, c.name AS category_name, c.slug AS category_slug, f.created_at AS favorited_at
     FROM favorites f
     JOIN games g ON g.id = f.game_id
     LEFT JOIN categories c ON c.id = g.category_id
     WHERE f.user_id = ? AND g.publication_status = 'published'
     ORDER BY f.created_at DESC`,
    [user.id],
  );
  return json({ favorites: rows });
});

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { gameId } = await parseBody(request, bodySchema);

  const game = await one<{ id: string; publication_status: string }>(
    "SELECT id, publication_status FROM games WHERE id = ?",
    [gameId],
  );
  if (!game || game.publication_status !== "published") {
    throw new HttpError(404, "Game not found.", "not_found");
  }

  await run(
    `INSERT INTO favorites (id, user_id, game_id, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, game_id) DO NOTHING`,
    [crypto.randomUUID(), user.id, gameId, nowIso()],
  );
  return json({ ok: true, favorite: true });
});
