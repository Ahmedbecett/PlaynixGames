import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { nowIso } from "@/lib/time";
import { suggestionInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  if (!consume(`suggest:${clientIp(request)}`, 5, 60 * 60_000).ok) {
    throw new HttpError(429, "Too many suggestions from this device. Please try again later.", "rate_limited");
  }
  const user = await getCurrentUser();
  const { title, url, note } = await parseBody(request, suggestionInputSchema);

  await run(
    `INSERT INTO game_suggestions (id, user_id, title, url, note, status, created_at) VALUES (?, ?, ?, ?, ?, 'new', ?)`,
    [crypto.randomUUID(), user?.id ?? null, title.trim(), url || null, note?.trim() || null, nowIso()],
  );

  return json({ ok: true });
});
