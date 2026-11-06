import { all } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string | null;
  ip: string | null;
  created_at: string;
  admin: string | null;
};

export default async function AdminLogsPage() {
  const { dict, locale } = await getDictionary();
  const rows = await all<Row>(
    `SELECT l.*, COALESCE(u.first_name, u.username) AS admin FROM admin_logs l
     LEFT JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 200`,
  );

  return (
    <div className="fade-up">
      <h1 className="mb-3 text-lg font-extrabold">{dict["admin.logs.title"]}</h1>
      <div className="overflow-x-auto rounded-xl border border-[rgba(139,92,246,.18)]">
        <table className="w-full text-left text-[11.5px]">
          <thead style={{ background: "rgba(23,30,48,.75)" }}>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              <th className="p-2">When</th>
              <th className="p-2">Admin</th>
              <th className="p-2">Action</th>
              <th className="p-2">Entity</th>
              <th className="p-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="whitespace-nowrap p-2 text-[var(--color-muted)]">{formatDate(row.created_at, locale)}</td>
                <td className="p-2 font-semibold">{row.admin ?? "system"}</td>
                <td className="p-2">{row.action}</td>
                <td className="p-2 text-[var(--color-muted)]">
                  {row.entity_type ?? "—"}
                  {row.entity_id ? <span className="ms-1 opacity-60">{row.entity_id.slice(0, 8)}</span> : null}
                </td>
                <td className="p-2 text-[var(--color-muted)]">{row.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-3 text-center text-xs text-[var(--color-muted)]">{dict["admin.stat.noData"]}</p>}
    </div>
  );
}
