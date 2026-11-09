import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, json, requireUser, route } from "@/lib/api";
import { getDeveloperByUser, getOwnedGame, updateSubmittedGame } from "@/lib/developers";
import { run } from "@/lib/db";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

/** POST — sends an owned game back into the review queue. */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const developer = await getDeveloperByUser(user.id);
  if (!developer) throw new HttpError(403, "Not a developer.", "not_a_developer");

  const { id } = await context.params;
  const game = await getOwnedGame(developer.id, id);
  if (!game) throw new HttpError(404, "Game not found.", "not_found");
  if (game.publication_status === "disabled") {
    throw new HttpError(403, "This game was disabled by the platform.", "disabled");
  }
  if (developer.status !== "approved") {
    throw new HttpError(403, "Your developer account is not approved.", "not_approved");
  }

  // An edit clears the old note and re-stamps the submission time.
  await updateSubmittedGame(developer, game.id, {});
  await run("UPDATE games SET publication_status = 'pending', updated_at = ? WHERE id = ?", [nowIso(), game.id]);
  return json({ ok: true, status: "pending" });
});
