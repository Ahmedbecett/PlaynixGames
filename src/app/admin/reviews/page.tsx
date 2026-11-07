import { all } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
  game_title: string;
  game_slug: string;
  author: string | null;
};

export default async function AdminReviewsPage() {
  const { dict, locale } = await getDictionary();
  const rows = await all<Row>(
    `SELECT r.id, r.rating, r.review_text, r.status, r.created_at, g.title AS game_title, g.slug AS game_slug,
            COALESCE(u.first_name, u.username) AS author
     FROM reviews r JOIN games g ON g.id = r.game_id LEFT JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC LIMIT 100`,
  );

  return (
    <div className="fade-up">
      <h1 className="mb-3 text-lg font-extrabold">{dict["admin.reviews.title"]}</h1>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgba(161,170,189,.25)] p-6 text-center text-sm text-[var(--color-muted)]">
          {dict["admin.stat.noData"]}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-[rgba(139,92,246,.16)] p-3" style={{ background: "rgba(23,30,48,.5)" }}>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <b>{row.game_title}</b>
                <span className="chip">{row.rating} ★</span>
                <span className="chip" style={{ color: row.status === "published" ? "var(--color-success)" : "var(--color-orange)" }}>
                  {row.status}
                </span>
                <span className="ms-auto text-[10.5px] text-[var(--color-muted)]">
                  {row.author ?? "Player"} · {formatDate(row.created_at, locale)}
                </span>
              </div>
              {row.review_text && <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">{row.review_text}</p>}
              <div className="mt-2 flex gap-2">
                {row.status !== "published" && (
                  <AdminActionButton endpoint={`/api/admin/reviews/${row.id}`} label={dict["admin.reviews.approve"]} body={{ status: "published" }} variant="primary" />
                )}
                {row.status !== "hidden" && (
                  <AdminActionButton endpoint={`/api/admin/reviews/${row.id}`} label={dict["admin.reviews.hide"]} body={{ status: "hidden" }} variant="danger" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
