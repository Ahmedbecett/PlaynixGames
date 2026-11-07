import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, json, parseBody, requireUser, route } from "@/lib/api";
import { one, run } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { nowIso } from "@/lib/time";
import { reportInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await context.params;
  const { reason, details } = await parseBody(request, reportInputSchema);

  if (!consume(`report:${user.id}`, 10, 60 * 60_000).ok) {
    throw new HttpError(429, "Too many reports. Please try again later.", "rate_limited");
  }

  const game = await one<{ id: string }>("SELECT id FROM games WHERE id = ?", [id]);
  if (!game) throw new HttpError(404, "Game not found.", "not_found");

  await run(
    `INSERT INTO game_reports (id, user_id, game_id, reason, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    [crypto.randomUUID(), user.id, id, reason, details?.trim() || null, nowIso()],
  );

  return json({ ok: true });
});
