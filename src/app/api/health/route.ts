import { json, route } from "@/lib/api";
import { all, healthCheck } from "@/lib/db";
import { configStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const database = await healthCheck();
  let published = 0;
  if (database.ok) {
    const rows = await all<{ total: unknown }>(
      "SELECT COUNT(*) AS total FROM games WHERE publication_status = 'published'",
    ).catch(() => []);
    published = Number(rows[0]?.total ?? 0);
  }

  return json(
    {
      ok: database.ok,
      dialect: database.dialect,
      catalog: { publishedGames: published },
      integrations: configStatus(),
      timestamp: new Date().toISOString(),
    },
    database.ok ? 200 : 503,
  );
});
