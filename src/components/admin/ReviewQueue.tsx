"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import type { QueueRow } from "@/lib/developers";

type Action = "approve" | "reject" | "request_changes" | "disable";

const ACTIONS: { key: Action; label: string; tone: "primary" | "danger" | "ghost" }[] = [
  { key: "approve", label: "Approve & publish", tone: "primary" },
  { key: "request_changes", label: "Request changes", tone: "ghost" },
  { key: "reject", label: "Reject", tone: "danger" },
];

/**
 * The moderation queue.
 *
 * Every row links straight to the live build so the reviewer can actually play
 * it before deciding — the whole point of the queue is that a human checked.
 */
export function ReviewQueue({ items }: { items: QueueRow[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(gameId: string, action: Action, feedback: string) {
    setBusy(gameId);
    try {
      const response = await fetch(`/api/admin/review/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: feedback }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        show(payload?.error?.message ?? "That did not work.", "error");
        return;
      }
      show(
        action === "approve" ? "Published" : action === "reject" ? "Rejected" : "Changes requested",
        "success",
      );
      setOpenFor(null);
      setNote("");
      router.refresh();
    } catch {
      show("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-[rgba(139,92,246,.2)] p-3"
          style={{ background: "rgba(23,30,48,.55)" }}
        >
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.cover_url || "/covers/placeholder.svg"}
              alt=""
              className="h-14 w-20 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold">{item.title}</p>
              <p className="truncate text-[11px] text-[var(--color-muted)]">
                by {item.developer_name} · {item.category_name ?? "Uncategorised"}
              </p>
              <p className="truncate text-[11px] text-[var(--color-muted)]">{item.game_url}</p>
              <p className="mt-0.5 text-[10.5px] text-[var(--color-muted)]">
                Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : item.created_at.slice(0, 10)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.game_url && (
              <a
                href={item.game_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
              >
                <Icon name="external" size={13} /> Play build
              </a>
            )}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setOpenFor(openFor === item.id ? null : item.id);
                setNote(item.review_note ?? "");
              }}
            >
              <Icon name="flag" size={13} /> Review…
            </button>
          </div>

          {openFor === item.id && (
            <div className="mt-2.5 rounded-lg border border-[rgba(139,92,246,.25)] p-2.5" style={{ background: "rgba(11,16,32,.6)" }}>
              <textarea
                className="textarea"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Feedback for the developer (shown with the decision)."
                maxLength={1000}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => decide(item.id, action.key, note)}
                    className={`btn btn-sm ${action.tone === "ghost" ? "btn-ghost" : action.tone === "danger" ? "btn-outline" : ""}`}
                    style={action.tone === "danger" ? { color: "#F87171", borderColor: "rgba(248,113,113,.4)" } : undefined}
                  >
                    {busy === item.id ? "…" : action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
