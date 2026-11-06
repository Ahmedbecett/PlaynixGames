import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, clientIp, json, route } from "@/lib/api";
import { createSessionToken, roleForTelegramId, setSessionCookie, type User } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { normaliseLocale } from "@/lib/i18n";
import { consume } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { nowIso } from "@/lib/time";
import { validateInitData, TelegramError } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest) => {
  const ip = clientIp(request);
  const limit = consume(`auth:${ip}`, 30, 60_000);
  if (!limit.ok) throw new HttpError(429, "Too many sign-in attempts. Try again shortly.", "rate_limited");

  if (!env.botConfigured) {
    throw new HttpError(503, "Telegram authentication is not configured on this server.", "not_configured");
  }

  const body = (await request.json().catch(() => null)) as { initData?: unknown } | null;
  const initData = typeof body?.initData === "string" ? body.initData : "";
  if (!initData) throw new HttpError(400, "initData is required.", "bad_request");

  let validated;
  try {
    validated = validateInitData(initData);
  } catch (error) {
    if (error instanceof TelegramError) {
      throw new HttpError(error.code === "expired" ? 401 : 403, error.message, error.code);
    }
    throw error;
  }

  const tgUser = validated.user;
  const telegramId = String(tgUser.id);
  const now = nowIso();
  const existing = await one<User>("SELECT * FROM users WHERE telegram_id = ?", [telegramId]);
  const enforcedRole = roleForTelegramId(telegramId, existing?.role ?? "user");

  let userId: string;
  let created = false;

  if (!existing) {
    userId = crypto.randomUUID();
    created = true;
    await run(
      `INSERT INTO users (id, telegram_id, username, first_name, last_name, photo_url, language, role, status, created_at, updated_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        userId,
        telegramId,
        tgUser.username ?? null,
        tgUser.first_name,
        tgUser.last_name ?? null,
        tgUser.photo_url ?? null,
        normaliseLocale(tgUser.language_code),
        enforcedRole,
        now,
        now,
        now,
      ],
    );
  } else {
    userId = existing.id;
    await run(
      `UPDATE users SET username = ?, first_name = ?, last_name = ?, photo_url = ?, role = ?, updated_at = ?, last_seen_at = ? WHERE id = ?`,
      [
        tgUser.username ?? existing.username,
        tgUser.first_name ?? existing.first_name,
        tgUser.last_name ?? existing.last_name,
        tgUser.photo_url ?? existing.photo_url,
        enforcedRole,
        now,
        now,
        userId,
      ],
    );
  }

  const user = await one<User>("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) throw new HttpError(500, "User could not be resolved.", "internal_error");
  if (user.status !== "active") throw new HttpError(403, "This account is suspended.", "suspended");

  await setSessionCookie(createSessionToken(user));

  return json({
    user: {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_url,
      language: user.language,
      role: user.role,
    },
    created,
  });
});
