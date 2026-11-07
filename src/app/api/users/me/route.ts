import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, json, parseBody, requireUser, route } from "@/lib/api";
import { getActiveSubscription, publicUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { nowIso } from "@/lib/time";
import { profileUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const subscription = await getActiveSubscription(user.id);
  const [played, favorites, history] = await Promise.all([
    one<{ total: unknown }>("SELECT COUNT(DISTINCT game_id) AS total FROM play_history WHERE user_id = ?", [user.id]),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?", [user.id]),
    one<{ total: unknown }>("SELECT COALESCE(SUM(duration), 0) AS total FROM play_history WHERE user_id = ?", [user.id]),
  ]);
  return json({
    user: publicUser(user),
    premium: Boolean(subscription),
    subscription: subscription ? { expiresAt: subscription.expires_at } : null,
    stats: {
      gamesPlayed: Number(played?.total ?? 0),
      favorites: Number(favorites?.total ?? 0),
      totalPlayMs: Number(history?.total ?? 0),
    },
  });
});

export const PATCH = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { language } = await parseBody(request, profileUpdateSchema);
  if (language) {
    await run("UPDATE users SET language = ?, updated_at = ? WHERE id = ?", [language, nowIso(), user.id]);
    const response = json({ ok: true, language });
    response.cookies.set("playnix_locale", language, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
    return response;
  }
  return json({ ok: true });
});

/**
 * Account deletion: personal data is removed and the account is tombstoned.
 * Payment records are retained (legal/accounting obligation) but detached from
 * the profile. The Telegram identity is hashed so the user can start fresh.
 */
export const DELETE = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const now = nowIso();
  await run("DELETE FROM favorites WHERE user_id = ?", [user.id]);
  await run("DELETE FROM play_history WHERE user_id = ?", [user.id]);
  await run("DELETE FROM reviews WHERE user_id = ?", [user.id]);
  await run("DELETE FROM game_reports WHERE user_id = ?", [user.id]);
  await run("DELETE FROM user_notification_reads WHERE user_id = ?", [user.id]);
  await run("UPDATE subscriptions SET status = 'canceled', canceled_at = ? WHERE user_id = ?", [now, user.id]);
  await run(
    `UPDATE users SET status = 'deleted', username = NULL, first_name = NULL, last_name = NULL, photo_url = NULL,
       telegram_id = ?, updated_at = ? WHERE id = ?`,
    [`deleted:${user.id}`, now, user.id],
  );
  const response = json({ ok: true });
  response.cookies.set("playnix_session", "", { path: "/", maxAge: 0 });
  return response;
});
