import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["published", "hidden", "pending"]) });

export const PATCH = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { status } = await parseBody(request, schema);

  const review = await one<{ id: string; game_id: string }>("SELECT id, game_id FROM reviews WHERE id = ?", [id]);
  if (!review) throw new HttpError(404, "Review not found.", "not_found");

  await run("UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?", [status, nowIso(), id]);
  await run(
    `UPDATE games SET
       rating_avg = COALESCE((SELECT AVG(rating) FROM reviews WHERE game_id = ? AND status = 'published'), 0),
       rating_count = (SELECT COUNT(*) FROM reviews WHERE game_id = ? AND status = 'published')
     WHERE id = ?`,
    [review.game_id, review.game_id, review.game_id],
  );

  await logAdminAction({ adminId: admin.id, action: `review.${status}`, entityType: "review", entityId: id, ip: clientIp(request) });
  return json({ ok: true });
});
