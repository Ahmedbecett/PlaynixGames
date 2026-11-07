/**
 * Rewarded-ad unlocks (server-side policy).
 *
 * A watched ad grants access to **one premium game for a few minutes** — never a
 * subscription. The grant is stored in `ad_reward_passes`, capped per rolling 24
 * hours, and always checked on the server; the client only reports that the ad
 * promise resolved.
 *
 * Honest limitation: the Monetag SDK runs in the browser, so "the ad was
 * watched" cannot be cryptographically proven the way a Stars payment can. The
 * design therefore caps the upside (per-game, minutes, N per day) instead of
 * pretending the signal is trustworthy.
 */
import crypto from "node:crypto";
import { one, run, all } from "./db";
import { adsPublicConfig } from "./ads-shared";
import { nowIso } from "./time";

function policyInt(name: string, fallback: number, minimum: number): number {
  const parsed = Number(process.env[name]);
  if (process.env[name] === undefined || process.env[name] === "" || !Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.floor(parsed));
}

/** Minutes and caps must stay ≥ 1; the cooldown may legitimately be 0. */
const positiveInt = (name: string, fallback: number) => policyInt(name, fallback, 1);

export type AdsPolicy = {
  enabled: boolean;
  zoneId: string | null;
  sdkUrl: string;
  /** Minutes of premium access granted per watched ad. */
  rewardMinutes: number;
  /** Maximum ad unlocks per user per rolling 24 h. */
  dailyLimit: number;
  /** Seconds a user must wait between two unlocks (anti-spam). */
  cooldownSeconds: number;
};

export function adsPolicy(): AdsPolicy {
  const config = adsPublicConfig();
  return {
    enabled: config.enabled,
    zoneId: config.zoneId,
    sdkUrl: config.sdkUrl,
    rewardMinutes: positiveInt("ADS_REWARD_MINUTES", 20),
    dailyLimit: positiveInt("ADS_DAILY_LIMIT", 3),
    cooldownSeconds: policyInt("ADS_COOLDOWN_SECONDS", 45, 0),
  };
}

export type AdPass = {
  id: string;
  game_id: string;
  expires_at: string;
  created_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Unlocks used in the last 24 h (rolling window, matches `dailyLimit`). */
export async function adUnlocksUsed(userId: string, since = new Date(Date.now() - DAY_MS).toISOString()) {
  const row = await one<{ count: number | string }>(
    "SELECT COUNT(*) AS count FROM ad_reward_passes WHERE user_id = ? AND created_at > ?",
    [userId, since],
  );
  return Number(row?.count ?? 0);
}

/** The newest unexpired pass for a game, if any. */
export async function activeAdPass(userId: string, gameId: string): Promise<AdPass | null> {
  return one<AdPass>(
    "SELECT id, game_id, created_at, expires_at FROM ad_reward_passes WHERE user_id = ? AND game_id = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
    [userId, gameId, nowIso()],
  );
}

export async function activeAdPasses(userId: string): Promise<AdPass[]> {
  return all<AdPass>(
    "SELECT id, game_id, created_at, expires_at FROM ad_reward_passes WHERE user_id = ? AND expires_at > ? ORDER BY expires_at ASC",
    [userId, nowIso()],
  );
}

export type UnlockResult =
  | { ok: true; pass: AdPass; remaining: number; reused: boolean }
  | { ok: false; reason: "disabled" | "limit_reached" | "cooldown"; retryAfterSeconds?: number };

/**
 * Grants (or reuses) an unlock for one game.
 * Reuses an existing pass instead of burning a second ad for the same window.
 */
export async function grantAdUnlock(
  userId: string,
  gameId: string,
  options: { policy?: AdsPolicy } = {},
): Promise<UnlockResult> {
  const policy = options.policy ?? adsPolicy();
  if (!policy.enabled) return { ok: false, reason: "disabled" };

  const existing = await activeAdPass(userId, gameId);
  if (existing) {
    return { ok: true, pass: existing, remaining: Math.max(0, policy.dailyLimit - (await adUnlocksUsed(userId))), reused: true };
  }

  const last = await one<{ created_at: string }>(
    "SELECT created_at FROM ad_reward_passes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    const cooldown = policy.cooldownSeconds * 1000;
    if (elapsed >= 0 && elapsed < cooldown) {
      return { ok: false, reason: "cooldown", retryAfterSeconds: Math.ceil((cooldown - elapsed) / 1000) };
    }
  }

  const used = await adUnlocksUsed(userId);
  if (used >= policy.dailyLimit) return { ok: false, reason: "limit_reached" };

  const now = new Date();
  const pass: AdPass = {
    id: crypto.randomUUID(),
    game_id: gameId,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + policy.rewardMinutes * 60_000).toISOString(),
  };
  await run(
    "INSERT INTO ad_reward_passes (id, user_id, game_id, source, zone, created_at, expires_at) VALUES (?, ?, ?, 'monetag', ?, ?, ?)",
    [pass.id, userId, gameId, policy.zoneId, pass.created_at, pass.expires_at],
  );
  return { ok: true, pass, remaining: Math.max(0, policy.dailyLimit - used - 1), reused: false };
}

/** Premium access = paid subscription **or** a valid ad pass for this exact game. */
export async function canPlayPremiumGame(
  userId: string,
  gameId: string,
  isSubscribed: boolean,
): Promise<boolean> {
  if (isSubscribed) return true;
  return Boolean(await activeAdPass(userId, gameId));
}

/** Admin-facing summary: unlocks in the last 24 h and how long they last. */
export async function adUnlockStats() {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [total, users] = await Promise.all([
    one<{ count: number | string }>("SELECT COUNT(*) AS count FROM ad_reward_passes WHERE created_at > ?", [since]),
    one<{ count: number | string }>("SELECT COUNT(DISTINCT user_id) AS count FROM ad_reward_passes WHERE created_at > ?", [since]),
  ]);
  const policy = adsPolicy();
  return {
    enabled: policy.enabled,
    zoneId: policy.zoneId,
    rewardMinutes: policy.rewardMinutes,
    dailyLimit: policy.dailyLimit,
    unlocks24h: Number(total?.count ?? 0),
    users24h: Number(users?.count ?? 0),
  };
}
