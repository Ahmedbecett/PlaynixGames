import Link from "next/link";
import { getDashboardStats } from "@/lib/admin";
import { getDictionary, formatNumber, formatDate } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/Icons";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: IconName;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(139,92,246,.2)] p-3.5" style={{ background: "rgba(23,30,48,.62)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{label}</span>
        <Icon name={icon} size={15} style={{ color: accent ?? "var(--color-cyan)" }} />
      </div>
      <p className="mt-1.5 text-2xl font-[850] leading-none">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { dict, locale } = await getDictionary();
  const stats = await getDashboardStats();
  const maxPlays = Math.max(1, ...stats.topGames.map((game) => game.playCount));

  return (
    <div className="fade-up space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-extrabold tracking-tight">{dict["admin.nav.dashboard"]}</h1>
        <span className="chip ms-auto">{dict["admin.stat.health"]}: {stats.health.ok ? "OK" : "FAIL"}</span>
        <Link href="/admin/games/new" className="btn btn-sm">
          <Icon name="plus" size={14} /> {dict["admin.games.new"]}
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={dict["admin.stat.users"]} value={formatNumber(stats.users.total, locale)} icon="users" />
        <Stat label={dict["admin.stat.activeUsers"]} value={formatNumber(stats.users.active30d, locale)} icon="bolt" accent="var(--color-orange)" />
        <Stat label={dict["admin.stat.newUsers"]} value={formatNumber(stats.users.new7d, locale)} icon="plus" accent="var(--color-success)" />
        <Stat label={dict["admin.stat.launches"]} value={formatNumber(stats.engagement.launches, locale)} icon="play" accent="var(--color-violet)" />
        <Stat label={dict["admin.stat.published"]} value={formatNumber(stats.games.published, locale)} icon="gamepad" />
        <Stat label={dict["admin.stat.pending"]} value={formatNumber(stats.games.pending, locale)} icon="clock" accent="var(--color-orange)" />
        <Stat label={dict["admin.stat.free"]} value={formatNumber(stats.games.free, locale)} icon="check" accent="var(--color-success)" />
        <Stat label={dict["admin.stat.premium"]} value={formatNumber(stats.games.premium, locale)} icon="crown" accent="var(--color-violet)" />
        <Stat label={dict["admin.stat.subscriptions"]} value={formatNumber(stats.monetization.activeSubscriptions, locale)} icon="crown" />
        <Stat label={dict["admin.stat.revenue"]} value={`${formatNumber(stats.monetization.revenueStars, locale)} ⭐`} icon="sparkles" accent="var(--color-orange)" />
        <Stat label={dict["admin.stat.ads"]} value={formatNumber(stats.engagement.adImpressions, locale)} icon="bolt" />
        <Stat label={dict["admin.stat.reports"]} value={formatNumber(stats.moderation.openReports, locale)} icon="flag" accent={stats.moderation.openReports > 0 ? "var(--color-danger)" : undefined} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
          <h2 className="mb-3 text-sm font-extrabold">{dict["admin.stat.topGames"]}</h2>
          {stats.topGames.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">{dict["admin.stat.noData"]}</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.topGames.map((game) => (
                <li key={game.id}>
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <Link href={`/admin/games/${game.id}`} className="truncate font-semibold hover:text-[var(--color-cyan)]">
                      {game.title}
                    </Link>
                    <span className="shrink-0 text-[var(--color-muted)]">
                      {formatNumber(game.playCount, locale)} · {game.pricing}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(game.playCount / maxPlays) * 100}%`, background: "linear-gradient(90deg,#FF7A18,#8B5CF6)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
          <h2 className="mb-3 text-sm font-extrabold">{dict["admin.stat.health"]}</h2>
          <ul className="space-y-2 text-[12px]">
            <li className="flex items-center justify-between">
              <span className="text-[var(--color-muted)]">Database</span>
              <span className="font-bold" style={{ color: stats.health.ok ? "var(--color-success)" : "var(--color-danger)" }}>
                {stats.health.dialect} · {stats.health.ok ? "OK" : stats.health.error}
              </span>
            </li>
            {stats.health.config.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-2">
                <span className="text-[var(--color-muted)]">{item.key}</span>
                <span className="font-bold" style={{ color: item.ok ? "var(--color-success)" : "var(--color-orange)" }}>
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Link href="/admin/system" className="btn btn-sm btn-ghost">
              {dict["admin.system.title"]}
            </Link>
            <Link href="/admin/reports" className="btn btn-sm btn-ghost">
              {dict["admin.nav.reports"]} ({stats.moderation.openReports})
            </Link>
            <Link href="/admin/reviews" className="btn btn-sm btn-ghost">
              {dict["admin.nav.reviews"]}
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
          <h2 className="mb-3 text-sm font-extrabold">{dict["admin.logs.title"]}</h2>
          {stats.recentLogs.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">{dict["admin.stat.noData"]}</p>
          ) : (
            <ul className="space-y-2 text-[12px]">
              {stats.recentLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0">
                  <span className="truncate">
                    <b>{log.admin}</b> · {log.action}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--color-muted)]">{formatDate(log.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/logs" className="mt-2 inline-block text-[11px] font-bold text-[var(--color-cyan)]">
            {dict["common.viewAll"]}
          </Link>
        </section>

        <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
          <h2 className="mb-3 text-sm font-extrabold">{dict["admin.nav.users"]}</h2>
          <ul className="space-y-2 text-[12px]">
            {stats.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="shrink-0 text-[10px] text-[var(--color-muted)]">
                  {user.language.toUpperCase()} · {user.role} · {formatDate(user.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
