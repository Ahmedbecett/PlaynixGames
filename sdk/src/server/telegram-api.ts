/**
 * A tiny, typed Telegram Bot API client (server-side only).
 *
 * Only the methods the Playnix bot needs are wrapped; `call()` is available for
 * anything else, so this stays useful as a generic bot client.
 */

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export class TelegramApiError extends Error {
  readonly method: string;
  readonly status: number;
  readonly description: string;

  constructor(method: string, status: number, description: string) {
    super(`Telegram ${method} failed (${status}): ${description}`);
    this.name = "TelegramApiError";
    this.method = method;
    this.status = status;
    this.description = description;
  }
}

export type InlineKeyboard = {
  inline_keyboard: Array<
    Array<
      | { text: string; url: string }
      | { text: string; callback_data: string }
      | { text: string; web_app: { url: string } }
    >
  >;
};

export type BotOptions = {
  token: string;
  /** Defaults to `https://api.telegram.org`. */
  apiBase?: string;
  fetch?: FetchLike;
  /** Per-request timeout in ms (default 15 000). */
  timeoutMs?: number;
};

export type SendMessageOptions = {
  parseMode?: "HTML" | "MarkdownV2";
  replyMarkup?: InlineKeyboard | Record<string, unknown>;
  disablePreview?: boolean;
};

export type InvoiceOptions = {
  title: string;
  description: string;
  payload: string;
  /** Price in Telegram Stars (XTR). */
  stars: number;
  /** Optional recurring period in seconds (2592000 = 30 days). */
  subscriptionPeriod?: number;
};

export class TelegramBot {
  private readonly token: string;
  private readonly apiBase: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: BotOptions) {
    if (!options?.token) throw new TelegramApiError("constructor", 0, "token is required");
    this.token = options.token;
    this.apiBase = (options.apiBase ?? "https://api.telegram.org").replace(/\/+$/, "");
    const runtimeFetch = options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!runtimeFetch) throw new TelegramApiError("constructor", 0, "no fetch implementation available");
    this.fetchImpl = runtimeFetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  /** Calls any Bot API method and unwraps `result`. */
  async call<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(`${this.apiBase}/bot${this.token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const reason = controller.signal.aborted ? `timed out after ${this.timeoutMs}ms` : (error as Error).message;
      throw new TelegramApiError(method, 0, reason);
    } finally {
      clearTimeout(timer);
    }

    const payload = (await response.json().catch(() => null)) as
      | { ok: boolean; result?: T; description?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      throw new TelegramApiError(method, response.status, payload?.description ?? "unknown error");
    }
    return payload.result as T;
  }

  getMe() {
    return this.call<{ id: number; username: string; first_name: string }>("getMe");
  }

  sendMessage(chatId: string | number, text: string, options: SendMessageOptions = {}) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode ?? "HTML",
      link_preview_options: { is_disabled: options.disablePreview ?? true },
      reply_markup: options.replyMarkup,
    });
  }

  sendPhoto(chatId: string | number, photo: string, caption?: string, options: SendMessageOptions = {}) {
    return this.call("sendPhoto", {
      chat_id: chatId,
      photo,
      caption,
      parse_mode: options.parseMode ?? "HTML",
      reply_markup: options.replyMarkup,
    });
  }

  answerCallbackQuery(callbackQueryId: string, text?: string, alert = false) {
    return this.call("answerCallbackQuery", { callback_query_id: callbackQueryId, text, show_alert: alert });
  }

  answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
    return this.call("answerPreCheckoutQuery", { pre_checkout_query_id: preCheckoutQueryId, ok, error_message: errorMessage });
  }

  /** Creates a Stars (XTR) invoice link — the payload must be unique per attempt. */
  createInvoiceLink(options: InvoiceOptions) {
    return this.call<string>("createInvoiceLink", {
      title: options.title,
      description: options.description,
      payload: options.payload,
      currency: "XTR",
      prices: [{ label: options.title, amount: options.stars }],
      ...(options.subscriptionPeriod ? { subscription_period: options.subscriptionPeriod } : {}),
    });
  }

  setWebhook(url: string, secretToken?: string) {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query", "pre_checkout_query", "inline_query"],
      drop_pending_updates: false,
    });
  }

  deleteWebhook() {
    return this.call("deleteWebhook", {});
  }

  getWebhookInfo() {
    return this.call<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo");
  }

  setMyCommands(commands: Array<{ command: string; description: string }>) {
    return this.call("setMyCommands", { commands });
  }

  /** Mini App button above the chat input. */
  setChatMenuButton(url: string, label = "Play now") {
    return this.call("setChatMenuButton", { menu_button: { type: "web_app", text: label, web_app: { url } } });
  }
}
