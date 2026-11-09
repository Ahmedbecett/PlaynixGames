import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { listReviewQueue, type QueueRow } from "@/lib/developers";
import { Icon } from "@/components/Icons";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { DeveloperApprovals } from "@/components/admin/DeveloperApprovals";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Developers", robots: { index: false, follow: false } };

type PendingDeveloper = {
  id: string;
  display_name: string;
  studio_url: string | null;
  country: string | null;
  status: string;
  created_at: string;
  first_name: string | null;
  username: string | null;
  games: number;
};

export default async function AdminDevelopersPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--color-muted)]">Administrator access is required.</p>
    );
  }

  const [queue, developers] = await Promise.all([
    listReviewQueue(100),
    all<PendingDeveloper>(
      `SELECT d.id, d.display_name, d.studio_url, d.country, d.status, d.created_at,
              u.first_name, u.username,
              (SELECT COUNT(*) FROM games g WHERE g.developer_id = d.id) AS games
       FROM developers d JOIN users u ON u.id = d.user_id
       ORDER BY CASE d.status WHEN 'pending' THEN 0 ELSE 1 END, d.created_at DESC
       LIMIT 100`,
    ),
  ]);

  const pending = developers.filter((developer) => developer.status === "pending");
  const approved = developers.filter((developer) => developer.status !== "pending");

  return (
    <div className="fade-up">
      <header className="mb-5">
        <h1 className="text-xl font-extrabold">Developers</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          Community submissions, review queue and developer accounts.
        </p>
      </header>

      <section className="mb-7">
        <h2 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-[var(--color-muted)]">
          <Icon name="layers" size={15} /> Review queue
          {queue.length > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{ background: "rgba(250,204,21,.18)", color: "#FACC15" }}>
              {queue.length}
            </span>
          )}
        </h2>
        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[rgba(139,92,246,.3)] p-6 text-center text-[12.5px] text-[var(--color-muted)]">
            Nothing waiting. Submitted games appear here for testing.
          </p>
        ) : (
          <ReviewQueue items={queue as QueueRow[]} />
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-[var(--color-muted)]">
          <Icon name="users" size={15} /> Developer accounts
          {pending.length > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{ background: "rgba(34,211,238,.18)", color: "#22D3EE" }}>
              {pending.length} pending
            </span>
          )}
        </h2>
        <DeveloperApprovals pending={pending} approved={approved} />
      </section>
    </div>
  );
}
