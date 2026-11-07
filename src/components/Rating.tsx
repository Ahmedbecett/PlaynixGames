"use client";

import { useState } from "react";
import { useT } from "./LocaleProvider";
import { Icon } from "./Icons";

export function StarsDisplay({ value, count }: { value: number; count: number }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1.5" aria-label={`${t("common.rating")}: ${value} / 5`}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            size={14}
            filled={value >= star - 0.5}
            style={{ color: value >= star - 0.5 ? "#FFB35C" : "rgba(161,170,189,.45)" }}
          />
        ))}
      </span>
      <span className="text-xs font-bold">{value > 0 ? value.toFixed(1) : "—"}</span>
      <span className="text-[11px] text-[var(--color-muted)]">
        ({count}) {count === 0 ? `· ${t("common.notRated")}` : ""}
      </span>
    </div>
  );
}

export function RatingInput({
  initial = 0,
  onChange,
}: {
  initial?: number;
  onChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(0);
  const t = useT();
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t("game.rateThis")}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} / 5`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => {
            setValue(star);
            onChange?.(star);
          }}
          className="press grid h-9 w-9 place-items-center rounded-lg"
          style={{ background: active >= star ? "rgba(255,179,92,.14)" : "rgba(23,30,48,.6)" }}
        >
          <Icon name="star" size={20} filled={active >= star} style={{ color: active >= star ? "#FFB35C" : "#5b6478" }} />
        </button>
      ))}
    </div>
  );
}
