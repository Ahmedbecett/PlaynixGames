/**
 * Response types for the Playnix HTTP API, mirroring the route handlers under
 * `src/app/api`. They are intentionally structural (plain objects), so they can
 * be used for validation or documentation as well as for typing.
 */

export type PricingType = "free" | "premium";
export type SortKey = "relevance" | "popular" | "newest" | "rating";

export type GameCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  coverUrl: string | null;
  category: string;
  pricingType: PricingType;
  ratingAvg: number;
  ratingCount: number;
  playCount: number;
  gameType: string;
  featured: boolean;
};

export type GameDetail = GameCard & {
  description: string | null;
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null;
  supportedDevices: string | null;
  controls: string | null;
  languages: string | null;
  license: string | null;
  source: string | null;
  orientation: string | null;
  verified: boolean;
  playableUrl: string | null;
};

export type GameResponse = {
  game: GameDetail;
  screenshots: string[];
  similar: GameCard[];
};

export type GamesResponse = {
  games: GameCard[];
  total: number;
  limit: number;
  offset: number;
};

export type SearchResponse = GamesResponse & {
  query: string;
  popular: string[];
  suggestions: string[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  gameCount?: number;
};

export type CategoriesResponse = { categories: Category[] };

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  features: string[];
};

export type PlansResponse = { currency: "XTR"; plans: Plan[] };

export type SessionUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  language: string;
  role: string;
};

export type SignInResponse = { user: SessionUser; created: boolean };

export type MeResponse = {
  user: SessionUser;
  premium: boolean;
  subscription: { expiresAt: string } | null;
  stats: { gamesPlayed: number; favorites: number; totalPlayMs: number };
};

export type InvoiceResponse = { invoiceLink: string; planId: string; amount: number };

export type PlaySessionResponse = { sessionId: string; startedAt: string };

export type HealthResponse = {
  ok: boolean;
  dialect: string;
  catalog: { publishedGames: number };
  integrations: Record<string, unknown>;
  timestamp: string;
};

export type FavoritesResponse = { favorites: Array<GameCard & { favorited_at: string }> };
