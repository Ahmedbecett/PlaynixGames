import { all, ensureSchema, run } from "../src/lib/db";
import { nowIso } from "../src/lib/time";
import { adPlacements, categories, games, plans, settings, stableId } from "./seed-data";

/**
 * Idempotent catalog seed. Existing rows are never overwritten, so an
 * administrator's edits survive re-seeding.
 */
async function main() {
  await ensureSchema();
  const now = nowIso();
  let inserted = 0;

  for (const category of categories) {
    const id = stableId(`category:${category.slug}`);
    const changes = await run(
      `INSERT INTO categories (id, slug, name, name_ar, name_fr, description, description_ar, description_fr, icon, sort_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT (slug) DO NOTHING`,
      [
        id,
        category.slug,
        category.name,
        category.nameAr,
        category.nameFr,
        category.description,
        category.descriptionAr,
        category.descriptionFr,
        category.icon,
        category.sortOrder,
        now,
      ],
    );
    inserted += changes;
  }

  const categoryRows = await all<{ id: string; slug: string; name: string }>("SELECT id, slug, name FROM categories");

  for (const game of games) {
    const id = stableId(`game:${game.slug}`);
    const category = categoryRows.find((row) => row.slug === game.categorySlug);
    const searchText = [game.title, game.shortDescription, game.description, game.developer, game.publisher, category?.name]
      .filter(Boolean)
      .join(" \n ")
      .toLowerCase();
    const changes = await run(
      `INSERT INTO games (id, title, slug, short_description, description, cover_url, developer, publisher, category_id,
        game_url, game_type, source, license, pricing_type, publication_status, featured, released_at,
        supported_devices, controls, languages, orientation, play_count, rating_avg, rating_count, search_text,
        verified_at, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'html5', ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)
       ON CONFLICT (slug) DO NOTHING`,
      [
        id,
        game.title,
        game.slug,
        game.shortDescription,
        game.description,
        game.coverUrl,
        game.developer,
        game.publisher,
        category?.id ?? null,
        `/games/${game.slug}/`,
        game.source,
        game.license,
        game.pricing,
        game.featured ? 1 : 0,
        game.releasedAt,
        "Android, iOS, Telegram Desktop, Telegram Web",
        game.controls,
        game.languages,
        game.orientation,
        searchText,
        now,
        now,
        now,
        now,
      ],
    );
    inserted += changes;

    // Keep the bundled launch path correct without overwriting admin edits.
    await run("UPDATE games SET game_url = ? WHERE slug = ? AND created_by IS NULL", [
      `/games/${game.slug}/index.html`,
      game.slug,
    ]);

    if (changes > 0) {
      for (const [index, screenshot] of game.screenshots.entries()) {
        await run(
          `INSERT INTO game_images (id, game_id, image_url, image_type, sort_order, created_at) VALUES (?, ?, ?, 'screenshot', ?, ?)`,
          [stableId(`image:${game.slug}:${index}`), id, screenshot, index, now],
        );
      }
    }
  }

  for (const plan of plans) {
    inserted += await run(
      `INSERT INTO plans (id, name, name_ar, name_fr, description, price, currency, duration_days, features, status, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'XTR', ?, ?, 'active', ?, ?) ON CONFLICT (id) DO NOTHING`,
      [
        plan.id,
        plan.name,
        plan.nameAr,
        plan.nameFr,
        plan.description,
        plan.price,
        plan.durationDays,
        JSON.stringify(plan.features),
        plan.sortOrder,
        now,
      ],
    );
  }

  for (const placement of adPlacements) {
    inserted += await run(
      `INSERT INTO ad_placements (id, key, label, enabled, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (key) DO NOTHING`,
      [stableId(`ad:${placement.key}`), placement.key, placement.label, placement.enabled, now],
    );
  }

  const heroGame = await all<{ id: string }>("SELECT id FROM games WHERE slug = ?", ["neon-serpent"]);
  if (heroGame[0]) {
    inserted += await run(
      `INSERT INTO banners (id, title, subtitle, image_url, cta_label, cta_url, game_id, badge, active, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?) ON CONFLICT (id) DO NOTHING`,
      [
        stableId("banner:hero"),
        "Neon Serpent",
        "Arcade · Playnix Original",
        "/banners/hero-neon.jpg",
        "featured",
        "/game/neon-serpent",
        heroGame[0].id,
        "Featured",
        now,
      ],
    );
  }

  await run(
    `INSERT INTO announcements (id, title, body, locale, active, created_at) VALUES (?, ?, ?, 'en', 1, ?) ON CONFLICT (id) DO NOTHING`,
    [
      stableId("announcement:welcome"),
      "Playnix is live",
      "Six verified Playnix Originals are ready to play instantly inside Telegram. Search the catalog to find your next game.",
      now,
    ],
  );

  for (const setting of settings) {
    await run(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO NOTHING`, [
      setting.key,
      setting.value,
      now,
    ]);
  }

  const counts = await all<{ table_name: string }>("SELECT 'ok' AS table_name");
  console.log(
    `Seed complete — ${inserted} rows inserted. Games: ${games.length}, categories: ${categories.length}, plans: ${plans.length}. DB reachable: ${counts.length > 0}`,
  );
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
