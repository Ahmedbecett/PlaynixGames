/**
 * Deploy-time bootstrap, wired as `prebuild`.
 *
 * On a host with DATABASE_URL (Vercel + Postgres) it applies the idempotent
 * schema and tops the catalog up, so a fresh deployment works without anyone
 * opening a terminal.
 *
 * The seed is insert-only: `ON CONFLICT DO NOTHING` per row, so existing games,
 * plans and admin edits are never overwritten. That is what makes it safe to run
 * on every deploy — new bundled games appear, existing ones stay untouched.
 *
 * Without DATABASE_URL (local SQLite development) it exits quietly: the schema
 * is created lazily on the first request.
 */
import { all, ensureSchema } from "../src/lib/db";
import { seedCatalog } from "./seed-catalog";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[playnix] DATABASE_URL is empty — skipping schema bootstrap (local SQLite will self-initialise).");
    return;
  }

  await ensureSchema();
  console.log("[playnix] Schema is up to date.");

  const rows = await all<{ total: unknown }>("SELECT COUNT(*) AS total FROM games");
  const existing = Number(rows[0]?.total ?? 0);

  const inserted = await seedCatalog();
  const after = await all<{ total: unknown }>("SELECT COUNT(*) AS total FROM games");
  const total = Number(after[0]?.total ?? 0);

  if (existing === 0) {
    console.log(`[playnix] Empty catalog — seeded ${inserted} rows (${total} games).`);
  } else if (inserted > 0) {
    console.log(`[playnix] Catalog top-up: ${inserted} new rows added (${existing} → ${total} games).`);
  } else {
    console.log(`[playnix] Catalog already complete (${total} games) — nothing to add.`);
  }
}

main().catch((error) => {
  console.error("[playnix] Database bootstrap failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
