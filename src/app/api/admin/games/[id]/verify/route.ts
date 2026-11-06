import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, route, requireAdmin } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";
import { verifyGameUrl } from "@/lib/verify-game";

export const dynamic = "force-dynamic";

/**
 * Server-side launch check: reachability, https, embeddability (frame headers).
 * A passing run stamps games.verified_at which the catalog uses as a trust badge.
 */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;

  const game = await one<{ id: string; game_url: string | null; title: string }>(
    "SELECT id, game_url, title FROM games WHERE id = ?",
    [id],
  );
  if (!game) throw new HttpError(404, "Game not found.", "not_found");
  if (!game.game_url) throw new HttpError(422, "This game has no launch URL.", "missing_url");

  const result = await verifyGameUrl(game.game_url);
  if (result.ok) {
    await run("UPDATE games SET verified_at = ?, updated_at = ? WHERE id = ?", [nowIso(), nowIso(), id]);
  }

  await logAdminAction({
    adminId: admin.id,
    action: result.ok ? "game.verify.pass" : "game.verify.fail",
    entityType: "game",
    entityId: id,
    metadata: { url: game.game_url, checks: result.checks },
    ip: clientIp(request),
  });

  return json({ ok: result.ok, checks: result.checks });
});
