/**
 * Telegram Mini App `initData` parsing and validation (server-side only).
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key       = HMAC_SHA256(key="WebAppData", message=bot_token)
 *   data_check_string = "key=value" lines, sorted by key, minus `hash`/`signature`
 *   hash             = hex(HMAC_SHA256(key=secret_key, message=data_check_string))
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { TelegramError } from "../errors.js";

export type TelegramWebAppUser = {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type ParsedInitData = {
  user: TelegramWebAppUser;
  authDate: Date;
  queryId?: string;
  startParam?: string;
  params: URLSearchParams;
};

export type ValidatedInitData = ParsedInitData & {
  /** Raw `initData` string, handy for logging or re-verification. */
  raw: string;
};

export type ValidateOptions = {
  botToken: string | undefined;
  /** Reject data older than this (default 24 h, Telegram's own advice). */
  maxAgeSeconds?: number;
  /** `Date.now()` override for tests. */
  now?: number;
};

/** Builds Telegram's `data_check_string` from a parameter set. */
export function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (key === "hash" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  return pairs.join("\n");
}

/**
 * Computes the expected hash for a parameter set. Exported so tests and tooling
 * can generate valid `initData`, never use it to trust unverified input.
 */
export function computeInitDataHash(botToken: string, params: URLSearchParams | string): string {
  const search = typeof params === "string" ? new URLSearchParams(params) : params;
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secretKey).update(buildDataCheckString(search)).digest("hex");
}

/** Parses `initData` without checking the signature. */
export function parseInitData(initData: string): ParsedInitData {
  const params = new URLSearchParams(initData);
  const raw = params.get("user");
  if (!raw) throw new TelegramError("initData has no user payload.", "invalid");

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(raw) as TelegramWebAppUser;
  } catch {
    throw new TelegramError("initData user payload is not valid JSON.", "invalid");
  }
  if (!user?.id || !user.first_name) throw new TelegramError("initData user is incomplete.", "invalid");

  const authDateRaw = Number(params.get("auth_date"));
  if (!Number.isFinite(authDateRaw) || authDateRaw <= 0) {
    throw new TelegramError("initData auth_date is missing.", "invalid");
  }

  return {
    user,
    authDate: new Date(authDateRaw * 1000),
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
    params,
  };
}

/**
 * Validates the signature and the age of `initData`.
 * Throws `TelegramError` (`config` | `invalid` | `expired`) when it is not trustworthy.
 */
export function validateInitData(initData: string, options: ValidateOptions): ValidatedInitData {
  const { botToken, maxAgeSeconds = 60 * 60 * 24, now = Date.now() } = options;
  if (!botToken) throw new TelegramError("Bot token is not configured on the server.", "config");
  if (typeof initData !== "string" || initData.length === 0) {
    throw new TelegramError("initData is required.", "invalid");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new TelegramError("Missing initData hash.", "invalid");

  const expected = computeInitDataHash(botToken, params);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new TelegramError("initData signature is invalid.", "invalid");
  }

  const parsed = parseInitData(initData);
  if (now - parsed.authDate.getTime() > maxAgeSeconds * 1000) {
    throw new TelegramError("initData has expired. Reopen the Mini App.", "expired");
  }

  return { ...parsed, raw: initData };
}
