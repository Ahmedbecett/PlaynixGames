"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";

export type HeroGame = {
  slug: string;
  title: string;
  shortDescription: string;
  coverUrl: string | null;
  category: string;
  ratingAvg: number;
  ratingCount: number;
  pricingType: "free" | "premium";
};

export function HeroCarousel({
  games,
  eyebrow,
  playLabel,
  detailsLabel,
  premiumLabel,
}: {
  games: HeroGame[];
  eyebrow: string;
  playLabel: string;
  detailsLabel: string;
  premiumLabel: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (games.length < 2) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % games.length), 6500);
    return () => window.clearInterval(id);
  }, [games.length]);

  if (games.length === 0) return null;
  const game = games[Math.min(index, games.length - 1)];
  const cover = game.coverUrl || "/covers/placeholder.svg";

  return (
    <section className="hero-banner mb-5" aria-roledescription="carousel" aria-label={game.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="hero-banner__img" />
      <div className="hero-banner__shade" />
      <div className="hero-banner__body">
        <span className="eyebrow flex items-center gap-1.5">
          <Icon name="bolt" size={12} style={{ color: "var(--color-orange)" }} />
          {eyebrow}
        </span>
        <h1 className="max-w-xl text-[1.45rem] font-[850] leading-[1.12] tracking-tight sm:text-3xl">{game.title}</h1>
        {game.shortDescription ? (
          <p className="mt-1 max-w-md line-clamp-2 text-[13px] leading-snug text-[var(--color-muted)]">{game.shortDescription}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted)]">
          {game.category ? <span>{game.category}</span> : null}
          {game.ratingCount > 0 ? <span>★ {game.ratingAvg.toFixed(1)}</span> : null}
          {game.pricingType === "premium" ? (
            <span className="font-bold" style={{ color: "#cbb6ff" }}>
              {premiumLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={`/play/${game.slug}`} className="btn btn-sm">
            <Icon name="play" size={14} filled />
            {playLabel}
          </Link>
          <Link href={`/game/${game.slug}`} className="btn btn-ghost btn-sm">
            {detailsLabel}
          </Link>
        </div>
        {games.length > 1 ? (
          <div className="hero-dots" role="tablist">
            {games.map((item, itemIndex) => (
              <button
                key={item.slug}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
                aria-label={item.title}
                data-active={itemIndex === index}
                onClick={() => setIndex(itemIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
