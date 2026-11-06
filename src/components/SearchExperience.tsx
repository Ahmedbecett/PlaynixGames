"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameCard as GameCardData } from "@/lib/games";
import { GameCard } from "./GameCard";
import { Icon } from "./Icons";
import { useLocale, useT } from "./LocaleProvider";
import { SearchField } from "./SearchField";
import { useToast } from "./Toast";

type CategoryChip = { slug: string; name: string; icon: string; gameCount: number };
type Sort = "relevance" | "popular" | "newest" | "rating";

const PAGE_SIZE = 12;
const RECENT_KEY = "playnix.recent-searches";

export function SearchExperience({
  initialQuery,
  initialGames,
  initialTotal,
  categories,
  popular,
  favoriteIds,
  canFavorite,
  lockedIds,
}: {
  initialQuery: string;
  initialGames: GameCardData[];
  initialTotal: number;
  categories: CategoryChip[];
  popular: string[];
  favoriteIds: string[];
  canFavorite: boolean;
  lockedIds: string[];
}) {
  const t = useT();
  const { formatNumber } = useLocale();
  const { show } = useToast();
  const [sort, setSort] = useState<Sort>("relevance");
  const [pricing, setPricing] = useState<"" | "free" | "premium">("");
  const [category, setCategory] = useState("");
  const [games, setGames] = useState(initialGames);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestState, setSuggestState] = useState<"idle" | "sending" | "sent">("idle");
  const sentinel = useRef<HTMLDivElement | null>(null);
  const favourites = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);
  const filterSignature = `${sort}|${pricing}|${category}`;
  const lastSignature = useRef(filterSignature);

  const urlQuery = useMemo(() => {
    if (typeof window === "undefined") return initialQuery;
    return new URLSearchParams(window.location.search).get("q") ?? initialQuery;
  }, [initialQuery]);
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const remember = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    setRecent((current) => {
      const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (options: { append?: boolean } = {}) => {
      const params = new URLSearchParams();
      const trimmed = query.trim();
      if (trimmed) params.set("q", trimmed);
      if (sort !== "relevance" || trimmed) params.set("sort", sort);
      if (pricing) params.set("pricing", pricing);
      if (category) params.set("category", category);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", options.append ? String(games.length) : "0");

      if (options.append) setLoadingMore(true);
      else setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/games/search?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("failed");
        const payload = (await response.json()) as { games: GameCardData[]; total: number };
        setGames((current) => (options.append ? [...current, ...payload.games] : payload.games));
        setTotal(payload.total);
        const nextUrl = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
        window.history.replaceState(null, "", nextUrl);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, sort, pricing, category, games.length],
  );

  // Re-run when filters change (immediately) or when the query settles.
  useEffect(() => {
    const signature = filterSignature;
    const filtersChanged = lastSignature.current !== signature;
    lastSignature.current = signature;
    if (!filtersChanged && query.trim() === urlQuery.trim()) return;
    const timer = setTimeout(() => {
      void runSearch();
      remember(query);
    }, filtersChanged ? 0 : 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterSignature]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && !loadingMore && games.length < total) {
          void runSearch({ append: true });
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length, total, loading, loadingMore, runSearch]);

  async function submitSuggestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSuggestState("sending");
    try {
      const response = await fetch("/api/games/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") ?? ""),
          url: String(form.get("url") ?? ""),
          note: String(form.get("note") ?? ""),
        }),
      });
      if (!response.ok) throw new Error("failed");
      setSuggestState("sent");
      show(t("search.suggestionSent"), "success");
    } catch {
      setSuggestState("idle");
      show(t("common.error"), "error");
    }
  }

  const activeFilters = Boolean(pricing || category || sort !== "relevance");
  const showResults = query.trim().length > 0 || activeFilters;

  return (
    <div className="fade-up">
      <div className="mb-4">
        <SearchField initialValue={query} autoFocus placeholderKey="search.placeholder" />
      </div>

      {!query.trim() && (
        <div className="mb-5 space-y-4">
          {recent.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="eyebrow">{t("search.recent")}</h2>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[var(--color-cyan)]"
                  onClick={() => {
                    setRecent([]);
                    localStorage.removeItem(RECENT_KEY);
                  }}
                >
                  {t("search.clearRecent")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <button key={item} type="button" className="chip" onClick={() => setQuery(item)}>
                    <Icon name="clock" size={12} /> {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="eyebrow mb-2">{t("search.popular")}</h2>
            {popular.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popular.map((item) => (
                  <button key={item} type="button" className="chip" onClick={() => setQuery(item)}>
                    <Icon name="bolt" size={12} /> {item}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-muted)]">{t("search.popularEmpty")}</p>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
          <Icon name="filter" size={13} /> {t("common.filters")}
        </span>
        <button type="button" className="chip" data-active={pricing === ""} onClick={() => setPricing("")}>
          {t("common.all")}
        </button>
        <button type="button" className="chip" data-active={pricing === "free"} onClick={() => setPricing("free")}>
          {t("common.free")}
        </button>
        <button type="button" className="chip" data-active={pricing === "premium"} onClick={() => setPricing("premium")}>
          {t("common.premium")}
        </button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <select
          className="select h-9 w-auto py-0 text-xs"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          aria-label={t("search.sort")}
        >
          <option value="relevance">{t("search.sort.relevance")}</option>
          <option value="popular">{t("search.sort.popular")}</option>
          <option value="newest">{t("search.sort.newest")}</option>
          <option value="rating">{t("search.sort.rating")}</option>
        </select>
        <select
          className="select h-9 w-auto py-0 text-xs"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label={t("search.category")}
        >
          <option value="">{t("common.all")}</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        {activeFilters && (
          <button
            type="button"
            className="text-[11px] font-bold text-[var(--color-cyan)]"
            onClick={() => {
              setPricing("");
              setCategory("");
              setSort("relevance");
            }}
          >
            {t("common.reset")}
          </button>
        )}
      </div>

      {query.trim() && !loading && (
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          {t("search.resultsFor", { query: query.trim() })} · {formatNumber(total)}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-56" />
          ))}
        </div>
      ) : showResults && games.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                canFavorite={canFavorite}
                initiallyFavorite={favourites.has(game.id)}
                locked={locked.has(game.id)}
              />
            ))}
          </div>
          <div ref={sentinel} className="mt-5 text-center text-xs text-[var(--color-muted)]">
            {loadingMore ? t("common.loading") : games.length >= total ? t("search.endOfResults") : ""}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[rgba(139,92,246,.25)] p-5" style={{ background: "rgba(23,30,48,.6)" }}>
          <h3 className="mb-1 text-base font-extrabold">
            {t("search.noResultsTitle", { query: query.trim() || "—" })}
          </h3>
          <p className="mb-3 text-[13px] leading-relaxed text-[var(--color-muted)]">{t("search.noResultsBody")}</p>
          {!suggestOpen ? (
            <button type="button" className="btn btn-sm" onClick={() => setSuggestOpen(true)}>
              <Icon name="plus" size={14} /> {t("search.suggestGame")}
            </button>
          ) : suggestState === "sent" ? (
            <p className="text-sm font-semibold text-[var(--color-success)]">{t("search.suggestionSent")}</p>
          ) : (
            <form onSubmit={submitSuggestion} className="space-y-2">
              <p className="text-[11px] text-[var(--color-muted)]">{t("search.suggestHint")}</p>
              <input name="title" required minLength={2} maxLength={120} className="input" placeholder={t("admin.form.title")} defaultValue={query} />
              <input name="url" type="url" className="input" placeholder="https://" />
              <textarea name="note" className="textarea" rows={2} placeholder={t("common.optional")} />
              <button className="btn btn-sm" disabled={suggestState === "sending"}>
                {suggestState === "sending" ? t("common.sending") : t("common.submit")}
              </button>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[rgba(239,68,68,.4)] p-3 text-sm">
          <Icon name="info" size={16} style={{ color: "var(--color-danger)" }} />
          <span>{t("common.error")}</span>
          <button className="btn btn-sm ms-auto" onClick={() => void runSearch()}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {!showResults && games.length > 0 && (
        <div className="mt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold">{t("home.trending")}</h2>
            <Link href="/" className="text-xs font-bold text-[var(--color-cyan)]">
              {t("nav.home")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} canFavorite={canFavorite} initiallyFavorite={favourites.has(game.id)} locked={locked.has(game.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
