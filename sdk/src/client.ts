/**
 * `PlaynixClient` — a small, dependency-free client for the Playnix HTTP API.
 *
 * It runs anywhere `fetch` exists (browser, Node 18+, Bun, Deno, Workers) and
 * keeps the session cookie it receives from `/api/auth/telegram`, so a server
 * can act on behalf of a Mini App user without a browser.
 */
import { PlaynixError } from "./errors.js";
import type {
  CategoriesResponse,
  FavoritesResponse,
  GameResponse,
  GamesResponse,
  HealthResponse,
  InvoiceResponse,
  MeResponse,
  PlaySessionResponse,
  PlansResponse,
  PricingType,
  SearchResponse,
  SessionUser,
  SignInResponse,
  SortKey,
} from "./types.js";

/** Structural subset of `fetch` so any runtime's implementation fits. */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    cache?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
  text?(): Promise<string>;
}>;

export type ClientOptions = {
  /** Origin of the deployment, e.g. `https://playnix-ashen.vercel.app`. */
  baseUrl: string;
  /** Custom fetch (defaults to the global one). */
  fetch?: FetchLike;
  /** Session cookie, e.g. `playnix_session=…`, or `null` for anonymous calls. */
  sessionCookie?: string | null;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Per-request timeout in ms (default 15 000). */
  timeoutMs?: number;
  /** Language hint sent as a cookie (`playnix_locale`). */
  locale?: "en" | "ar" | "fr";
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Same-origin header required by state-changing endpoints. */
  origin?: string;
  signal?: AbortSignal;
};

const STATUS_CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  402: "payment_required",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation_error",
  429: "rate_limited",
  500: "internal_error",
  502: "bad_gateway",
  503: "unavailable",
};

export class PlaynixClient {
  readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private cookie: string | null;
  private readonly locale?: string;

  constructor(options: ClientOptions) {
    if (!options?.baseUrl) throw new PlaynixError("baseUrl is required", { code: "config" });
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    const runtimeFetch = options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!runtimeFetch) {
      throw new PlaynixError("No fetch implementation available — pass `fetch` in the options.", { code: "config" });
    }
    this.fetchImpl = runtimeFetch;
    this.headers = { accept: "application/json", ...(options.headers ?? {}) };
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.cookie = options.sessionCookie ?? null;
    this.locale = options.locale;
  }

  /** Session cookie the client is currently using (useful to persist it). */
  get sessionCookie(): string | null {
    return this.cookie;
  }

  setSessionCookie(cookie: string | null): void {
    this.cookie = cookie;
  }

  // ---------------------------------------------------------------- transport

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { ...this.headers };
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (this.cookie) headers.cookie = this.cookie;
    if (this.locale) headers["x-playnix-locale"] = this.locale;
    if (options.origin) headers.origin = options.origin;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort);

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      const aborted = controller.signal.aborted;
      throw new PlaynixError(
        aborted ? `Request timed out after ${this.timeoutMs}ms` : `Network error: ${(error as Error).message}`,
        { code: aborted ? "timeout" : "network_error", url },
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }

    const raw = await response.json().catch(() => null);

    if (!response.ok) {
      const errorBody = raw as { error?: { message?: string; code?: string } } | null;
      throw new PlaynixError(errorBody?.error?.message ?? `Request failed with status ${response.status}`, {
        code: errorBody?.error?.code ?? STATUS_CODES[response.status] ?? "http_error",
        status: response.status,
        body: raw,
        url,
      });
    }

    // Remember rotated session cookies so sign-in works end to end.
    const setCookie = response.headers?.get?.("set-cookie");
    if (setCookie) {
      const session = /playnix_session=[^;]+/.exec(setCookie);
      if (session) this.cookie = session[0];
    }

    return raw as T;
  }

  // ------------------------------------------------------------------ catalog

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/health");
  }

  listCategories(): Promise<CategoriesResponse> {
    return this.request<CategoriesResponse>("/api/categories");
  }

  listGames(params: {
    q?: string;
    category?: string;
    pricing?: PricingType;
    sort?: SortKey;
    limit?: number;
    offset?: number;
  } = {}): Promise<GamesResponse> {
    return this.request<GamesResponse>("/api/games", { query: params });
  }

  search(query: string, params: { limit?: number; offset?: number; sort?: SortKey; category?: string; suggest?: boolean } = {}): Promise<SearchResponse> {
    return this.request<SearchResponse>("/api/games/search", { query: { q: query, ...params } });
  }

  /** Accepts either a slug or a UUID. */
  getGame(idOrSlug: string): Promise<GameResponse> {
    return this.request<GameResponse>(`/api/games/${encodeURIComponent(idOrSlug)}`);
  }

  // ----------------------------------------------------------------- payments

  listPlans(): Promise<PlansResponse> {
    return this.request<PlansResponse>("/api/premium/plans");
  }

  /** Requires a session (see `signIn`). Returns a Telegram Stars invoice link. */
  createInvoice(planId: string): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>("/api/payments/create-invoice", {
      method: "POST",
      body: { planId },
      origin: this.baseUrl,
    });
  }

  // ------------------------------------------------------------------ account

  /** Exchanges Mini App `initData` for a session cookie (stored on the client). */
  async signIn(initData: string): Promise<SignInResponse> {
    const result = await this.request<SignInResponse>("/api/auth/telegram", {
      method: "POST",
      body: { initData },
      origin: this.baseUrl,
    });
    return result;
  }

  me(): Promise<MeResponse> {
    return this.request<MeResponse>("/api/users/me");
  }

  favorites(): Promise<FavoritesResponse> {
    return this.request<FavoritesResponse>("/api/users/favorites");
  }

  addFavorite(gameId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("/api/users/favorites", {
      method: "POST",
      body: { gameId },
      origin: this.baseUrl,
    });
  }

  removeFavorite(gameId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/api/users/favorites/${encodeURIComponent(gameId)}`, {
      method: "DELETE",
      origin: this.baseUrl,
    });
  }

  // ------------------------------------------------------------- play session

  /** Starts a tracked play session; premium games throw `payment_required`. */
  startPlaySession(gameId: string): Promise<PlaySessionResponse> {
    return this.request<PlaySessionResponse>(`/api/games/${encodeURIComponent(gameId)}/play`, {
      method: "POST",
      origin: this.baseUrl,
    });
  }

  endPlaySession(sessionId: string, durationMs?: number): Promise<{ ok: boolean; duration: number }> {
    return this.request<{ ok: boolean; duration: number }>(
      `/api/play-sessions/${encodeURIComponent(sessionId)}/end`,
      { method: "POST", body: { durationMs }, origin: this.baseUrl },
    );
  }
}

/** Convenience factory so callers can avoid `new`. */
export function createClient(options: ClientOptions): PlaynixClient {
  return new PlaynixClient(options);
}

export type { SessionUser };
