import { all, dialect, ensureSchema } from "../src/lib/db";

async function main() {
  await ensureSchema();
  const tables = await all<{ name: string }>(
    dialect === "sqlite"
      ? "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      : "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  console.log(`Migration complete on ${dialect}. ${tables.length} tables:`);
  console.log(tables.map((t) => ` - ${t.name}`).join("\n"));
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
