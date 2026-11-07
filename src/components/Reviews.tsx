"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { useLocale, useT } from "./LocaleProvider";
import { RatingInput, StarsDisplay } from "./Rating";
import { useToast } from "./Toast";

export type Review = {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  author: { name: string; photoUrl: string | null; username: string | null };
};

export function Reviews({
  gameId,
  initialReviews,
  average,
  total,
  initialRating,
  initialText,
  canReview,
}: {
  gameId: string;
  initialReviews: Review[];
  average: number;
  total: number;
  initialRating: number;
  initialText: string;
  canReview: boolean;
}) {
  const t = useT();
  const { formatDate } = useLocale();
  const { show } = useToast();
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);
  const [stats, setStats] = useState({ average, total });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canReview) {
      show(t("game.reviewLoginRequired"), "info");
      return;
    }
    if (rating < 1) {
      show(t("game.rateThis"), "info");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/games/${gameId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: text }),
      });
      if (!response.ok) throw new Error("failed");
      const payload = (await response.json()) as { average: number; total: number };
      setStats({ average: payload.average, total: payload.total });
      setOpen(false);
      show(t("game.reviewSubmitted"), "success");
      const refreshed = await fetch(`/api/games/${gameId}/reviews?limit=20`, { cache: "no-store" });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as { reviews: Review[] };
        setReviews(data.reviews);
      }
    } catch {
      show(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reviews" className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold tracking-tight">{t("game.reviews")}</h2>
          <StarsDisplay value={stats.average} count={stats.total} />
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen((current) => !current)}>
          <Icon name="star" size={14} />
          {t("game.writeReview")}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mb-4 rounded-2xl border border-[rgba(139,92,246,.28)] p-4" style={{ background: "rgba(23,30,48,.62)" }}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">{t("game.yourRating")}</p>
          <RatingInput initial={rating} onChange={setRating} />
          <textarea
            className="textarea mt-3"
            rows={3}
            maxLength={1200}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("game.reviewPlaceholder")}
          />
          <div className="mt-3 flex gap-2">
            <button className="btn btn-sm" disabled={busy}>
              {busy ? t("common.sending") : t("game.submitReview")}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </button>
          </div>
          {!canReview && <p className="mt-2 text-[11px] text-[var(--color-muted)]">{t("game.reviewLoginRequired")}</p>}
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[rgba(161,170,189,.25)] p-4 text-center text-xs text-[var(--color-muted)]">
          {t("game.noReviews")}
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl p-3.5" style={{ background: "rgba(23,30,48,.55)", border: "1px solid rgba(139,92,246,.16)" }}>
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar photoUrl={review.author.photoUrl} name={review.author.name} size={30} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{review.author.name}</p>
                  <p className="text-[10px] text-[var(--color-muted)]">{formatDate(review.createdAt)}</p>
                </div>
                <span className="ms-auto flex items-center gap-0.5" aria-label={`${review.rating} / 5`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon key={star} name="star" size={12} filled={review.rating >= star} style={{ color: review.rating >= star ? "#FFB35C" : "#3f4658" }} />
                  ))}
                </span>
              </div>
              {review.text && <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">{review.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
