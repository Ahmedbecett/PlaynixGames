import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { all, run } from "@/lib/db";
import { nowIso } from "@/lib/time";
import { planInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return json({ plans: await all("SELECT * FROM plans ORDER BY sort_order ASC") });
});

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await parseBody(request, planInputSchema);
  const id = crypto.randomUUID();
  await run(
    `INSERT INTO plans (id, name, name_ar, name_fr, description, price, currency, duration_days, features, status, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'XTR', ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.nameAr || null,
      input.nameFr || null,
      input.description || null,
      input.price,
      input.durationDays,
      JSON.stringify(input.features),
      input.status,
      99,
      nowIso(),
    ],
  );
  await logAdminAction({ adminId: admin.id, action: "plan.create", entityType: "plan", entityId: id, metadata: { name: input.name }, ip: clientIp(request) });
  return json({ ok: true, id }, 201);
});

export const PUT = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!body?.id || (body.status !== "active" && body.status !== "inactive")) {
    throw new HttpError(422, "Provide a plan id and a valid status.", "validation_error");
  }
  await run("UPDATE plans SET status = ? WHERE id = ?", [body.status, body.id]);
  await logAdminAction({ adminId: admin.id, action: `plan.${body.status}`, entityType: "plan", entityId: body.id, ip: clientIp(request) });
  return json({ ok: true });
});
