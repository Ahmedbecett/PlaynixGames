import { NextRequest } from "next/server";
import { z } from "zod";
import { json, requireUser, route } from "@/lib/api";
import { one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const schema = z.object({ durationMs: z.number().int().min(0).max(86_400_000).optional() });

export const POST = route(async (request: NextRequest, context) => {
  const user = await requireUser();
  const { sessionId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body ?? {});
  const durationMs = parsed.success ? (parsed.data.durationMs ?? 0) : 0;

  const session = await one<{ id: string; user_id: string; started_at: string }>(
    "SELECT id, user_id, started_at FROM play_history WHERE id = ?",
    [sessionId],
  );
  if (!session || session.user_id !== user.id) return json({ ok: true });

  const elapsed = Date.now() - new Date(session.started_at).getTime();
  const duration = Math.max(0, Math.min(durationMs || elapsed, 12 * 60 * 60 * 1000));
  await run("UPDATE play_history SET ended_at = ?, duration = ? WHERE id = ?", [nowIso(), duration, sessionId]);
  return json({ ok: true, duration });
});
