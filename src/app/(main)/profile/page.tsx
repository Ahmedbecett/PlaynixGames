import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, getPremiumStatus, isAdmin } from "@/lib/auth";
import { all, count, one } from "@/lib/db";
import { getDictionary, formatDate, formatNumber } from "@/lib/i18n";
import { formatDuration } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ProfileSettings } from "@/components/ProfileSettings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile" };

type HistoryRow = {
  game_id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  started_at: string;
  duration: number;
};

export default async function ProfilePage() {
  const { dict, locale } = await getDictionary();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="fade-up mx-auto max-w-md py-8 text-center">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "rgba(139,92,246,.16)" }}>
          <Icon name="user" size={28} style={{ color: "var(--color-violet)" }} />
        </span>
        <h1 className="text-lg font-extrabold">{dict["profile.notSignedIn"]}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">{dict["profile.notSignedInBody"]}</p>
        <Link href="/" className="btn mt-4">
          <Icon name="play" size={15} filled />
          {dict["nav.home"]}
        </Link>
      </div>
    );
  }

  const [stats, history, favoritesCount, premiumStatus] = await Promise.all([
    one<{ played: unknown; total: unknown }>(
      "SELECT COUNT(DISTINCT game_id) AS played, COALESCE(SUM(duration), 0) AS total FROM play_history WHERE user_id = ?",
      [user.id],
    ),
    all<HistoryRow>(
      `SELECT p.game_id, g.title, g.slug, g.cover_url, MAX(p.started_at) AS started_at, SUM(p.duration) AS duration
       FROM play_history p JOIN games g ON g.id = p.game_id
       WHERE p.user_id = ? AND g.publication_status = 'published'
       GROUP BY p.game_id, g.title, g.slug, g.cover_url
       ORDER BY started_at DESC LIMIT 8`,
      [user.id],
    ),
    one<{ total: unknown }>("SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?", [user.id]),
    getPremiumStatus(),
  ]);

  const isPreview = user.telegram_id === "preview-local";

  return (
    <div className="fade-up">
      <section className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[rgba(139,92,246,.25)] p-4" style={{ background: "linear-gradient(150deg,rgba(29,39,64,.9),rgba(17,22,38,.9))" }}>
        <Avatar photoUrl={user.photo_url} name={user.first_name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold">
            {user.first_name ?? "Player"} {user.last_name ?? ""}
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            {user.username ? `@${user.username} · ` : ""}
            {dict["profile.memberSince"].replace("{date}", formatDate(user.created_at, locale))}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {isAdmin(user) && (
              <Link href="/admin" className="chip" style={{ color: "var(--color-orange)", borderColor: "rgba(255,122,24,.45)" }}>
                <Icon name="shield" size={11} /> {dict["profile.adminPanel"]}
              </Link>
            )}
            {isPreview && (
              <span className="chip" style={{ color: "var(--color-cyan)", borderColor: "rgba(34,211,238,.4)" }}>
                {dict["profile.preview"]}
              </span>
            )}
            {premiumStatus.premium && (
              <span className="chip" style={{ color: "#cbb6ff", borderColor: "rgba(139,92,246,.5)" }}>
                <Icon name="crown" size={11} /> {dict["common.premium"]}
              </span>
            )}
          </div>
        </div>
      </section>

      {isPreview && <p className="mb-4 text-[11px] text-[var(--color-muted)]">{dict["profile.previewBody"]}</p>}

      <section className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: dict["profile.gamesPlayed"], value: formatNumber(count(stats?.played), locale), icon: "gamepad" as const },
          { label: dict["profile.favorites"], value: formatNumber(count(favoritesCount?.total), locale), icon: "heart" as const },
          { label: dict["profile.totalTime"], value: formatDuration(count(stats?.total)), icon: "clock" as const },
          {
            label: dict["profile.membership"],
            value: premiumStatus.premium ? dict["common.premium"] : dict["premium.freeTier"],
            icon: "crown" as const,
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[rgba(139,92,246,.2)] p-3" style={{ background: "rgba(23,30,48,.6)" }}>
            <Icon name={stat.icon} size={15} style={{ color: "var(--color-cyan)" }} />
            <p className="mt-1.5 text-base font-extrabold">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mb-5 rounded-2xl border border-[rgba(139,92,246,.28)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <Icon name="crown" size={15} style={{ color: "var(--color-orange)" }} />
              {dict["premium.title"]}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              {premiumStatus.premium && premiumStatus.subscription
                ? dict["premium.activeUntil"].replace("{date}", formatDate(premiumStatus.subscription.expires_at, locale))
                : dict["premium.noPlan"]}
            </p>
          </div>
          <Link href="/premium" className="btn btn-sm">
            {premiumStatus.premium ? dict["premium.renew"] : dict["premium.subscribe"]}
          </Link>
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--color-muted)]">{dict["profile.playHistory"]}</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[rgba(161,170,189,.25)] p-4 text-center text-xs text-[var(--color-muted)]">
            {dict["profile.noHistory"]}
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((row) => (
              <li key={row.game_id}>
                <Link
                  href={`/game/${row.slug}`}
                  className="hover-lift flex items-center gap-3 rounded-xl border border-[rgba(139,92,246,.16)] p-2"
                  style={{ background: "rgba(23,30,48,.55)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.cover_url || "/covers/placeholder.svg"} alt="" className="h-11 w-16 rounded-lg object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{row.title}</p>
                    <p className="text-[10px] text-[var(--color-muted)]">
                      {formatDate(row.started_at, locale)} · {formatDuration(Number(row.duration ?? 0))}
                    </p>
                  </div>
                  <Icon name="chevronRight" size={15} className="flip-x" style={{ color: "var(--color-muted)" }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--color-muted)]">{dict["profile.language"]}</h2>
        <LanguageSwitcher />
      </section>

      <ProfileSettings signedIn />
    </div>
  );
}
