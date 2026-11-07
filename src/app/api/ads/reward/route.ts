import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireUser, route } from "@/lib/api";
import { getActiveSubscription } from "@/lib/auth";
import { activeAdPasses, adUnlocksUsed, adsPolicy, grantAdUnlock } from "@/lib/ads";
import { one } from "@/lib/db";
import type { GameRow } from "@/lib/games";
import { consume } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ gameId: z.string().min(1).max(64) });

/**
 * `GET /api/ads/reward` — what the UI needs to render the ad option honestly:
 * whether ads are live, how many unlocks are left today and which passes run.
 */
export const GET = route(async () => {
  const user = await requireUser();
  const policy = adsPolicy();
  const [used, passes, subscription] = await Promise.all([
    adUnlocksUsed(user.id),
    activeAdPasses(user.id),
    getActiveSubscription(user.id),
  ]);

  return json({
    enabled: policy.enabled,
    zoneId: policy.zoneId,
    sdkUrl: policy.sdkUrl,
    rewardMinutes: policy.rewardMinutes,
    dailyLimit: policy.dailyLimit,
    remainingToday: Math.max(0, policy.dailyLimit - used),
    premium: Boolean(subscription),
    activePasses: passes.map((pass) => ({ gameId: pass.game_id, expiresAt: pass.expires_at })),
  });
});

/**
 * `POST /api/ads/reward` — called after the ad promise resolves in the browser.
 *
 * The client cannot be trusted to prove an ad was watched, so the upside is
 * bounded: one game, a few minutes, a hard daily cap and a cooldown.
 */
export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { gameId } = await parseBody(request, bodySchema);

  if (!consume(`ads:${user.id}:${clientIp(request)}`, 12, 60_000).ok) {
    throw new HttpError(429, "Too many requests. Please wait a moment.", "rate_limited");
  }

  const policy = adsPolicy();
  if (!policy.enabled) throw new HttpError(503, "Rewarded ads are not configured.", "ads_disabled");

  const game = await one<GameRow>("SELECT * FROM games WHERE id = ? OR slug = ?", [gameId, gameId]);
  if (!game || game.publication_status !== "published") {
    throw new HttpError(404, "Game not found.", "not_found");
  }
  if (game.pricing_type !== "premium") {
    throw new HttpError(409, "This game is already free — no ad needed.", "already_free");
  }

  const subscription = await getActiveSubscription(user.id);
  if (subscription) {
    // Subscribers never watch ads; answer with the entitlement they already have.
    return json({ ok: true, premium: true, alreadySubscribed: true, pass: null });
  }

  const result = await grantAdUnlock(user.id, game.id);
  if (result.ok) {
    return json({
      ok: true,
      premium: false,
      reused: result.reused,
      remainingToday: result.remaining,
      minutes: policy.rewardMinutes,
      pass: { gameId: result.pass.game_id, expiresAt: result.pass.expires_at },
      playUrl: `/play/${game.slug}`,
    });
  }

  if (result.reason === "limit_reached") {
    throw new HttpError(429, "You have used today's ad unlocks. Premium removes the limit.", "ad_limit_reached");
  }
  if (result.reason === "cooldown") {
    throw new HttpError(429, "Give it a few seconds before the next unlock.", "ad_cooldown", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  throw new HttpError(503, "Rewarded ads are not configured.", "ads_disabled");
});
