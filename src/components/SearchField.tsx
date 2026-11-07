"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "./LocaleProvider";
import { Icon } from "./Icons";

export function SearchField({
  initialValue = "",
  autoFocus = false,
  placeholderKey = "home.searchPlaceholder",
}: {
  initialValue?: string;
  autoFocus?: boolean;
  placeholderKey?: "home.searchPlaceholder" | "search.placeholder";
}) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<{ title: string; slug: string; cover: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useT();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/games/search?q=${encodeURIComponent(value.trim())}&limit=5&suggest=1`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (payload?.games) setSuggestions(payload.games.slice(0, 5));
        })
        .catch(() => {});
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    setOpen(false);
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <form onSubmit={submit} role="search">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--color-muted)]">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoFocus={autoFocus}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t(placeholderKey)}
            aria-label={t("search.title")}
            className="input ps-10 pe-3 h-11"
            style={{ background: "rgba(9,11,20,.55)" }}
          />
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="glass absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl p-1.5 shadow-2xl">
          {suggestions.map((game) => (
            <button
              key={game.slug}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/game/${game.slug}`);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition hover:bg-white/5"
            >
              {game.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={game.cover} alt="" className="h-9 w-14 rounded-md object-cover" loading="lazy" />
              ) : (
                <span className="grid h-9 w-14 place-items-center rounded-md bg-white/5 text-[var(--color-muted)]">
                  <Icon name="gamepad" size={16} />
                </span>
              )}
              <span className="text-sm font-semibold">{game.title}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={submit}
            className="mt-1 w-full rounded-lg px-2 py-2 text-start text-xs font-semibold text-[var(--color-cyan)] hover:bg-white/5"
          >
            {t("common.search")} “{value.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
