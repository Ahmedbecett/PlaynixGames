import { NextRequest } from "next/server";
import { clientIp, json, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { popularSearches, recordSearch, searchGames, toCard, type SortKey } from "@/lib/games";
import { consume } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SORTS: SortKey[] = ["relevance", "popular", "newest", "rating"];

export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const sortParam = params.get("sort") as SortKey | null;
  const pricingParam = params.get("pricing");
  const limit = Number(params.get("limit") ?? 20);
  const offset = Number(params.get("offset") ?? 0);
  const suggest = params.get("suggest") === "1";

  const { games, total } = await searchGames({
    query: query || undefined,
    category: params.get("category") ?? undefined,
    pricing: pricingParam === "free" || pricingParam === "premium" ? pricingParam : undefined,
    sort: sortParam && SORTS.includes(sortParam) ? sortParam : undefined,
    limit,
    offset,
  });

  // Only log real, deliberate searches — not suggestion keystrokes.
  if (query.length >= 2 && !suggest) {
    const allowed = consume(`search:${clientIp(request)}`, 40, 60_000).ok;
    if (allowed) {
      const user = await getCurrentUser();
      await recordSearch(user?.id ?? null, query, total).catch(() => undefined);
    }
  }

  const popular = suggest ? [] : await popularSearches(8);

  return json({ games: games.map(toCard), total, query, popular, suggestions: games.slice(0, 5).map((g) => g.title) });
});
