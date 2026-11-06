import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireUser, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { consume } from "@/lib/rate-limit";
import { nowIso } from "@/lib/time";
import { reviewInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type ReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
};

async function recompute(gameId: string) {
  await run(
    `UPDATE games SET
       rating_avg = COALESCE((SELECT AVG(rating) FROM reviews WHERE game_id = ? AND status = 'published'), 0),
       rating_count = (SELECT COUNT(*) FROM reviews WHERE game_id = ? AND status = 'published')
     WHERE id = ?`,
    [gameId, gameId, gameId],
  );
}

export const GET = route(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 20), 1), 50);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") ?? 0), 0);

  const reviews = await all<ReviewRow>(
    `SELECT r.id, r.rating, r.review_text, r.created_at, r.user_id, u.first_name, u.username, u.photo_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.game_id = ? AND r.status = 'published' AND u.status = 'active'
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [id, limit, offset],
  );

  const user = await getCurrentUser();
  const mine = user
    ? await one<{ id: string; rating: number; review_text: string | null; status: string }>(
        "SELECT id, rating, review_text, status FROM reviews WHERE game_id = ? AND user_id = ?",
        [id, user.id],
      )
    : null;

  const aggregate = await one<{ avg: number | null; total: unknown }>(
    "SELECT AVG(rating) AS avg, COUNT(*) AS total FROM reviews WHERE game_id = ? AND status = 'published'",
    [id],
  );

  return json({
    reviews: reviews.map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      text: row.review_text,
      createdAt: row.created_at,
      mine: user?.id === row.user_id,
      author: {
        name: row.first_name ?? row.username ?? "Player",
        username: row.username,
        photoUrl: row.photo_url,
      },
    })),
    mine: mine ? { rating: Number(mine.rating), text: mine.review_text, status: mine.status } : null,
    average: aggregate?.avg ? Number(aggregate.avg) : 0,
    total: Number(aggregate?.total ?? 0),
    canReview: Boolean(user && user.status === "active"),
  });
});

export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await context.params;

  if (!consume(`review:${user.id}:${clientIp(request)}`, 10, 60 * 60_000).ok) {
    throw new HttpError(429, "You have submitted many reviews. Please try again later.", "rate_limited");
  }

  const game = await one<{ id: string; publication_status: string }>(
    "SELECT id, publication_status FROM games WHERE id = ?",
    [id],
  );
  if (!game || game.publication_status !== "published") {
    throw new HttpError(404, "Game not found.", "not_found");
  }

  const { rating, reviewText } = await parseBody(request, reviewInputSchema);
  const text = reviewText?.trim() ? reviewText.trim() : null;
  const now = nowIso();

  const existing = await one<{ id: string }>("SELECT id FROM reviews WHERE game_id = ? AND user_id = ?", [id, user.id]);
  if (existing) {
    await run("UPDATE reviews SET rating = ?, review_text = ?, status = 'published', updated_at = ? WHERE id = ?", [
      rating,
      text,
      now,
      existing.id,
    ]);
  } else {
    await run(
      `INSERT INTO reviews (id, user_id, game_id, rating, review_text, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'published', ?, ?)`,
      [crypto.randomUUID(), user.id, id, rating, text, now, now],
    );
  }
  await recompute(id);

  const stats = await one<{ avg: number | null; total: unknown }>(
    "SELECT AVG(rating) AS avg, COUNT(*) AS total FROM reviews WHERE game_id = ? AND status = 'published'",
    [id],
  );

  return json({
    ok: true,
    average: stats?.avg ? Number(stats.avg) : 0,
    total: Number(stats?.total ?? 0),
    updated: Boolean(existing),
  });
});
