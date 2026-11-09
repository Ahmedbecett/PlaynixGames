import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, json, requireUser, route } from "@/lib/api";
import { getDeveloperByUser, withdrawGame } from "@/lib/developers";

export const dynamic = "force-dynamic";

/** POST — pulls a game out of the queue (or off the store). */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const developer = await getDeveloperByUser(user.id);
  if (!developer) throw new HttpError(403, "Not a developer.", "not_a_developer");

  const { id } = await context.params;
  await withdrawGame(developer.id, id);
  return json({ ok: true, status: "draft" });
});
