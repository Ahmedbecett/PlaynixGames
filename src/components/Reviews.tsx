"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { useLocale, useT } from "./LocaleProvider";
import { RatingInput, StarsDisplay } from "./Rating";
import { useToast } from "./Toast";
import { botStartAppLink, gameStartParam } from "@/lib/telegram-links";

export type Review = {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  author: { name: string; photoUrl: string | null; username: string | null };
};

/**
 * Shown in place of the review list while a game has no reviews yet.
 *
 * Signed-in players get the star panel that opens the form. Guests are sent to
 * the Telegram bot instead: the website has no password login, so every review
 * is written by someone who authenticated through the bot. Sending a guest to an
 * empty form would be a dead end, and telling them to "sign in" points at a page
 * that does not exist.
 */
function GuestAwarePanel({
  canReview,
  telegramUrl,
  onActivate,
}: {
  canReview: boolean;
  telegramUrl: string | null;
  onActivate: () => void;
}) {
  const t = useT();
  const stars = (
    <span className="flex items-center gap-1" aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon key={star} name="star" size={21} filled style={{ color: "#FFB35C" }} />
      ))}
    </span>
  );
  const className =
    "flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(255,179,92,.42)] p-5 text-center transition hover:border-[rgba(255,179,92,.75)]";
  const style = { background: "rgba(255,179,92,.07)" };

  if (canReview) {
    return (
      <button type="button" onClick={onActivate} className={className} style={style}>
        {stars}
        <span className="text-sm font-extrabold">{t("reviews.ctaFirst")}</span>
        <span className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">{t("game.noReviews")}</span>
        <span className="mt-0.5 text-[11px] font-bold text-[var(--color-cyan)]">{t("reviews.tapStar")}</span>
      </button>
    );
  }

  const label = (
    <>
      {stars}
      <span className="text-sm font-extrabold">{t("reviews.ctaTitle")}</span>
      <span className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">{t("game.noReviews")}</span>
      <span className="mt-0.5 text-[11px] font-bold text-[var(--color-cyan)]">{t("reviews.guestCta")}</span>
    </>
  );

  if (!telegramUrl) {
    return (
      <div className={className} style={style}>
        {label}
      </div>
    );
  }

  return (
    <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {label}
    </a>
  );
}

export function Reviews({
  gameId,
  gameSlug,
  initialReviews,
  average,
  total,
  initialRating,
  initialText,
  canReview,
}: {
  gameId: string;
  /** Used to deep-link guests into this game inside the Telegram bot. */
  gameSlug: string;
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
        <GuestAwarePanel
          canReview={canReview}
          telegramUrl={botStartAppLink(gameStartParam(gameSlug))}
          onActivate={() => setOpen(true)}
        />
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
