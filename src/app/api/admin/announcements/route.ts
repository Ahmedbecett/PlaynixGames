import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { broadcast } from "@/lib/bot";
import { run } from "@/lib/db";
import { env } from "@/lib/env";
import { nowIso } from "@/lib/time";
import { notificationInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = notificationInputSchema.extend({ broadcast: z.boolean().default(false) });

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await parseBody(request, schema);

  const id = crypto.randomUUID();
  const now = nowIso();
  await run(
    `INSERT INTO notifications (id, title, body, url, audience, created_at) VALUES (?, ?, ?, ?, 'all', ?)`,
    [id, input.title, input.body || null, input.url || null, now],
  );
  await run(`INSERT INTO announcements (id, title, body, locale, active, created_at) VALUES (?, ?, ?, 'en', 1, ?)`, [
    id,
    input.title,
    input.body || "",
    now,
  ]);

  let broadcastResult: { sent: number; failed: number } | null = null;
  if (input.broadcast) {
    if (!env.botConfigured) throw new HttpError(503, "Bot token missing; cannot broadcast.", "not_configured");
    broadcastResult = await broadcast(`<b>${input.title}</b>\n\n${input.body ?? ""}`);
  }

  await logAdminAction({
    adminId: admin.id,
    action: "announcement.create",
    entityType: "notification",
    entityId: id,
    metadata: { broadcast: input.broadcast, ...(broadcastResult ?? {}) },
    ip: clientIp(request),
  });

  return json({ ok: true, id, broadcast: broadcastResult }, 201);
});
