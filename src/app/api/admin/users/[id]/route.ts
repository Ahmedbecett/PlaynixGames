import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().max(300).optional(),
});

export const PATCH = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { status, reason } = await parseBody(request, schema);

  const target = await one<{ id: string; role: string }>("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!target) throw new HttpError(404, "User not found.", "not_found");
  if (target.role === "admin" && status === "suspended") {
    throw new HttpError(403, "Administrators cannot be suspended from the dashboard.", "forbidden");
  }

  await run("UPDATE users SET status = ?, suspended_reason = ?, updated_at = ? WHERE id = ?", [
    status,
    status === "suspended" ? reason ?? null : null,
    nowIso(),
    id,
  ]);
  await logAdminAction({
    adminId: admin.id,
    action: `user.${status}`,
    entityType: "user",
    entityId: id,
    metadata: { reason },
    ip: clientIp(request),
  });
  return json({ ok: true });
});
