import { all } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";
import { AnnouncementForm } from "@/components/admin/SimpleForms";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const { dict, locale } = await getDictionary();
  const rows = await all<{ id: string; title: string; body: string | null; created_at: string }>(
    "SELECT id, title, body, created_at FROM notifications ORDER BY created_at DESC LIMIT 30",
  );

  return (
    <div className="fade-up space-y-4">
      <h1 className="text-lg font-extrabold">{dict["admin.announcements.title"]}</h1>
      <div className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <AnnouncementForm />
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-[rgba(139,92,246,.16)] p-3" style={{ background: "rgba(23,30,48,.5)" }}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-[13px]">{row.title}</b>
              <span className="text-[10px] text-[var(--color-muted)]">{formatDate(row.created_at, locale)}</span>
            </div>
            {row.body && <p className="mt-1 text-[12px] text-[var(--color-muted)]">{row.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
