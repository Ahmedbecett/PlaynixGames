import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";
import { campaignInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await parseBody(request, campaignInputSchema);

  const game = await one<{ id: string }>("SELECT id FROM games WHERE id = ?", [input.gameId]);
  if (!game) throw new HttpError(404, "Game not found.", "not_found");

  const id = crypto.randomUUID();
  await run(
    `INSERT INTO ad_campaigns (id, game_id, name, status, budget_stars, spent_stars, starts_at, ends_at, impressions, clicks, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, 0, ?)`,
    [id, input.gameId, input.name, input.status, input.budgetStars, input.startsAt || null, input.endsAt || null, nowIso()],
  );
  await logAdminAction({ adminId: admin.id, action: "campaign.create", entityType: "ad_campaign", entityId: id, metadata: { name: input.name }, ip: clientIp(request) });
  return json({ ok: true, id }, 201);
});

export const PATCH = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  const schema = z.object({ id: z.string().uuid(), status: z.enum(["draft", "active", "paused", "ended"]) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(422, "Provide a campaign id and status.", "validation_error");

  await run("UPDATE ad_campaigns SET status = ? WHERE id = ?", [parsed.data.status, parsed.data.id]);
  await logAdminAction({ adminId: admin.id, action: `campaign.${parsed.data.status}`, entityType: "ad_campaign", entityId: parsed.data.id, ip: clientIp(request) });
  return json({ ok: true });
});
