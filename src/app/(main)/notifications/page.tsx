import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";
import { Icon } from "@/components/Icons";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: true } };

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  const { dict, locale } = await getDictionary();
  const user = await getCurrentUser();

  const rows = user
    ? await all<NotificationRow>(
        `SELECT n.id, n.title, n.body, n.url, n.created_at,
                (SELECT read_at FROM user_notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?) AS read_at
         FROM notifications n
         WHERE n.audience = 'all' OR n.user_id = ?
         ORDER BY n.created_at DESC LIMIT 50`,
        [user.id, user.id],
      )
    : await all<NotificationRow>(
        `SELECT id, title, body, url, created_at, NULL AS read_at FROM notifications
         WHERE audience = 'all' ORDER BY created_at DESC LIMIT 50`,
      );

  return (
    <div className="fade-up">
      {user && <MarkNotificationsRead />}
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <Icon name="bell" size={20} style={{ color: "var(--color-cyan)" }} />
        {dict["notifications.title"]}
      </h1>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgba(161,170,189,.25)] p-6 text-center text-sm text-[var(--color-muted)]">
          {dict["notifications.empty"]}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border p-3.5"
              style={{
                background: row.read_at ? "rgba(23,30,48,.45)" : "rgba(34,211,238,.07)",
                borderColor: row.read_at ? "rgba(139,92,246,.16)" : "rgba(34,211,238,.3)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-bold">{row.title}</p>
                  {row.body && <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted)]">{row.body}</p>}
                </div>
                <span className="shrink-0 text-[10px] text-[var(--color-muted)]">{formatDate(row.created_at, locale)}</span>
              </div>
              {row.url && (
                <a href={row.url} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-cyan)]">
                  {dict["common.learnMore"]}
                  <Icon name="chevronRight" size={11} className="flip-x" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
