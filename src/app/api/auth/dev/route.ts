import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, json, route } from "@/lib/api";
import { createSessionToken, setSessionCookie, type User } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { env } from "@/lib/env";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

const PREVIEW_TELEGRAM_ID = "preview-local";

/**
 * Development-only preview sign-in so the Mini App can be reviewed outside
 * Telegram. Hard-disabled when NODE_ENV=production or ALLOW_DEV_LOGIN is unset.
 */
export const POST = route(async (_request: NextRequest) => {
  if (!env.allowDevLogin) throw new HttpError(404, "Not found.", "not_found");

  const now = nowIso();
  let user = await one<User>("SELECT * FROM users WHERE telegram_id = ?", [PREVIEW_TELEGRAM_ID]);
  if (!user) {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO users (id, telegram_id, username, first_name, photo_url, language, role, status, created_at, updated_at, last_seen_at)
       VALUES (?, ?, ?, ?, NULL, 'en', 'admin', 'active', ?, ?, ?)`,
      [id, PREVIEW_TELEGRAM_ID, "preview", "Preview player", now, now, now],
    );
    user = await one<User>("SELECT * FROM users WHERE id = ?", [id]);
  }
  if (!user) throw new HttpError(500, "Preview user could not be created.", "internal_error");

  await setSessionCookie(createSessionToken(user));
  return json({ ok: true, preview: true });
});
