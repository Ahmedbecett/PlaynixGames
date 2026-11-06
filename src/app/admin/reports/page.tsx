import Link from "next/link";
import { all } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  game_title: string;
  game_slug: string;
  reporter: string | null;
};

export default async function AdminReportsPage() {
  const { dict, locale } = await getDictionary();
  const rows = await all<Row>(
    `SELECT r.id, r.reason, r.details, r.status, r.created_at, g.title AS game_title, g.slug AS game_slug,
            COALESCE(u.first_name, u.username) AS reporter
     FROM game_reports r JOIN games g ON g.id = r.game_id LEFT JOIN users u ON u.id = r.user_id
     ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 100`,
  );

  return (
    <div className="fade-up">
      <h1 className="mb-3 text-lg font-extrabold">{dict["admin.reports.title"]}</h1>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgba(161,170,189,.25)] p-6 text-center text-sm text-[var(--color-muted)]">
          {dict["admin.reports.empty"]}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-[rgba(139,92,246,.16)] p-3" style={{ background: "rgba(23,30,48,.5)" }}>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <Link href={`/admin/games`} className="font-bold text-[var(--color-cyan)]">
                  {row.game_title}
                </Link>
                <span className="chip">{row.reason}</span>
                <span className="chip" style={{ color: row.status === "open" ? "var(--color-danger)" : "var(--color-muted)" }}>
                  {row.status}
                </span>
                <span className="ms-auto text-[10.5px] text-[var(--color-muted)]">
                  {row.reporter ?? "Player"} · {formatDate(row.created_at, locale)}
                </span>
              </div>
              {row.details && <p className="mt-1.5 text-[12.5px] text-[var(--color-muted)]">{row.details}</p>}
              {row.status === "open" && (
                <div className="mt-2 flex gap-2">
                  <AdminActionButton endpoint={`/api/admin/reports/${row.id}`} label={dict["admin.reports.resolve"]} body={{ status: "resolved" }} variant="primary" />
                  <AdminActionButton endpoint={`/api/admin/reports/${row.id}`} label={dict["admin.reports.dismiss"]} body={{ status: "dismissed" }} />
                  <Link href={`/game/${row.game_slug}`} className="btn btn-sm btn-ghost">
                    {dict["common.learnMore"]}
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
