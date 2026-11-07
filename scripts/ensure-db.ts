/**
 * Deploy-time bootstrap, wired as `prebuild`.
 *
 * On a host with DATABASE_URL (Vercel + Postgres) it applies the idempotent
 * schema and seeds the catalog the first time, so a fresh deployment works
 * without anyone opening a terminal.
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
  if (existing === 0) {
    console.log("[playnix] Empty catalog — seeding 16 categories, 6 games and 3 plans…");
    await seedCatalog();
  } else {
    console.log(`[playnix] Catalog already has ${existing} game(s) — seed skipped.`);
  }
}

main().catch((error) => {
  console.error("[playnix] Database bootstrap failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
