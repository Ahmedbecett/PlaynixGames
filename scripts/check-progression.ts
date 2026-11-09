/**
 * Offline contract tests for leaderboards, achievements and cloud saves.
 *
 * Runs the real service layer against a throwaway SQLite file, so it proves the
 * rules that matter without a server or a browser:
 *
 *   npm run progression:check
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const tmpDb = path.join(os.tmpdir(), `playnix-progression-${process.pid}.db`);
// Must be set before the db module is imported anywhere.
process.env.SQLITE_PATH = tmpDb;

let passed = 0;
let failed = 0;

function check(ok: boolean, label: string, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
}

async function expectCode(fn: () => Promise<unknown>, code: string, label: string) {
  try {
    await fn();
    check(false, label, "no error thrown");
  } catch (error) {
    const actual = (error as { code?: string }).code ?? "unknown";
    check(actual === code, label, actual);
  }
}

async function main() {
  // Imported here so SQLITE_PATH is already pointing at the throwaway file.
  const { run, ensureSchema } = require("../src/lib/db") as typeof import("../src/lib/db");
  const {
    submitScore,
    getLeaderboard,
    defineAchievements,
    unlockAchievement,
    listAchievements,
    readCloudSave,
    writeCloudSave,
    deleteCloudSave,
    MAX_SAVE_BYTES,
  } = require("../src/lib/progression") as typeof import("../src/lib/progression");

  await ensureSchema();
  const now = new Date().toISOString();
  const GAME = "prog-game";
  const P1 = "prog-user-1";
  const P2 = "prog-user-2";

  for (const [id, tg, name] of [
    [P1, "900001", "Alice"],
    [P2, "900002", "Bob"],
  ]) {
    await run(
      "INSERT INTO users (id, telegram_id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, tg, name, now, now],
    );
  }
  await run(
    "INSERT INTO games (id, title, slug, publication_status, created_at, updated_at) VALUES (?, ?, ?, 'published', ?, ?)",
    [GAME, "Progression Test", "progression-test", now, now],
  );

  console.log("\nLeaderboards");
  const first = await submitScore({ userId: P1, gameId: GAME, score: 100 });
  check(first.best && first.score === 100, "stores the first score", `rank ${first.rank}`);

  const lower = await submitScore({ userId: P1, gameId: GAME, score: 60 });
  check(!lower.best && lower.score === 100, "ignores a lower score on a desc board");

  const higher = await submitScore({ userId: P1, gameId: GAME, score: 240 });
  check(higher.best && higher.score === 240, "replaces it with a higher score");

  await submitScore({ userId: P2, gameId: GAME, score: 500 });
  const board = await getLeaderboard({ gameId: GAME, viewerId: P1 });
  check(board.entries[0]?.name === "Bob", "orders the board by score", board.entries.map((e) => `${e.name}:${e.score}`).join(" "));
  check(board.me?.rank === 2, "reports the viewer's own rank", `rank ${board.me?.rank}`);

  await submitScore({ userId: P1, gameId: GAME, score: 12.5, board: "time", direction: "asc" });
  const slower = await submitScore({ userId: P1, gameId: GAME, score: 30, board: "time" });
  check(!slower.best && slower.score === 12.5, "keeps the fastest time on an asc board");

  console.log("\nAchievements");
  await defineAchievements(GAME, [
    { key: "first-win", name: "First Win", points: 10 },
    { key: "streak-10", name: "On Fire", points: 40 },
  ]);
  const unlocked = await unlockAchievement({ userId: P1, gameId: GAME, key: "first-win" });
  check(unlocked.new && unlocked.points === 10 && unlocked.total === 10, "unlocks and awards points");

  const again = await unlockAchievement({ userId: P1, gameId: GAME, key: "first-win" });
  check(!again.new && again.total === 10, "is idempotent");

  await expectCode(
    () => unlockAchievement({ userId: P1, gameId: GAME, key: "never-declared" }),
    "unknown_achievement",
    "rejects an undeclared achievement",
  );

  await unlockAchievement({ userId: P1, gameId: GAME, key: "streak-10" });
  const listed = await listAchievements(GAME, P1);
  check(listed.points === 50 && listed.achievements.every((a) => a.unlocked), "sums points across achievements", `${listed.points}`);

  const otherPlayer = await listAchievements(GAME, P2);
  check(otherPlayer.achievements.every((a) => !a.unlocked), "does not leak unlocks to another player");

  console.log("\nCloud saves");
  const v1 = await writeCloudSave({ userId: P1, gameId: GAME, payload: { level: 4, coins: 90 } });
  check(v1.revision === 1, "first write is revision 1");

  const v2 = await writeCloudSave({ userId: P1, gameId: GAME, payload: { level: 5 }, expectedRevision: 1 });
  check(v2.revision === 2, "write with a matching revision succeeds");

  await expectCode(
    () => writeCloudSave({ userId: P1, gameId: GAME, payload: { level: 9 }, expectedRevision: 1 }),
    "revision_conflict",
    "rejects a stale revision",
  );

  const loaded = await readCloudSave({ userId: P1, gameId: GAME });
  check((loaded?.payload as { level?: number })?.level === 5, "round-trips the payload");

  await expectCode(
    () => writeCloudSave({ userId: P1, gameId: GAME, payload: { blob: "x".repeat(MAX_SAVE_BYTES + 100) } }),
    "save_too_large",
    "rejects an oversized save",
  );

  check((await readCloudSave({ userId: P2, gameId: GAME })) === null, "keeps saves private per player");

  await writeCloudSave({ userId: P1, gameId: GAME, slot: "bonus", payload: { secret: true } });
  check((await readCloudSave({ userId: P1, gameId: GAME, slot: "bonus" })) !== null, "supports named slots");

  check(await deleteCloudSave({ userId: P1, gameId: GAME, slot: "bonus" }), "deletes a slot");
  check((await readCloudSave({ userId: P1, gameId: GAME, slot: "bonus" })) === null, "deleted slot is gone");

  console.log(`\n${passed} passed, ${failed} failed`);
  fs.rmSync(tmpDb, { force: true });
  fs.rmSync(`${tmpDb}-wal`, { force: true });
  fs.rmSync(`${tmpDb}-shm`, { force: true });
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Progression checks failed:", error);
  process.exit(1);
});
