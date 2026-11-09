/**
 * Webhook plumbing for a Playnix/Telegram bot. Framework agnostic: it works on
 * the standard `Request`/`Response` pair, so it drops into Next.js route
 * handlers, Bun, Deno, Workers or a plain Node server.
 */
import { timingSafeEqual } from "node:crypto";

export const SECRET_HEADER = "x-telegram-bot-api-secret-token";

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_bot?: boolean;
};

export type SuccessfulPayment = {
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
  total_amount: number;
  currency: string;
  subscription_expiration_date?: number;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: TelegramUser;
    chat: { id: number; type?: string };
    text?: string;
    successful_payment?: SuccessfulPayment;
  };
  callback_query?: {
    id: string;
    from: TelegramUser;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
  pre_checkout_query?: {
    id: string;
    from: TelegramUser;
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
};

/** Constant-time comparison of the `X-Telegram-Bot-Api-Secret-Token` header. */
export function verifyWebhookSecret(provided: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type WebhookHandlerOptions = {
  /** The same secret passed to `setWebhook`. */
  secret: string | undefined;
  onUpdate: (update: TelegramUpdate) => unknown | Promise<unknown>;
  onError?: (error: unknown, update?: TelegramUpdate) => unknown;
  /**
   * What to answer when `onUpdate` throws. Telegram retries non-2xx responses,
   * so `"ok"` (default) acknowledges the update to avoid duplicate deliveries;
   * the handler must then log/handle its own failures.
   */
  respondOnError?: "ok" | "error";
  /** In-memory idempotency: remembers `update_id`s seen during this process. */
  dedupe?: boolean;
};

/**
 * Creates a `POST` handler for `/api/telegram/webhook`.
 *
 * ```ts
 * // app/api/telegram/webhook/route.ts
 * export const POST = createWebhookHandler({
 *   secret: process.env.TELEGRAM_WEBHOOK_SECRET,
 *   onUpdate: async (update) => { ... },
 * });
 * ```
 */
export function createWebhookHandler(options: WebhookHandlerOptions) {
  const seen = new Set<number>();

  return async function POST(request: Request): Promise<Response> {
    if (!verifyWebhookSecret(request.headers.get(SECRET_HEADER), options.secret)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let update: TelegramUpdate | null = null;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return Response.json({ ok: false, error: "malformed_update" }, { status: 400 });
    }

    if (!update || typeof update.update_id !== "number") {
      return Response.json({ ok: false, error: "malformed_update" }, { status: 400 });
    }

    if (options.dedupe) {
      if (seen.has(update.update_id)) return Response.json({ ok: true, duplicate: true });
      seen.add(update.update_id);
      if (seen.size > 5_000) seen.delete(seen.values().next().value as number);
    }

    try {
      await options.onUpdate(update);
    } catch (error) {
      await options.onError?.(error, update);
      if (options.respondOnError === "error") {
        return Response.json({ ok: false, error: "handler_failed" }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  };
}

/** `true` when the update carries a completed Stars / provider payment. */
export function isSuccessfulPayment(update: TelegramUpdate): boolean {
  return Boolean(update.message?.successful_payment);
}

/**
 * The payment payload of a `successful_payment` update, or `null`.
 * Use `invoice_payload` (our `payments.transaction_id`) as the idempotency key.
 */
export function parseStarsPayment(update: TelegramUpdate): SuccessfulPayment | null {
  return update.message?.successful_payment ?? null;
}

/** `/command@bot arg1 arg2` → `{ command: "/command", argument: "arg1 arg2" }`. */
export function parseCommand(text: string): { command: string; argument: string } | null {
  const body = text.trim();
  if (!body.startsWith("/")) return null;
  const [raw, ...rest] = body.split(/\s+/);
  return { command: raw.split("@")[0].toLowerCase(), argument: rest.join(" ").trim() };
}
