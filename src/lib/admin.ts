import { all, count, dialect, healthCheck, one } from "./db";
import { configStatus } from "./env";
import { dayStartIso, isoInDays, nowIso } from "./time";

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

/** Every number here is a live aggregate over the Playnix database. */
export async function getDashboardStats() {
  const now = nowIso();
  const [
    users,
    activeUsers,
    newUsers,
    published,
    pending,
    freeGames,
    premiumGames,
    launches,
    subscriptions,
    revenue,
    openReports,
    pendingReviews,
    topGames,
    adImpressions,
    suggestions,
    recentLogs,
    health,
    recentUsers,
    recentPayments,
  ] = await Promise.all([
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM users WHERE status != 'deleted'"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM users WHERE last_seen_at > ?", [dayStartIso(30)]),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM users WHERE created_at > ?", [dayStartIso(7)]),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM games WHERE publication_status = 'published'"),
    one<{ total: unknown }>(
      "SELECT COUNT(*) AS total FROM games WHERE publication_status IN ('pending','approved','draft','rejected')",
    ),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM games WHERE pricing_type = 'free' AND publication_status = 'published'"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM games WHERE pricing_type = 'premium' AND publication_status = 'published'"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM play_history"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM subscriptions WHERE status = 'active' AND expires_at > ?", [now]),
    one<{ total: unknown }>("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM game_reports WHERE status = 'open'"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'"),
    all<{ id: string; title: string; slug: string; play_count: number; rating_avg: number; pricing_type: string }>(
      "SELECT id, title, slug, play_count, rating_avg, pricing_type FROM games ORDER BY play_count DESC LIMIT 6",
    ),
    one<{ total: unknown }>("SELECT COALESCE(SUM(impressions), 0) AS total FROM ad_campaigns"),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM game_suggestions WHERE status = 'new'"),
    all<{ id: string; action: string; entity_type: string | null; created_at: string; first_name: string | null; username: string | null }>(
      `SELECT l.id, l.action, l.entity_type, l.created_at, u.first_name, u.username
       FROM admin_logs l LEFT JOIN users u ON u.id = l.admin_id
       ORDER BY l.created_at DESC LIMIT 8`,
    ),
    healthCheck(),
    all<{ id: string; first_name: string | null; username: string | null; created_at: string; language: string; role: string }>(
      "SELECT id, first_name, username, created_at, language, role FROM users ORDER BY created_at DESC LIMIT 5",
    ),
    all<{ id: string; amount: number; status: string; created_at: string; plan_id: string | null }>(
      "SELECT id, amount, status, created_at, plan_id FROM payments ORDER BY created_at DESC LIMIT 5",
    ),
  ]);

  return {
    users: {
      total: count(users?.total),
      active30d: count(activeUsers?.total),
      new7d: count(newUsers?.total),
    },
    games: {
      published: count(published?.total),
      pending: count(pending?.total),
      free: count(freeGames?.total),
      premium: count(premiumGames?.total),
    },
    engagement: {
      launches: count(launches?.total),
      adImpressions: count(adImpressions?.total),
    },
    monetization: {
      activeSubscriptions: count(subscriptions?.total),
      revenueStars: count(revenue?.total),
    },
    moderation: {
      openReports: count(openReports?.total),
      pendingReviews: count(pendingReviews?.total),
      newSuggestions: count(suggestions?.total),
    },
    topGames: topGames.map((game) => ({
      id: game.id,
      title: game.title,
      slug: game.slug,
      playCount: count(game.play_count),
      rating: Number(game.rating_avg ?? 0),
      pricing: game.pricing_type,
    })),
    recentLogs: recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      createdAt: log.created_at,
      admin: log.first_name ?? log.username ?? "system",
    })),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.first_name ?? user.username ?? "Player",
      createdAt: user.created_at,
      language: user.language,
      role: user.role,
    })),
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      amount: count(payment.amount),
      status: payment.status,
      createdAt: payment.created_at,
    })),
    health: {
      ok: health.ok,
      dialect,
      error: health.error,
      nextSubscriptionCheck: isoInDays(0),
      config: configStatus(),
    },
  };
}
