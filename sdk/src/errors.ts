/**
 * Errors thrown by the SDK. Everything is a subclass of `PlaynixError`, so a
 * single `catch` can handle the whole surface without leaking `fetch` details.
 */

export type PlaynixErrorCode =
  | "http_error"
  | "network_error"
  | "timeout"
  | "bad_response"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "payment_required"
  | "rate_limited"
  | string;

export class PlaynixError extends Error {
  readonly code: PlaynixErrorCode;
  readonly status: number | null;
  readonly body: unknown;
  readonly url: string | null;

  constructor(
    message: string,
    options: { code?: PlaynixErrorCode; status?: number | null; body?: unknown; url?: string | null } = {},
  ) {
    super(message);
    this.name = "PlaynixError";
    this.code = options.code ?? "http_error";
    this.status = options.status ?? null;
    this.body = options.body;
    this.url = options.url ?? null;
  }

  /** `true` when retrying the same call could succeed later. */
  get retryable(): boolean {
    return this.code === "network_error" || this.code === "timeout" || this.code === "rate_limited";
  }
}

/** Raised by `validateInitData` and the webhook guard. */
export class TelegramError extends Error {
  readonly code: "config" | "invalid" | "expired" | "telegram_error";

  constructor(message: string, code: "config" | "invalid" | "expired" | "telegram_error" = "telegram_error") {
    super(message);
    this.name = "TelegramError";
    this.code = code;
  }
}
