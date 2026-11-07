import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { run } from "@/lib/db";
import { nowIso } from "@/lib/time";
import { adPlacementInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await parseBody(request, adPlacementInputSchema);

  const changes = await run(
    "UPDATE ad_placements SET enabled = ?, image_url = ?, target_url = ?, updated_at = ? WHERE key = ?",
    [input.enabled ? 1 : 0, input.imageUrl || null, input.targetUrl || null, nowIso(), input.key],
  );
  if (changes === 0) throw new HttpError(404, "Placement not found.", "not_found");

  await logAdminAction({
    adminId: admin.id,
    action: `ad_placement.${input.enabled ? "enable" : "disable"}`,
    entityType: "ad_placement",
    entityId: input.key,
    ip: clientIp(request),
  });
  return json({ ok: true });
});
