import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { run } from "@/lib/db";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["open", "resolved", "dismissed"]) });

export const PATCH = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { status } = await parseBody(request, schema);

  const changes = await run("UPDATE game_reports SET status = ?, resolved_at = ? WHERE id = ?", [
    status,
    status === "open" ? null : nowIso(),
    id,
  ]);
  if (changes === 0) throw new HttpError(404, "Report not found.", "not_found");

  await logAdminAction({ adminId: admin.id, action: `report.${status}`, entityType: "game_report", entityId: id, ip: clientIp(request) });
  return json({ ok: true });
});
