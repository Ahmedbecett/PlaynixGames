import { all } from "./db";
import type { GameRow } from "./games";

const SELECT = `
  SELECT g.*, c.name AS category_name, c.slug AS category_slug
  FROM games g
  LEFT JOIN categories c ON c.id = g.category_id
`;

/**
 * Recommendations are derived from the player's real activity:
 * categories they play and favourite, minus games they already played.
 * With no activity we fall back to the best rated published games — never
 * to invented rows.
 */
export async function getRecommendations(userId: string | null, limit = 10): Promise<GameRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  if (!userId) {
    return all<GameRow>(
      `${SELECT} WHERE g.publication_status = 'published'
       ORDER BY g.rating_avg DESC, g.play_count DESC, COALESCE(g.published_at, g.created_at) DESC
       LIMIT ?`,
      [safeLimit],
    );
  }

  const preferred = await all<{ category_id: string }>(
    `SELECT g.category_id, COUNT(*) AS hits FROM (
        SELECT game_id FROM play_history WHERE user_id = ?
        UNION ALL
        SELECT game_id FROM favorites WHERE user_id = ?
     ) activity
     JOIN games g ON g.id = activity.game_id
     WHERE g.category_id IS NOT NULL
     GROUP BY g.category_id
     ORDER BY hits DESC
     LIMIT 3`,
    [userId, userId],
  );

  if (preferred.length === 0) {
    return all<GameRow>(
      `${SELECT} WHERE g.publication_status = 'published'
       ORDER BY g.rating_avg DESC, g.play_count DESC LIMIT ?`,
      [safeLimit],
    );
  }

  const placeholders = preferred.map(() => "?").join(",");
  const rows = await all<GameRow>(
    `${SELECT} WHERE g.publication_status = 'published'
       AND g.category_id IN (${placeholders})
       AND g.id NOT IN (SELECT game_id FROM play_history WHERE user_id = ?)
     ORDER BY g.rating_avg DESC, g.play_count DESC, COALESCE(g.published_at, g.created_at) DESC
     LIMIT ?`,
    [...preferred.map((row) => row.category_id), userId, safeLimit],
  );

  if (rows.length > 0) return rows;

  return all<GameRow>(
    `${SELECT} WHERE g.publication_status = 'published' ORDER BY g.play_count DESC LIMIT ?`,
    [safeLimit],
  );
}

/** Games the player started but did not finish recently — resumable sessions. */
export async function getContinuePlaying(userId: string, limit = 8): Promise<GameRow[]> {
  return all<GameRow>(
    `${SELECT}
     WHERE g.publication_status = 'published'
       AND g.id IN (
         SELECT game_id FROM play_history WHERE user_id = ?
         GROUP BY game_id HAVING MAX(started_at) = (
           SELECT MAX(started_at) FROM play_history p2 WHERE p2.user_id = ? AND p2.game_id = play_history.game_id
         )
       )
     ORDER BY (SELECT MAX(started_at) FROM play_history p3 WHERE p3.user_id = ? AND p3.game_id = g.id) DESC
     LIMIT ?`,
    [userId, userId, userId, Math.min(limit, 12)],
  );
}
