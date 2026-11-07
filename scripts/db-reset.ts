/**
 * Development-only destructive reset.
 * Requires the explicit flag `--yes` and refuses to run against PostgreSQL
 * unless PLAYNUX_ALLOW_REMOTE_RESET=true is set.
 */
import { dialect, ensureSchema, run } from "../src/lib/db";

const TABLES = [
  "user_notification_reads",
  "notifications",
  "telegram_updates",
  "search_queries",
  "game_suggestions",
  "admin_logs",
  "game_reports",
  "payments",
  "subscriptions",
  "reviews",
  "play_history",
  "favorites",
  "game_images",
  "ad_campaigns",
  "banners",
  "announcements",
  "ad_placements",
  "games",
  "plans",
  "categories",
  "users",
  "app_settings",
];

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("Refusing to reset: pass --yes to confirm.");
    process.exit(1);
  }
  if (dialect === "postgres" && process.env.PLAYNIX_ALLOW_REMOTE_RESET !== "true") {
    console.error("Refusing to reset a PostgreSQL database. Set PLAYNIX_ALLOW_REMOTE_RESET=true to override.");
    process.exit(1);
  }
  await ensureSchema();
  for (const table of TABLES) {
    await run(`DELETE FROM ${table}`);
  }
  console.log(`Reset ${TABLES.length} tables on ${dialect}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
