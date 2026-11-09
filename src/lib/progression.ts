/**
 * Player progression services: leaderboards, achievements and cloud saves.
 *
 * Everything here is server-authoritative. A game running in an iframe never
 * writes to these tables directly — it calls the SDK endpoints, which resolve
 * the player from the signed session cookie and then call into this module.
 * That separation is what makes a score trustworthy.
 */
import crypto from "node:crypto";
import { all, one, run, transaction } from "./db";
import { nowIso } from "./time";
import { DomainError } from "./api";

export type ScoreDirection = "asc" | "desc";

/** Largest payload we accept for one cloud save (bytes of JSON). */
export const MAX_SAVE_BYTES = 64 * 1024;

export class ProgressionError extends DomainError {
  constructor(message: string, status = 400, code = "bad_request") {
    super(message, status, code);
  }
}

/* -------------------------------------------------------------------------- */
/* Leaderboards                                                               */
/* -------------------------------------------------------------------------- */

async function ensureLeaderboard(gameId: string, board: string, direction: ScoreDirection = "desc") {
  const existing = await one<{ id: string; direction: string }>(
    "SELECT id, direction FROM leaderboards WHERE game_id = ? AND board = ?",
    [gameId, board],
  );
  if (existing) return existing;
  const id = crypto.randomUUID();
  await run("INSERT INTO leaderboards (id, game_id, board, direction, created_at) VALUES (?, ?, ?, ?, ?)", [
    id,
    gameId,
    board,
    direction,
    nowIso(),
  ]);
  return { id, direction };
}

/**
 * Records a score for the player.
 *
 * The stored value only ever improves: for a descending board ("higher is
 * better") a lower submission is ignored, and vice versa. Returns whether the
 * score was a personal best, which the client uses to celebrate or stay quiet.
 */
export async function submitScore(params: {
  userId: string;
  gameId: string;
  score: number;
  board?: string;
  direction?: ScoreDirection;
}): Promise<{ score: number; best: boolean; rank: number; total: number; board: string }> {
  const board = params.board ?? "default";
  if (!Number.isFinite(params.score)) throw new ProgressionError("Score must be a finite number.", 422, "invalid_score");

  const leaderboard = await ensureLeaderboard(params.gameId, board, params.direction ?? "desc");
  const direction: ScoreDirection = (leaderboard.direction as ScoreDirection) ?? "desc";

  const current = await one<{ id: string; score: number }>(
    "SELECT id, score FROM leaderboard_scores WHERE leaderboard_id = ? AND user_id = ?",
    [leaderboard.id, params.userId],
  );

  let best = false;
  const now = nowIso();
  if (!current) {
    await run(
      "INSERT INTO leaderboard_scores (id, leaderboard_id, user_id, score, updated_at) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), leaderboard.id, params.userId, params.score, now],
    );
    best = true;
  } else {
    const improves = direction === "asc" ? params.score < Number(current.score) : params.score > Number(current.score);
    if (improves) {
      await run("UPDATE leaderboard_scores SET score = ?, updated_at = ? WHERE id = ?", [params.score, now, current.id]);
      best = true;
    }
  }

  const stored = await one<{ score: number }>(
    "SELECT score FROM leaderboard_scores WHERE leaderboard_id = ? AND user_id = ?",
    [leaderboard.id, params.userId],
  );
  const standing = await rankOf(leaderboard.id, direction, Number(stored?.score ?? params.score));
  return { score: Number(stored?.score ?? params.score), best, rank: standing.rank, total: standing.total, board };
}

async function rankOf(leaderboardId: string, direction: ScoreDirection, score: number) {
  const comparison = direction === "asc" ? "<" : ">";
  const ahead = await one<{ n: unknown }>(
    `SELECT COUNT(*) AS n FROM leaderboard_scores WHERE leaderboard_id = ? AND score ${comparison} ?`,
    [leaderboardId, score],
  );
  const total = await one<{ n: unknown }>("SELECT COUNT(*) AS n FROM leaderboard_scores WHERE leaderboard_id = ?", [
    leaderboardId,
  ]);
  return { rank: Number(ahead?.n ?? 0) + 1, total: Number(total?.n ?? 0) };
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  username: string | null;
  photoUrl: string | null;
  score: number;
  updatedAt: string;
};

/** Top scores for one board, with the caller's own row appended if outside the cut. */
export async function getLeaderboard(params: {
  gameId: string;
  board?: string;
  limit?: number;
  viewerId?: string;
}): Promise<{ board: string; direction: ScoreDirection; entries: LeaderboardEntry[]; me: LeaderboardEntry | null }> {
  const board = params.board ?? "default";
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const leaderboard = await one<{ id: string; direction: string }>(
    "SELECT id, direction FROM leaderboards WHERE game_id = ? AND board = ?",
    [params.gameId, board],
  );
  if (!leaderboard) return { board, direction: "desc", entries: [], me: null };

  const direction = (leaderboard.direction as ScoreDirection) ?? "desc";
  const order = direction === "asc" ? "ASC" : "DESC";
  const rows = await all<{
    user_id: string;
    score: number;
    updated_at: string;
    first_name: string | null;
    username: string | null;
    photo_url: string | null;
  }>(
    `SELECT s.user_id, s.score, s.updated_at, u.first_name, u.username, u.photo_url
     FROM leaderboard_scores s JOIN users u ON u.id = s.user_id
     WHERE s.leaderboard_id = ? AND u.status = 'active'
     ORDER BY s.score ${order}, s.updated_at ASC
     LIMIT ?`,
    [leaderboard.id, limit],
  );

  const entries: LeaderboardEntry[] = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    name: row.first_name ?? row.username ?? "Player",
    username: row.username,
    photoUrl: row.photo_url,
    score: Number(row.score),
    updatedAt: row.updated_at,
  }));

  let me: LeaderboardEntry | null = entries.find((entry) => entry.userId === params.viewerId) ?? null;
  if (!me && params.viewerId) {
    const mine = await one<{ score: number; updated_at: string; first_name: string | null; username: string | null; photo_url: string | null }>(
      `SELECT s.score, s.updated_at, u.first_name, u.username, u.photo_url
       FROM leaderboard_scores s JOIN users u ON u.id = s.user_id
       WHERE s.leaderboard_id = ? AND s.user_id = ?`,
      [leaderboard.id, params.viewerId],
    );
    if (mine) {
      const standing = await rankOf(leaderboard.id, direction, Number(mine.score));
      me = {
        rank: standing.rank,
        userId: params.viewerId,
        name: mine.first_name ?? mine.username ?? "You",
        username: mine.username,
        photoUrl: mine.photo_url,
        score: Number(mine.score),
        updatedAt: mine.updated_at,
      };
    }
  }

  return { board, direction, entries, me };
}

/* -------------------------------------------------------------------------- */
/* Achievements                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Declares the achievements a game can unlock. Called by the game at start-up,
 * so definitions travel with the game instead of needing an admin step.
 */
export async function defineAchievements(
  gameId: string,
  defs: { key: string; name: string; description?: string; points?: number }[],
): Promise<{ defined: number }> {
  if (!Array.isArray(defs) || defs.length === 0) return { defined: 0 };
  if (defs.length > 100) throw new ProgressionError("A game can define at most 100 achievements.", 422, "too_many");

  const now = nowIso();
  let defined = 0;
  for (const def of defs) {
    const key = String(def.key ?? "").trim().slice(0, 64);
    const name = String(def.name ?? "").trim().slice(0, 120);
    if (!key || !name) continue;
    const existing = await one<{ id: string }>("SELECT id FROM achievement_defs WHERE game_id = ? AND key = ?", [
      gameId,
      key,
    ]);
    if (existing) {
      await run("UPDATE achievement_defs SET name = ?, description = ?, points = ? WHERE id = ?", [
        name,
        def.description?.slice(0, 300) ?? null,
        Math.max(0, Math.min(1000, Math.round(def.points ?? 10))),
        existing.id,
      ]);
    } else {
      await run(
        "INSERT INTO achievement_defs (id, game_id, key, name, description, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), gameId, key, name, def.description?.slice(0, 300) ?? null, Math.max(0, Math.min(1000, Math.round(def.points ?? 10))), now],
      );
    }
    defined += 1;
  }
  return { defined };
}

export type UnlockedAchievement = { key: string; name: string; description: string | null; points: number; unlockedAt: string };

/** Unlocks one achievement. Idempotent — a second call returns `new: false`. */
export async function unlockAchievement(params: {
  userId: string;
  gameId: string;
  key: string;
}): Promise<{ new: boolean; total: number; points: number }> {
  const key = params.key.trim().slice(0, 64);
  if (!key) throw new ProgressionError("Achievement key is required.", 422, "invalid_key");

  const def = await one<{ points: number }>("SELECT points FROM achievement_defs WHERE game_id = ? AND key = ?", [
    params.gameId,
    key,
  ]);
  // A game can only grant achievements it declared. Otherwise any client could
  // invent keys and inflate its own points total.
  if (!def) {
    throw new ProgressionError(
      `Achievement "${key}" is not defined for this game. Declare it with defineAchievements() first.`,
      404,
      "unknown_achievement",
    );
  }
  const already = await one<{ id: string }>("SELECT id FROM achievements WHERE user_id = ? AND game_id = ? AND key = ?", [
    params.userId,
    params.gameId,
    key,
  ]);
  if (already) return { new: false, total: await achievementPoints(params.userId), points: Number(def.points) };

  await run("INSERT INTO achievements (id, user_id, game_id, key, unlocked_at) VALUES (?, ?, ?, ?, ?)", [
    crypto.randomUUID(),
    params.userId,
    params.gameId,
    key,
    nowIso(),
  ]);
  return { new: true, total: await achievementPoints(params.userId), points: Number(def.points) };
}

async function achievementPoints(userId: string): Promise<number> {
  const row = await one<{ n: unknown }>(
    `SELECT COALESCE(SUM(d.points), 0) AS n
     FROM achievements a JOIN achievement_defs d ON d.game_id = a.game_id AND d.key = a.key
     WHERE a.user_id = ?`,
    [userId],
  );
  return Number(row?.n ?? 0);
}

export async function listAchievements(
  gameId: string,
  userId?: string,
): Promise<{ achievements: (UnlockedAchievement & { unlocked: boolean })[]; points: number }> {
  const defs = await all<{ key: string; name: string; description: string | null; points: number }>(
    "SELECT key, name, description, points FROM achievement_defs WHERE game_id = ? ORDER BY points ASC, name ASC",
    [gameId],
  );
  if (defs.length === 0) return { achievements: [], points: 0 };

  const unlocked = userId
    ? await all<{ key: string; unlocked_at: string }>(
        "SELECT key, unlocked_at FROM achievements WHERE user_id = ? AND game_id = ?",
        [userId, gameId],
      )
    : [];
  const unlockedMap = new Map(unlocked.map((row) => [row.key, row.unlocked_at]));

  return {
    achievements: defs.map((def) => ({
      key: def.key,
      name: def.name,
      description: def.description,
      points: Number(def.points),
      unlockedAt: unlockedMap.get(def.key) ?? "",
      unlocked: unlockedMap.has(def.key),
    })),
    points: userId ? await achievementPoints(userId) : 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Cloud saves                                                                */
/* -------------------------------------------------------------------------- */

export type CloudSave = { slot: string; payload: unknown; revision: number; updatedAt: string };

export async function readCloudSave(params: { userId: string; gameId: string; slot?: string }): Promise<CloudSave | null> {
  const slot = params.slot ?? "default";
  const row = await one<{ payload: string; revision: number; updated_at: string }>(
    "SELECT payload, revision, updated_at FROM cloud_saves WHERE user_id = ? AND game_id = ? AND slot = ?",
    [params.userId, params.gameId, slot],
  );
  if (!row) return null;
  let payload: unknown = null;
  try {
    payload = JSON.parse(row.payload);
  } catch {
    payload = null;
  }
  return { slot, payload, revision: Number(row.revision), updatedAt: row.updated_at };
}

/**
 * Overwrites a save slot.
 *
 * `expectedRevision` enables optimistic concurrency: a client that is behind
 * (two devices, two tabs) gets a 409 instead of silently losing its progress.
 */
export async function writeCloudSave(params: {
  userId: string;
  gameId: string;
  slot?: string;
  payload: unknown;
  expectedRevision?: number;
}): Promise<CloudSave> {
  const slot = params.slot ?? "default";
  const serialised = JSON.stringify(params.payload ?? null);
  if (Buffer.byteLength(serialised, "utf8") > MAX_SAVE_BYTES) {
    throw new ProgressionError("Save data is larger than 64 KB.", 413, "save_too_large");
  }

  return transaction(async (tx) => {
    const existing = await tx.one<{ id: string; revision: number }>(
      "SELECT id, revision FROM cloud_saves WHERE user_id = ? AND game_id = ? AND slot = ?",
      [params.userId, params.gameId, slot],
    );

    if (existing && params.expectedRevision !== undefined && Number(existing.revision) !== params.expectedRevision) {
      throw new ProgressionError("This save was changed on another device. Reload before saving.", 409, "revision_conflict");
    }

    const now = nowIso();
    if (!existing) {
      await tx.run(
        "INSERT INTO cloud_saves (id, user_id, game_id, slot, payload, revision, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
        [crypto.randomUUID(), params.userId, params.gameId, slot, serialised, now],
      );
      return { slot, payload: params.payload ?? null, revision: 1, updatedAt: now };
    }

    const revision = Number(existing.revision) + 1;
    await tx.run("UPDATE cloud_saves SET payload = ?, revision = ?, updated_at = ? WHERE id = ?", [
      serialised,
      revision,
      now,
      existing.id,
    ]);
    return { slot, payload: params.payload ?? null, revision, updatedAt: now };
  });
}

export async function deleteCloudSave(params: { userId: string; gameId: string; slot?: string }): Promise<boolean> {
  const changed = await run("DELETE FROM cloud_saves WHERE user_id = ? AND game_id = ? AND slot = ?", [
    params.userId,
    params.gameId,
    params.slot ?? "default",
  ]);
  return changed > 0;
}

/* -------------------------------------------------------------------------- */
/* Player profile across games                                                */
/* -------------------------------------------------------------------------- */

export async function playerProgression(userId: string) {
  const [points, unlocked, boards] = await Promise.all([
    achievementPoints(userId),
    one<{ n: unknown }>("SELECT COUNT(*) AS n FROM achievements WHERE user_id = ?", [userId]),
    one<{ n: unknown }>("SELECT COUNT(*) AS n FROM leaderboard_scores WHERE user_id = ?", [userId]),
  ]);
  return { points, achievements: Number(unlocked?.n ?? 0), leaderboards: Number(boards?.n ?? 0) };
}
