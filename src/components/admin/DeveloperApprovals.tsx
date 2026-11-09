"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

type Row = {
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

/** Approve, reject or suspend developer accounts. */
export function DeveloperApprovals({ pending, approved }: { pending: Row[]; approved: Row[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: "approved" | "rejected" | "suspended") {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/developers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        show("Could not update the account.", "error");
        return;
      }
      show(`Developer ${status}`, "success");
      router.refresh();
    } catch {
      show("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (pending.length === 0 && approved.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[rgba(139,92,246,.3)] p-6 text-center text-[12.5px] text-[var(--color-muted)]">
        No developer accounts yet. Applications arrive here for approval.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {[...pending, ...approved].map((developer) => (
        <div
          key={developer.id}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(139,92,246,.2)] p-3"
          style={{ background: "rgba(23,30,48,.55)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">
              {developer.display_name}
              <span
                className="ms-2 rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  color:
                    developer.status === "approved" ? "#22C55E" : developer.status === "pending" ? "#FACC15" : "#F87171",
                  background:
                    developer.status === "approved"
                      ? "rgba(34,197,94,.15)"
                      : developer.status === "pending"
                        ? "rgba(250,204,21,.15)"
                        : "rgba(248,113,113,.15)",
                }}
              >
                {developer.status}
              </span>
            </p>
            <p className="truncate text-[11px] text-[var(--color-muted)]">
              @{developer.username ?? developer.first_name ?? "—"}
              {developer.country ? ` · ${developer.country}` : ""} · {developer.games} game(s)
            </p>
          </div>
          <div className="flex gap-1.5">
            {developer.status === "pending" && (
              <>
                <button className="btn btn-sm" disabled={busy === developer.id} onClick={() => setStatus(developer.id, "approved")}>
                  <Icon name="check" size={13} /> Approve
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  style={{ color: "#F87171" }}
                  disabled={busy === developer.id}
                  onClick={() => setStatus(developer.id, "rejected")}
                >
                  Reject
                </button>
              </>
            )}
            {developer.status === "approved" && (
              <button
                className="btn btn-sm btn-ghost"
                disabled={busy === developer.id}
                onClick={() => setStatus(developer.id, "suspended")}
              >
                Suspend
              </button>
            )}
            {developer.status === "suspended" && (
              <button className="btn btn-sm btn-ghost" disabled={busy === developer.id} onClick={() => setStatus(developer.id, "approved")}>
                Restore
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
