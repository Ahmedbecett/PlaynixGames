"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

/** Resubmit / withdraw controls for a developer's own game. */
export function DeveloperGameActions({ gameId, status }: { gameId: string; status: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState<"submit" | "withdraw" | null>(null);

  async function act(kind: "submit" | "withdraw") {
    setBusy(kind);
    try {
      const response = await fetch(
        kind === "submit" ? `/api/developers/games/${gameId}/resubmit` : `/api/developers/games/${gameId}/withdraw`,
        { method: "POST" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        show(payload?.error?.message ?? "That did not work.", "error");
        return;
      }
      show(kind === "submit" ? "Resubmitted for review" : "Withdrawn from review", "success");
      router.refresh();
    } catch {
      show("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  const canSubmit = status !== "pending" && status !== "published" && status !== "disabled";
  const canWithdraw = status === "pending" || status === "published";

  if (!canSubmit && !canWithdraw) return null;

  return (
    <div className="mt-4 flex gap-2">
      {canSubmit && (
        <button className="btn btn-sm flex-1" onClick={() => act("submit")} disabled={busy !== null}>
          <Icon name="check" size={14} /> {busy === "submit" ? "Sending…" : "Resubmit for review"}
        </button>
      )}
      {canWithdraw && (
        <button className="btn btn-sm btn-outline flex-1" onClick={() => act("withdraw")} disabled={busy !== null}>
          <Icon name="pause" size={14} /> {busy === "withdraw" ? "Working…" : "Withdraw"}
        </button>
      )}
    </div>
  );
}
