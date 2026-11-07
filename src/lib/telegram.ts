import crypto from "node:crypto";
import { env } from "./env";

const API_BASE = "https://api.telegram.org";

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

export type ValidatedInitData = {
  user: TelegramWebAppUser;
  authDate: Date;
  queryId?: string;
  startParam?: string;
  raw: URLSearchParams;
};

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code = "telegram_error",
  ) {
    super(message);
  }
}

/**
 * Validates Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secretKey = HMAC_SHA256(key="WebAppData", message=bot_token)
 * hash      = hex(HMAC_SHA256(key=secretKey, message=data_check_string))
 */
export function validateInitData(initData: string, maxAgeSeconds = 60 * 60 * 24): ValidatedInitData {
  const botToken = env.botToken;
  if (!botToken) throw new TelegramError("Bot token is not configured on the server.", "config");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new TelegramError("Missing initData hash.", "invalid");

  const pairs: string[] = [];
  for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (key === "hash" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new TelegramError("initData signature is invalid.", "invalid");
  }

  const authDateRaw = Number(params.get("auth_date"));
  if (!Number.isFinite(authDateRaw) || authDateRaw <= 0) {
    throw new TelegramError("initData auth_date is missing.", "invalid");
  }
  const authDate = new Date(authDateRaw * 1000);
  if (Date.now() - authDate.getTime() > maxAgeSeconds * 1000) {
    throw new TelegramError("initData has expired. Reopen the Mini App.", "expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new TelegramError("initData has no user payload.", "invalid");

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw new TelegramError("initData user payload is not valid JSON.", "invalid");
  }
  if (!user?.id || !user.first_name) throw new TelegramError("initData user is incomplete.", "invalid");

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
    raw: params,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function callTelegramApi<T = any>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = env.botToken;
  if (!token) throw new TelegramError("Bot token is not configured.", "config");
  const response = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; result?: T; description?: string; error_code?: number }
    | null;
  if (!response.ok || !payload?.ok) {
    throw new TelegramError(payload?.description ?? `Telegram API ${method} failed (${response.status}).`);
  }
  return payload.result as T;
}

export async function getMe() {
  return callTelegramApi<{ id: number; username: string; first_name: string }>("getMe");
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  options: {
    parseMode?: "HTML" | "MarkdownV2";
    replyMarkup?: Record<string, unknown>;
    disablePreview?: boolean;
  } = {},
) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode ?? "HTML",
    link_preview_options: { is_disabled: options.disablePreview ?? true },
    reply_markup: options.replyMarkup,
  });
}

export async function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  return callTelegramApi("answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    error_message: errorMessage,
  });
}

export async function createInvoiceLink(params: {
  title: string;
  description: string;
  payload: string;
  stars: number;
  subscriptionDays?: number;
}) {
  return callTelegramApi<string>("createInvoiceLink", {
    title: params.title,
    description: params.description,
    payload: params.payload,
    currency: "XTR",
    prices: [{ label: params.title, amount: params.stars }],
    ...(params.subscriptionDays
      ? {
          subscription_period: 2592000,
        }
      : {}),
  });
}

export async function setWebhook(url: string, secretToken?: string) {
  return callTelegramApi("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query", "pre_checkout_query", "inline_query"],
    drop_pending_updates: false,
  });
}

export async function deleteWebhook() {
  return callTelegramApi("deleteWebhook", {});
}

export async function getWebhookInfo() {
  return callTelegramApi<{ url: string; pending_update_count: number; last_error_message?: string }>(
    "getWebhookInfo",
  );
}

export async function setChatMenuButton(miniAppUrl: string, label = "Open Playnix") {
  return callTelegramApi("setChatMenuButton", {
    menu_button: { type: "web_app", text: label, web_app: { url: miniAppUrl } },
  });
}
