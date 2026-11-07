import { NextRequest } from "next/server";
import { json, route } from "@/lib/api";
import { searchGames, toCard, type SortKey } from "@/lib/games";

export const dynamic = "force-dynamic";

const SORTS: SortKey[] = ["relevance", "popular", "newest", "rating"];

export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const sortParam = params.get("sort") as SortKey | null;
  const pricingParam = params.get("pricing");
  const { games, total } = await searchGames({
    query: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    pricing: pricingParam === "free" || pricingParam === "premium" ? pricingParam : undefined,
    sort: sortParam && SORTS.includes(sortParam) ? sortParam : undefined,
    limit: Number(params.get("limit") ?? 20),
    offset: Number(params.get("offset") ?? 0),
  });

  return json({ games: games.map(toCard), total, limit: Number(params.get("limit") ?? 20), offset: Number(params.get("offset") ?? 0) });
});
