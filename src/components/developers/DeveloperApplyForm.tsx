"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

/** Application form for a new developer account. */
export function DeveloperApplyForm() {
  const router = useRouter();
  const { show } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [studioUrl, setStudioUrl] = useState("");
  const [country, setCountry] = useState("");
  const [payoutTelegram, setPayoutTelegram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/developers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, studioUrl, country, payoutTelegram }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not send the application.");
        return;
      }
      show("Application sent. We will review it shortly.", "success");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-[rgba(139,92,246,.25)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Studio or developer name *</span>
        <input
          className="input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Pixel Forge"
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Website or portfolio</span>
        <input
          className="input"
          value={studioUrl}
          onChange={(event) => setStudioUrl(event.target.value)}
          placeholder="https://yourstudio.example"
          maxLength={300}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Country</span>
          <input className="input" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Algeria" maxLength={80} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Payout Telegram</span>
          <input
            className="input"
            value={payoutTelegram}
            onChange={(event) => setPayoutTelegram(event.target.value)}
            placeholder="@username"
            maxLength={80}
          />
        </label>
      </div>
      {error && <p className="text-[12px] font-semibold text-[#F87171]">{error}</p>}
      <button className="btn w-full" disabled={busy}>
        <Icon name="check" size={15} />
        {busy ? "Sending…" : "Apply to publish"}
      </button>
      <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
        By applying you agree that your games are your own work and that you grant Playnix a licence to host and
        distribute them. Revenue share is 70% to you.
      </p>
    </form>
  );
}
