import { NextRequest } from "next/server";
import { assertSameOrigin, json, requireUser, route } from "@/lib/api";
import { run } from "@/lib/db";

export const dynamic = "force-dynamic";

export const DELETE = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { gameId } = await context.params;
  await run("DELETE FROM favorites WHERE user_id = ? AND game_id = ?", [user.id, gameId]);
  return json({ ok: true, favorite: false });
});
