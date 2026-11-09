/**
 * Developer accounts and the game submission queue.
 *
 * Flow: a signed-in user applies → the application is reviewed → they own a
 * `developers` row → they submit games, which enter `pending` → a moderator
 * approves (goes live) or rejects (with a note the developer can read).
 *
 * The rules that matter:
 *   - A developer can only ever see and edit their own games.
 *   - Approving is restricted to moderators/admins and is recorded in
 *     `game_reviews`, so there is always an audit trail.
 *   - A submitted game is never published directly by the developer.
 */
import crypto from "node:crypto";
import { all, one, run } from "./db";
import { nowIso } from "./time";
import { DomainError } from "./api";

export type DeveloperStatus = "pending" | "approved" | "rejected" | "suspended";

export type Developer = {
  id: string;
  user_id: string;
  display_name: string;
  studio_url: string | null;
  country: string | null;
  payout_telegram: string | null;
  revenue_share: number;
  status: DeveloperStatus;
  created_at: string;
  updated_at: string;
};

export class DeveloperError extends DomainError {
  constructor(message: string, status = 400, code = "developer_error") {
    super(message, status, code);
  }
}

export async function getDeveloperByUser(userId: string): Promise<Developer | null> {
  return one<Developer>("SELECT * FROM developers WHERE user_id = ?", [userId]);
}

export async function getDeveloperById(id: string): Promise<Developer | null> {
  return one<Developer>("SELECT * FROM developers WHERE id = ?", [id]);
}

/** Applies to become a developer. One application per account. */
export async function applyAsDeveloper(
  userId: string,
  input: { displayName: string; studioUrl?: string; country?: string; payoutTelegram?: string },
): Promise<Developer> {
  const existing = await getDeveloperByUser(userId);
  if (existing) {
    throw new DeveloperError("You already have a developer account.", 409, "already_applied");
  }
  const displayName = input.displayName.trim();
  if (displayName.length < 2) {
    throw new DeveloperError("Enter the studio or developer name you want to publish under.", 422, "invalid_name");
  }
  const id = crypto.randomUUID();
  const now = nowIso();
  await run(
    `INSERT INTO developers (id, user_id, display_name, studio_url, country, payout_telegram, revenue_share, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 70, 'pending', ?, ?)`,
    [id, userId, displayName, input.studioUrl?.trim() || null, input.country?.trim() || null, input.payoutTelegram?.trim() || null, now, now],
  );
  return (await getDeveloperById(id)) as Developer;
}

export async function updateDeveloperProfile(
  developerId: string,
  input: { displayName?: string; studioUrl?: string; country?: string; payoutTelegram?: string },
): Promise<void> {
  const current = await getDeveloperById(developerId);
  if (!current) throw new DeveloperError("Developer account not found.", 404, "not_found");
  await run(
    "UPDATE developers SET display_name = ?, studio_url = ?, country = ?, payout_telegram = ?, updated_at = ? WHERE id = ?",
    [
      input.displayName?.trim() || current.display_name,
      input.studioUrl?.trim() ?? current.studio_url,
      input.country?.trim() ?? current.country,
      input.payoutTelegram?.trim() ?? current.payout_telegram,
      nowIso(),
      developerId,
    ],
  );
}

export async function setDeveloperStatus(developerId: string, status: DeveloperStatus): Promise<void> {
  await run("UPDATE developers SET status = ?, updated_at = ? WHERE id = ?", [status, nowIso(), developerId]);
}

/* -------------------------------------------------------------------------- */
/* Games owned by a developer                                                 */
/* -------------------------------------------------------------------------- */

export type DeveloperGameRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  cover_url: string | null;
  game_url: string | null;
  publication_status: string;
  pricing_type: string;
  category_name: string | null;
  review_note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listDeveloperGames(developerId: string): Promise<DeveloperGameRow[]> {
  return all<DeveloperGameRow>(
    `SELECT g.id, g.title, g.slug, g.short_description, g.cover_url, g.game_url, g.publication_status,
            g.pricing_type, c.name AS category_name, g.review_note, g.submitted_at, g.created_at, g.updated_at
     FROM games g LEFT JOIN categories c ON c.id = g.category_id
     WHERE g.developer_id = ?
     ORDER BY g.updated_at DESC`,
    [developerId],
  );
}

/** Fetches a game only if the developer owns it — the ownership check lives here. */
export async function getOwnedGame(developerId: string, gameId: string): Promise<DeveloperGameRow | null> {
  return one<DeveloperGameRow>(
    `SELECT g.*, c.name AS category_name
     FROM games g LEFT JOIN categories c ON c.id = g.category_id
     WHERE g.id = ? AND g.developer_id = ?`,
    [gameId, developerId],
  );
}

export type SubmitGameInput = {
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  categoryId?: string;
  gameUrl: string;
  coverUrl?: string;
  controls?: string;
  orientation?: "any" | "portrait" | "landscape";
  screenshots?: string[];
  pricingType?: "free" | "premium";
};

function searchText(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" \n ").toLowerCase();
}

/**
 * Creates a game owned by the developer, always in `pending`.
 *
 * The developer cannot choose `published`: that transition only happens through
 * `reviewGame`, which moderators and admins call.
 */
export async function submitGame(developer: Developer, input: SubmitGameInput): Promise<string> {
  if (developer.status !== "approved") {
    throw new DeveloperError(
      developer.status === "pending"
        ? "Your developer account is still being reviewed."
        : "Your developer account cannot publish games right now.",
      403,
      "developer_not_approved",
    );
  }

  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new DeveloperError("Slug can only contain lowercase letters, numbers and dashes.", 422, "invalid_slug");
  }

  const taken = await one<{ id: string }>("SELECT id FROM games WHERE slug = ?", [slug]);
  if (taken) throw new DeveloperError("That slug is already in use. Pick another.", 409, "slug_taken");

  const category = input.categoryId
    ? await one<{ id: string; name: string }>("SELECT id, name FROM categories WHERE id = ?", [input.categoryId])
    : null;

  const id = crypto.randomUUID();
  const now = nowIso();
  await run(
    `INSERT INTO games (id, title, slug, short_description, description, cover_url, developer, publisher, category_id,
       game_url, game_type, source, license, pricing_type, publication_status, featured, languages, controls,
       orientation, play_count, rating_avg, rating_count, search_text, created_by, developer_id, submitted_at,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'html5', 'Community submission', 'Submitted by the developer', ?,
       'pending', 0, 'en,ar,fr', ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title.trim(),
      slug,
      input.shortDescription?.trim() || null,
      input.description?.trim() || null,
      input.coverUrl?.trim() || null,
      developer.display_name,
      developer.display_name,
      category?.id ?? null,
      input.gameUrl.trim(),
      input.pricingType ?? "free",
      input.controls?.trim() || null,
      input.orientation ?? "any",
      searchText([input.title, input.shortDescription, input.description, developer.display_name, category?.name]),
      developer.user_id,
      developer.id,
      now,
      now,
      now,
    ],
  );

  for (const [index, url] of (input.screenshots ?? []).entries()) {
    await run(
      "INSERT INTO game_images (id, game_id, image_url, image_type, sort_order, created_at) VALUES (?, ?, ?, 'screenshot', ?, ?)",
      [crypto.randomUUID(), id, url, index, now],
    );
  }

  return id;
}

/** Edits a game the developer owns and sends it back to review. */
export async function updateSubmittedGame(
  developer: Developer,
  gameId: string,
  input: Partial<SubmitGameInput>,
): Promise<void> {
  const game = await getOwnedGame(developer.id, gameId);
  if (!game) throw new DeveloperError("Game not found.", 404, "not_found");
  if (game.publication_status === "disabled") {
    throw new DeveloperError("This game was disabled by the platform.", 403, "disabled");
  }

  // Any edit invalidates the previous approval, so it re-enters the queue.
  const now = nowIso();
  await run(
    `UPDATE games SET
       title = COALESCE(?, title),
       short_description = COALESCE(?, short_description),
       description = COALESCE(?, description),
       game_url = COALESCE(?, game_url),
       cover_url = COALESCE(?, cover_url),
       controls = COALESCE(?, controls),
       orientation = COALESCE(?, orientation),
       category_id = COALESCE(?, category_id),
       publication_status = CASE WHEN publication_status = 'published' THEN 'pending' ELSE 'pending' END,
       review_note = NULL,
       submitted_at = ?,
       updated_at = ?
     WHERE id = ? AND developer_id = ?`,
    [
      input.title?.trim() || null,
      input.shortDescription?.trim() ?? null,
      input.description?.trim() ?? null,
      input.gameUrl?.trim() || null,
      input.coverUrl?.trim() ?? null,
      input.controls?.trim() ?? null,
      input.orientation ?? null,
      input.categoryId || null,
      now,
      now,
      gameId,
      developer.id,
    ],
  );
}

export async function withdrawGame(developerId: string, gameId: string): Promise<void> {
  const game = await getOwnedGame(developerId, gameId);
  if (!game) throw new DeveloperError("Game not found.", 404, "not_found");
  await run(
    "UPDATE games SET publication_status = 'draft', updated_at = ? WHERE id = ? AND developer_id = ?",
    [nowIso(), gameId, developerId],
  );
}

/* -------------------------------------------------------------------------- */
/* Review queue                                                               */
/* -------------------------------------------------------------------------- */

export type QueueRow = DeveloperGameRow & { developer_name: string; developer_status: string };

/** Games waiting for a moderator, oldest first so the queue is fair. */
export async function listReviewQueue(limit = 100): Promise<QueueRow[]> {
  return all<QueueRow>(
    `SELECT g.id, g.title, g.slug, g.short_description, g.cover_url, g.game_url, g.publication_status,
            g.pricing_type, c.name AS category_name, g.review_note, g.submitted_at, g.created_at, g.updated_at,
            d.display_name AS developer_name, d.status AS developer_status
     FROM games g
     JOIN developers d ON d.id = g.developer_id
     LEFT JOIN categories c ON c.id = g.category_id
     WHERE g.publication_status IN ('pending', 'approved')
     ORDER BY COALESCE(g.submitted_at, g.created_at) ASC
     LIMIT ?`,
    [limit],
  );
}

export type ReviewAction = "approve" | "reject" | "request_changes" | "disable";

/**
 * Records a moderation decision.
 *
 * Approval is the only path to `published`, and it always writes an audit row
 * so a takedown can be traced back to who let a game in and when.
 */
export async function reviewGame(params: {
  gameId: string;
  reviewerId: string;
  action: ReviewAction;
  note?: string;
}): Promise<{ status: string }> {
  const game = await one<{ id: string; title: string; slug: string; publication_status: string; developer_id: string | null }>(
    "SELECT id, title, slug, publication_status, developer_id FROM games WHERE id = ?",
    [params.gameId],
  );
  if (!game) throw new DeveloperError("Game not found.", 404, "not_found");
  if (!game.developer_id) {
    throw new DeveloperError("Only community submissions go through the review queue.", 400, "not_a_submission");
  }

  const statusMap: Record<ReviewAction, string> = {
    approve: "published",
    reject: "rejected",
    request_changes: "pending",
    disable: "disabled",
  };
  const status = statusMap[params.action];
  const now = nowIso();

  await run("UPDATE games SET publication_status = ?, review_note = ?, updated_at = ?, published_at = COALESCE(published_at, ?) WHERE id = ?", [
    status,
    params.note?.trim() || null,
    now,
    params.action === "approve" ? now : null,
    params.gameId,
  ]);

  await run(
    "INSERT INTO game_reviews (id, game_id, reviewer_id, action, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [crypto.randomUUID(), params.gameId, params.reviewerId, params.action, params.note?.trim() || null, now],
  );

  // Tell the developer what happened, in-app.
  if (game.developer_id) {
    const owner = await one<{ user_id: string }>("SELECT user_id FROM developers WHERE id = ?", [game.developer_id]);
    if (owner) {
      const titles: Record<ReviewAction, string> = {
        approve: `Your game "${game.title}" is live`,
        reject: `Your game "${game.title}" was not approved`,
        request_changes: `Changes requested on "${game.title}"`,
        disable: `"${game.title}" was disabled`,
      };
      await run(
        "INSERT INTO notifications (id, user_id, title, body, url, audience, created_at) VALUES (?, ?, ?, ?, ?, 'user', ?)",
        [crypto.randomUUID(), owner.user_id, titles[params.action], params.note?.trim() || "", "/developers", now],
      );
    }
  }

  if (params.action === "approve") {
    await run(
      "INSERT INTO notifications (id, title, body, url, audience, created_at) VALUES (?, ?, ?, ?, 'all', ?)",
      [crypto.randomUUID(), `New game: ${game.title}`, "A new community game just landed.", `/game/${game.slug}`, now],
    );
  }

  return { status };
}

export async function gameReviewHistory(gameId: string) {
  return all<{ action: string; note: string | null; created_at: string; reviewer: string | null }>(
    `SELECT r.action, r.note, r.created_at, u.first_name AS reviewer
     FROM game_reviews r LEFT JOIN users u ON u.id = r.reviewer_id
     WHERE r.game_id = ? ORDER BY r.created_at DESC LIMIT 50`,
    [gameId],
  );
}
