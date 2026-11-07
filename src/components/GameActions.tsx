"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "./LocaleProvider";
import { useTelegram } from "./TelegramBridge";
import { botStartAppLink, gameStartParam } from "@/lib/telegram-links";
import { useToast } from "./Toast";
import { Icon } from "./Icons";

const REASONS = ["not_working", "broken_link", "inappropriate", "copyright", "other"] as const;

export function GameActions({
  gameId,
  slug,
  title,
  initiallyFavorite,
  canInteract,
  isPremiumGame,
  hasPremium,
  playable,
  externalUrl,
}: {
  gameId: string;
  slug: string;
  title: string;
  initiallyFavorite: boolean;
  canInteract: boolean;
  isPremiumGame: boolean;
  hasPremium: boolean;
  playable: boolean;
  externalUrl?: string | null;
}) {
  const t = useT();
  const { haptic, shareUrl, openExternal } = useTelegram();
  const { show } = useToast();
  const [favorite, setFavorite] = useState(initiallyFavorite);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("not_working");
  const [details, setDetails] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent">("idle");

  const locked = isPremiumGame && !hasPremium;

  async function toggleFavorite() {
    if (!canInteract || busy) {
      if (!canInteract) show(t("game.reviewLoginRequired"), "info");
      return;
    }
    setBusy(true);
    const next = !favorite;
    setFavorite(next);
    haptic("light");
    try {
      const response = next
        ? await fetch("/api/users/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId }),
          })
        : await fetch(`/api/users/favorites/${gameId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      haptic("success");
      show(next ? t("game.addFavorite") : t("game.removeFavorite"), "success");
    } catch {
      setFavorite(!next);
      show(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = botStartAppLink(gameStartParam(slug)) ?? `${window.location.origin}/game/${slug}`;
    const result = await shareUrl(url, `${title} · Playnix`);
    if (result === "copied") show(t("game.shareCopied"), "success");
    if (result === "failed") show(t("common.error"), "error");
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    setReportState("sending");
    try {
      const response = await fetch(`/api/games/${gameId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      if (!response.ok) throw new Error("failed");
      setReportState("sent");
      show(t("game.reportSubmitted"), "success");
      setTimeout(() => {
        setReportOpen(false);
        setReportState("idle");
        setDetails("");
      }, 1200);
    } catch {
      setReportState("idle");
      show(t("common.error"), "error");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {playable && !locked ? (
          <Link href={`/play/${slug}`} className="btn flex-1 sm:flex-none">
            <Icon name="play" size={16} filled />
            {t("common.playNow")}
          </Link>
        ) : locked ? (
          <Link href="/premium" className="btn flex-1 sm:flex-none" style={{ background: "linear-gradient(135deg,#8B5CF6,#22D3EE)" }}>
            <Icon name="crown" size={16} />
            {t("game.unlockPremium")}
          </Link>
        ) : externalUrl ? (
          <button className="btn flex-1 sm:flex-none" onClick={() => openExternal(externalUrl)}>
            <Icon name="external" size={16} />
            {t("game.externalCta")}
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={toggleFavorite}
          aria-pressed={favorite}
          disabled={busy}
          style={favorite ? { borderColor: "rgba(255,122,24,.6)", color: "var(--color-orange)" } : undefined}
        >
          <Icon name="heart" size={16} filled={favorite} />
          {favorite ? t("game.removeFavorite") : t("game.addFavorite")}
        </button>

        <button type="button" className="btn btn-ghost" onClick={share}>
          <Icon name="share" size={16} />
          {t("game.share")}
        </button>

        <button type="button" className="icon-btn" onClick={() => setReportOpen(true)} aria-label={t("game.report")}>
          <Icon name="flag" size={17} />
        </button>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: "rgba(9,11,20,.78)", backdropFilter: "blur(6px)" }}>
          <form
            onSubmit={submitReport}
            className="glass fade-up w-full max-w-sm rounded-2xl p-5"
            role="dialog"
            aria-modal="true"
            aria-label={t("game.report")}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-extrabold">{t("game.report")}</h3>
              <button type="button" className="icon-btn" onClick={() => setReportOpen(false)} aria-label={t("common.close")}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <p className="mb-2 text-xs text-[var(--color-muted)]">{t("game.reportReason")}</p>
            <div className="mb-3 space-y-1.5">
              {REASONS.map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                  style={{ background: reason === item ? "rgba(255,122,24,.14)" : "rgba(9,11,20,.4)" }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={item}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                    className="accent-[var(--color-orange)]"
                  />
                  {t(`game.report.${item}`)}
                </label>
              ))}
            </div>
            <textarea
              className="textarea mb-3"
              rows={2}
              maxLength={1000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t("common.optional")}
            />
            <button className="btn w-full" disabled={reportState !== "idle"}>
              {reportState === "sent" ? t("game.reportSubmitted") : reportState === "sending" ? t("common.sending") : t("common.submit")}
            </button>
            {!canInteract && <p className="mt-2 text-[11px] text-[var(--color-muted)]">{t("game.reviewLoginRequired")}</p>}
          </form>
        </div>
      )}
    </>
  );
}
