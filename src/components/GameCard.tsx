"use client";

import Link from "next/link";
import { useState } from "react";
import type { GameCard as GameCardData } from "@/lib/games";
import { useLocale, useT } from "./LocaleProvider";
import { useTelegram } from "./TelegramBridge";
import { useToast } from "./Toast";
import { Icon } from "./Icons";

export function GameCard({
  game,
  initiallyFavorite = false,
  canFavorite = false,
  locked = false,
  variant = "grid",
}: {
  game: GameCardData;
  initiallyFavorite?: boolean;
  canFavorite?: boolean;
  locked?: boolean;
  variant?: "grid" | "row";
}) {
  const t = useT();
  const { formatNumber } = useLocale();
  const { haptic } = useTelegram();
  const { show } = useToast();
  const [favorite, setFavorite] = useState(initiallyFavorite);
  const [busy, setBusy] = useState(false);

  async function toggleFavorite(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!canFavorite || busy) return;
    setBusy(true);
    const next = !favorite;
    setFavorite(next);
    haptic("light");
    try {
      const response = next
        ? await fetch("/api/users/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId: game.id }),
          })
        : await fetch(`/api/users/favorites/${game.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      haptic("success");
    } catch {
      setFavorite(!next);
      show(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  const cover = game.coverUrl || "/covers/placeholder.svg";

  return (
    <div
      className={`game-card card-glow hover-lift press ${variant === "row" ? "w-[210px]" : "w-full"}`}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Link href={`/game/${game.slug}`} className="game-card__cover block" aria-label={game.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" loading="lazy" decoding="async" />
        <span className={`game-card__badge ${game.pricingType === "premium" ? "badge-premium" : "badge-free"}`}>
          {game.pricingType === "premium" ? (
            <>
              <Icon name="crown" size={10} /> {t("common.premium")}
            </>
          ) : (
            t("common.free")
          )}
        </span>
        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 55%,rgba(9,11,20,.9))" }} />
        {game.featured && (
          <span
            className="absolute top-2 end-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
            style={{ background: "rgba(255,122,24,.9)", color: "#0b0f18" }}
          >
            {t("common.featured")}
          </span>
        )}
        {locked && (
          <span className="absolute inset-0 grid place-items-center" style={{ background: "rgba(9,11,20,.55)" }}>
            <span className="rounded-full p-2.5" style={{ background: "rgba(139,92,246,.9)" }}>
              <Icon name="crown" size={18} />
            </span>
          </span>
        )}
        {canFavorite && (
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={favorite ? t("game.removeFavorite") : t("game.addFavorite")}
            aria-pressed={favorite}
            className="absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full transition"
            style={{
              background: favorite ? "rgba(255,122,24,.92)" : "rgba(9,11,20,.65)",
              border: "1px solid rgba(248,250,252,.22)",
              color: favorite ? "#0b0f18" : "#F8FAFC",
              backdropFilter: "blur(8px)",
            }}
          >
            <Icon name="heart" size={16} filled={favorite} />
          </button>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/game/${game.slug}`} className="text-[0.95rem] font-extrabold leading-tight hover:text-[var(--color-cyan)]">
          {game.title}
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
          <span className="truncate">{game.category || game.developer}</span>
          {game.ratingCount > 0 && (
            <span className="flex shrink-0 items-center gap-1" aria-label={t("common.rating")}>
              <Icon name="star" size={11} filled style={{ color: "#FFB35C" }} />
              {game.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
        {game.developer ? (
          <p className="truncate text-[10px] text-[var(--color-muted)]">{game.developer}</p>
        ) : null}
        <p className="line-clamp-2 text-[11.5px] leading-snug text-[var(--color-muted)]">{game.shortDescription}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="truncate text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            {formatNumber(game.playCount)} {t("home.plays")} · {game.gameType === "html5" ? "HTML5" : game.gameType}
          </span>
          <Link href={`/play/${game.slug}`} className="btn btn-sm" onClick={(event) => event.stopPropagation()}>
            <Icon name="play" size={13} filled />
            {t("common.play")}
          </Link>
        </div>
      </div>
    </div>
  );
}
