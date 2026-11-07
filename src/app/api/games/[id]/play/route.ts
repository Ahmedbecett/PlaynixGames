import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, requireUser, route } from "@/lib/api";
import { getActiveSubscription } from "@/lib/auth";
import { one, run } from "@/lib/db";
import type { GameRow } from "@/lib/games";
import { consume } from "@/lib/rate-limit";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!consume(`play:${user.id}:${clientIp(request)}`, 30, 60_000).ok) {
    throw new HttpError(429, "Too many launches. Slow down a little.", "rate_limited");
  }

  const { id } = await context.params;
  const game = await one<GameRow>("SELECT * FROM games WHERE id = ?", [id]);
  if (!game || game.publication_status !== "published") {
    throw new HttpError(404, "Game not found.", "not_found");
  }
  if (game.game_type !== "html5" || !game.game_url) {
    throw new HttpError(409, "This game cannot be launched inside Telegram.", "not_playable");
  }
  if (game.pricing_type === "premium") {
    const subscription = await getActiveSubscription(user.id);
    if (!subscription) throw new HttpError(402, "Premium membership is required for this game.", "premium_required");
  }

  const sessionId = crypto.randomUUID();
  const now = nowIso();
  await run(
    "INSERT INTO play_history (id, user_id, game_id, started_at, source) VALUES (?, ?, ?, ?, 'mini_app')",
    [sessionId, user.id, game.id, now],
  );
  await run("UPDATE games SET play_count = play_count + 1 WHERE id = ?", [game.id]);

  return json({ sessionId, startedAt: now });
});
