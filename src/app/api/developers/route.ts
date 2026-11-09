import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, json, parseBody, requireUser, route } from "@/lib/api";
import { applyAsDeveloper, getDeveloperByUser, listDeveloperGames } from "@/lib/developers";
import { writeDeveloperApplication } from "@/lib/developers-notify";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  studioUrl: z.string().trim().max(300).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  payoutTelegram: z.string().trim().max(80).optional().or(z.literal("")),
});

/** GET — the caller's developer profile plus their games (empty when not enrolled). */
export const GET = route(async () => {
  const user = await requireUser();
  const developer = await getDeveloperByUser(user.id);
  if (!developer) return json({ developer: null, games: [] });
  const games = await listDeveloperGames(developer.id);
  return json({ developer, games });
});

/** POST — apply to the developer programme. */
export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const input = await parseBody(request, applySchema);

  const developer = await applyAsDeveloper(user.id, input);
  // Pings the maintainers in Telegram so an application is not missed.
  await writeDeveloperApplication(developer).catch(() => undefined);
  return json({ developer }, 201);
});

export const PUT = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const developer = await getDeveloperByUser(user.id);
  if (!developer) throw new HttpError(404, "No developer account.", "not_found");
  const input = await parseBody(request, applySchema.partial());
  const { updateDeveloperProfile } = await import("@/lib/developers");
  await updateDeveloperProfile(developer.id, input);
  return json({ ok: true });
});
