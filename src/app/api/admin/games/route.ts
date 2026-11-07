import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { listAdminGames, createGame, PublicationBlocked } from "@/lib/admin-games";
import { gameInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  await requireAdmin();
  const params = request.nextUrl.searchParams;
  const games = await listAdminGames({
    query: params.get("q") ?? undefined,
    status: params.get("status") ?? undefined,
  });
  return json({ games });
});

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await parseBody(request, gameInputSchema);

  try {
    const id = await createGame(input, admin.id);
    await logAdminAction({
      adminId: admin.id,
      action: "game.create",
      entityType: "game",
      entityId: id,
      metadata: { title: input.title, status: input.publicationStatus },
      ip: clientIp(request),
    });
    return json({ ok: true, id }, 201);
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
