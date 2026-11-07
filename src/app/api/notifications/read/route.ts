import { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, json, parseBody, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { nowIso } from "@/lib/time";

const schema = z.object({ notificationId: z.string().uuid().optional() });

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await getCurrentUser();
  if (!user) return json({ ok: true });
  const { notificationId } = await parseBody(request, schema).catch(() => ({ notificationId: undefined }));

  const rows = notificationId
    ? await all<{ id: string }>("SELECT id FROM notifications WHERE id = ?", [notificationId])
    : await all<{ id: string }>("SELECT id FROM notifications WHERE audience = 'all' OR user_id = ?", [user.id]);

  const now = nowIso();
  for (const row of rows) {
    await run(
      `INSERT INTO user_notification_reads (user_id, notification_id, read_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id, notification_id) DO NOTHING`,
      [user.id, row.id, now],
    );
  }
  return json({ ok: true, marked: rows.length });
});
