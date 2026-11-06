import crypto from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "./env";
import { one, run } from "./db";
import { nowIso } from "./time";

export const SESSION_COOKIE = "playnix_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type Role = "user" | "moderator" | "admin";

export type SessionPayload = {
  uid: string;
  tg: string;
  role: Role;
  iat: number;
  exp: number;
};

export type User = {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  language: string;
  role: Role;
  status: string;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", env.sessionSecret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(user: Pick<User, "id" | "telegram_id" | "role">): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  return signPayload({
    uid: user.id,
    tg: user.telegram_id,
    role: user.role,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  });
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", env.sessionSecret).update(body).digest("base64url");
  if (!safeEqual(mac, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload?.uid || !payload?.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  try {
    const store = await cookies();
    return verifySessionToken(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
});

/** Current user is resolved per request and memoised. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await one<User>("SELECT * FROM users WHERE id = ?", [session.uid]);
  if (!user) return null;
  if (user.status === "suspended" || user.status === "deleted") return user;
  return user;
});

export function isAdmin(user: User | null): boolean {
  return Boolean(user && user.role === "admin" && user.status === "active");
}

export function isActiveUser(user: User | null): boolean {
  return Boolean(user && user.status === "active");
}

export async function getActiveSubscription(userId: string) {
  return one<{
    id: string;
    user_id: string;
    plan_id: string | null;
    status: string;
    started_at: string;
    expires_at: string;
  }>(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
    [userId, nowIso()],
  );
}

export const getPremiumStatus = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return { premium: false, subscription: null };
  const subscription = await getActiveSubscription(user.id);
  return { premium: Boolean(subscription), subscription };
});

/** Issues the admin role to Telegram IDs listed in ADMIN_TELEGRAM_IDS. */
export function roleForTelegramId(telegramId: string, fallback: Role = "user"): Role {
  return env.adminTelegramIds.includes(telegramId) ? "admin" : fallback;
}

export async function touchLastSeen(userId: string): Promise<void> {
  await run("UPDATE users SET last_seen_at = ? WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)", [
    nowIso(),
    userId,
    new Date(Date.now() - 5 * 60_000).toISOString(),
  ]);
}

export function publicUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegram_id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    photoUrl: user.photo_url,
    language: user.language,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
  };
}
