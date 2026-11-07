import crypto from "node:crypto";
import { all, one, run } from "./db";
import { nowIso } from "./time";
import { verifyGameUrl } from "./verify-game";
import type { GameInput } from "./validation";

export type GameListRow = {
  id: string;
  title: string;
  slug: string;
  publication_status: string;
  pricing_type: string;
  game_type: string;
  featured: number;
  play_count: number;
  rating_avg: number;
  rating_count: number;
  cover_url: string | null;
  category_name: string | null;
  game_url: string | null;
  verified_at: string | null;
  updated_at: string;
};

export async function listAdminGames(filters: { query?: string; status?: string }): Promise<GameListRow[]> {
  const clauses: string[] = ["1 = 1"];
  const values: (string | number)[] = [];
  if (filters.query) {
    clauses.push("(g.title LIKE ? OR g.slug LIKE ?)");
    values.push(`%${filters.query}%`, `%${filters.query}%`);
  }
  if (filters.status) {
    clauses.push("g.publication_status = ?");
    values.push(filters.status);
  }
  return all<GameListRow>(
    `SELECT g.id, g.title, g.slug, g.publication_status, g.pricing_type, g.game_type, g.featured,
            g.play_count, g.rating_avg, g.rating_count, g.cover_url, g.game_url, g.verified_at, g.updated_at,
            c.name AS category_name
     FROM games g LEFT JOIN categories c ON c.id = g.category_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY g.updated_at DESC LIMIT 200`,
    values,
  );
}

async function searchTextFor(input: GameInput): Promise<string> {
  const category = input.categoryId
    ? await one<{ name: string }>("SELECT name FROM categories WHERE id = ?", [input.categoryId])
    : null;
  return [
    input.title,
    input.shortDescription,
    input.description,
    input.developer,
    input.publisher,
    category?.name,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

export class PublicationBlocked extends Error {
  constructor(readonly checks: Awaited<ReturnType<typeof verifyGameUrl>>["checks"]) {
    super("Game verification failed. Fix the URL before publishing.");
  }
}

/** Publishing requires a passing verification pass — no unverified games go live. */
export async function createGame(input: GameInput, adminId: string) {
  let verifiedAt: string | null = null;
  if (input.publicationStatus === "published") {
    const verification = await verifyGameUrl(input.gameUrl ?? "");
    if (!verification.ok) throw new PublicationBlocked(verification.checks);
    verifiedAt = nowIso();
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const searchText = await searchTextFor(input);
  await run(
    `INSERT INTO games (id, title, slug, short_description, description, cover_url, developer, publisher, category_id,
       game_url, game_type, source, license, pricing_type, publication_status, featured, released_at,
       supported_devices, controls, languages, orientation, play_count, rating_avg, rating_count, search_text,
       verified_at, created_by, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.slug,
      input.shortDescription || null,
      input.description || null,
      input.coverUrl || null,
      input.developer || null,
      input.publisher || null,
      input.categoryId || null,
      input.gameUrl || null,
      input.gameType,
      input.source || null,
      input.license || null,
      input.pricingType,
      input.publicationStatus,
      input.featured ? 1 : 0,
      input.releasedAt || null,
      input.supportedDevices || null,
      input.controls || null,
      input.languages || null,
      input.orientation,
      searchText,
      verifiedAt,
      adminId,
      now,
      now,
      input.publicationStatus === "published" ? now : null,
    ],
  );

  for (const [index, url] of input.screenshots.entries()) {
    await run(
      `INSERT INTO game_images (id, game_id, image_url, image_type, sort_order, created_at) VALUES (?, ?, ?, 'screenshot', ?, ?)`,
      [crypto.randomUUID(), id, url, index, now],
    );
  }

  if (input.publicationStatus === "published") {
    await run(
      `INSERT INTO notifications (id, title, body, url, audience, created_at) VALUES (?, ?, ?, ?, 'all', ?)`,
      [crypto.randomUUID(), `New game: ${input.title}`, input.shortDescription || "", `/game/${input.slug}`, now],
    );
  }

  return id;
}

export async function updateGame(id: string, input: GameInput) {
  const existing = await one<{ id: string; verified_at: string | null; publication_status: string; published_at: string | null }>(
    "SELECT id, verified_at, publication_status, published_at FROM games WHERE id = ?",
    [id],
  );
  if (!existing) return null;

  let verifiedAt = existing.verified_at;
  if (input.publicationStatus === "published" && !verifiedAt) {
    const verification = await verifyGameUrl(input.gameUrl ?? "");
    if (!verification.ok) throw new PublicationBlocked(verification.checks);
    verifiedAt = nowIso();
  }
  const searchText = await searchTextFor(input);
  const now = nowIso();

  await run(
    `UPDATE games SET title = ?, slug = ?, short_description = ?, description = ?, cover_url = ?, developer = ?,
       publisher = ?, category_id = ?, game_url = ?, game_type = ?, source = ?, license = ?, pricing_type = ?,
       publication_status = ?, featured = ?, released_at = ?, supported_devices = ?, controls = ?, languages = ?,
       orientation = ?, search_text = ?, verified_at = ?, updated_at = ?,
       published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END
     WHERE id = ?`,
    [
      input.title,
      input.slug,
      input.shortDescription || null,
      input.description || null,
      input.coverUrl || null,
      input.developer || null,
      input.publisher || null,
      input.categoryId || null,
      input.gameUrl || null,
      input.gameType,
      input.source || null,
      input.license || null,
      input.pricingType,
      input.publicationStatus,
      input.featured ? 1 : 0,
      input.releasedAt || null,
      input.supportedDevices || null,
      input.controls || null,
      input.languages || null,
      input.orientation,
      searchText,
      verifiedAt,
      now,
      input.publicationStatus,
      now,
      id,
    ],
  );

  await run("DELETE FROM game_images WHERE game_id = ?", [id]);
  for (const [index, url] of input.screenshots.entries()) {
    await run(
      `INSERT INTO game_images (id, game_id, image_url, image_type, sort_order, created_at) VALUES (?, ?, ?, 'screenshot', ?, ?)`,
      [crypto.randomUUID(), id, url, index, now],
    );
  }

  if (input.publicationStatus === "published") {
    await run(
      `INSERT INTO notifications (id, title, body, url, audience, created_at) VALUES (?, ?, ?, ?, 'all', ?)`,
      [crypto.randomUUID(), `New game: ${input.title}`, input.shortDescription || "", `/game/${input.slug}`, now],
    );
  }

  return id;
}
