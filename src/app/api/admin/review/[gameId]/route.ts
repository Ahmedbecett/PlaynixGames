import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, json, parseBody, requireAdmin, route } from "@/lib/api";
import { reviewGame } from "@/lib/developers";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "reject", "request_changes", "disable"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** POST — record a moderation decision on a submitted game. */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { gameId } = await context.params;
  const input = await parseBody(request, schema);

  const result = await reviewGame({
    gameId,
    reviewerId: admin.id,
    action: input.action,
    note: input.note || undefined,
  });

  await logAdminAction({
    adminId: admin.id,
    action: `review.${input.action}`,
    entityType: "game",
    entityId: gameId,
    metadata: { note: input.note || null },
  });

  return json({ ok: true, ...result });
});
