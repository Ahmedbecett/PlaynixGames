/**
 * Telegram integration for the Playnix app.
 *
 * The primitives live in `playnix-sdk` (`playnix-sdk/server`), which is the
 * package published from `sdk/`. This module is the app-side adapter: it reads
 * configuration from `env`, keeps the historical function names, and maps SDK
 * errors onto the app's `TelegramError` so callers and HTTP handlers behave
 * exactly as before.
 */
import {
  TelegramApiError,
  TelegramBot,
  TelegramError,
  validateInitData as validateInitDataWithSdk,
} from "playnix-sdk/server";
import { env } from "./env";

export { TelegramError };
export type { TelegramUpdate } from "playnix-sdk/server";

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

/**
 * Validates Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * The HMAC work (and the timing-safe comparison) is done by the SDK; this
 * wrapper keeps the `raw: URLSearchParams` shape the app already relies on.
 */
export function validateInitData(initData: string, maxAgeSeconds = 60 * 60 * 24): ValidatedInitData {
  const validated = validateInitDataWithSdk(initData, { botToken: env.botToken, maxAgeSeconds });
  return {
    user: validated.user,
    authDate: validated.authDate,
    queryId: validated.queryId,
    startParam: validated.startParam,
    raw: validated.params,
  };
}

let cachedBot: { token: string; bot: TelegramBot } | null = null;

/**
 * The shared Bot API client. Calls are marked `no-store` so Next never caches a
 * Telegram response, and the client is rebuilt if the token changes.
 */
function bot(): TelegramBot {
  const token = env.botToken;
  if (!token) throw new TelegramError("Bot token is not configured.", "config");
  if (cachedBot?.token !== token) {
    cachedBot = {
      token,
      bot: new TelegramBot({
        token,
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) as ReturnType<typeof fetch>,
      }),
    };
  }
  return cachedBot.bot;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function callTelegramApi<T = any>(method: string, body?: Record<string, unknown>): Promise<T> {
  try {
    return await bot().call<T>(method, body ?? {});
  } catch (error) {
    if (error instanceof TelegramApiError) {
      throw new TelegramError(
        error.description || `Telegram API ${method} failed (${error.status}).`,
      );
    }
    throw error;
  }
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
  /** Stars subscriptions only support 30/31-day periods, so any value maps to 30 days. */
  subscriptionDays?: number;
}) {
  return callTelegramApi<string>("createInvoiceLink", {
    title: params.title,
    description: params.description,
    payload: params.payload,
    currency: "XTR",
    prices: [{ label: params.title, amount: params.stars }],
    ...(params.subscriptionDays ? { subscription_period: 2592000 } : {}),
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

/**
 * Sends a photo with an HTML caption. Used for the branded welcome message and
 * for the subscription pitch — a picture converts far better than plain text.
 */
export async function sendPhoto(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  options: { replyMarkup?: Record<string, unknown> } = {},
) {
  return callTelegramApi("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    reply_markup: options.replyMarkup,
  });
}

/** Removes the loading spinner from an inline button after a tap. */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  options: { alert?: boolean } = {},
) {
  return callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: options.alert ?? false,
  });
}

/** Publishes the command list shown in Telegram's blue menu button. */
export async function setMyCommands(commands: { command: string; description: string }[]) {
  return callTelegramApi("setMyCommands", { commands });
}
