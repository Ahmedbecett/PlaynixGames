import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, json, parseBody, requireUser, route } from "@/lib/api";
import { getDeveloperByUser, listDeveloperGames, submitGame } from "@/lib/developers";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers and dashes."),
  shortDescription: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  categoryId: z.string().trim().optional().or(z.literal("")),
  gameUrl: z.string().trim().min(1).max(2048),
  coverUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  controls: z.string().trim().max(400).optional().or(z.literal("")),
  orientation: z.enum(["any", "portrait", "landscape"]).default("any"),
  screenshots: z.array(z.string().trim().max(2048)).max(8).default([]),
});

/** GET — the caller's submissions. */
export const GET = route(async () => {
  const user = await requireUser();
  const developer = await getDeveloperByUser(user.id);
  if (!developer) throw new HttpError(403, "Join the developer programme first.", "not_a_developer");
  return json({ games: await listDeveloperGames(developer.id) });
});

/** POST — create a submission; always lands in the review queue. */
export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const developer = await getDeveloperByUser(user.id);
  if (!developer) throw new HttpError(403, "Join the developer programme first.", "not_a_developer");

  const input = await parseBody(request, submitSchema);
  const id = await submitGame(developer, {
    title: input.title,
    slug: input.slug,
    shortDescription: input.shortDescription || undefined,
    description: input.description || undefined,
    categoryId: input.categoryId || undefined,
    gameUrl: input.gameUrl,
    coverUrl: input.coverUrl || undefined,
    controls: input.controls || undefined,
    orientation: input.orientation,
    screenshots: input.screenshots,
  });
  return json({ id, status: "pending" }, 201);
});
