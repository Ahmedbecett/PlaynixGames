import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { PublicationBlocked, updateGame } from "@/lib/admin-games";
import { one, run } from "@/lib/db";
import { gameInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const input = await parseBody(request, gameInputSchema);

  try {
    const updated = await updateGame(id, input);
    if (!updated) throw new HttpError(404, "Game not found.", "not_found");
    await logAdminAction({
      adminId: admin.id,
      action: "game.update",
      entityType: "game",
      entityId: id,
      metadata: { title: input.title, status: input.publicationStatus },
      ip: clientIp(request),
    });
    return json({ ok: true, id });
  } catch (error) {
    if (error instanceof PublicationBlocked) {
      throw new HttpError(422, "Game verification failed. Fix these checks before publishing.", "verification_failed", error.checks);
    }
    if (String(error).includes("UNIQUE") || String(error).includes("duplicate key")) {
      throw new HttpError(409, "That slug is already used by another game.", "slug_taken");
    }
    throw error;
  }
});

export const DELETE = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const game = await one<{ title: string }>("SELECT title FROM games WHERE id = ?", [id]);
  if (!game) throw new HttpError(404, "Game not found.", "not_found");

  await run("DELETE FROM games WHERE id = ?", [id]);
  await logAdminAction({
    adminId: admin.id,
    action: "game.delete",
    entityType: "game",
    entityId: id,
    metadata: { title: game.title },
    ip: clientIp(request),
  });
  return json({ ok: true });
});
