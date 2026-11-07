import crypto from "node:crypto";
import { all, one, run } from "./db";
import { env } from "./env";
import { botStartAppLink, gameStartParam } from "./telegram-links";
import { dictionaries, normaliseLocale, type Locale } from "./i18n/shared";
import { answerPreCheckoutQuery, sendMessage } from "./telegram";
import { fulfilStarsPayment } from "./payments";
import { nowIso } from "./time";

/* eslint-disable @typescript-eslint/no-explicit-any */
type TgUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string; language_code?: string };
    chat: { id: number };
    text?: string;
    successful_payment?: {
      invoice_payload: string;
      telegram_payment_charge_id: string;
      total_amount: number;
      currency: string;
    };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; username?: string };
    data?: string;
    message?: { chat: { id: number } };
  };
  pre_checkout_query?: { id: string; from: { id: number }; invoice_payload: string; total_amount: number; currency: string };
  successful_payment?: never;
};

const appLink = () => env.appUrl;

/** Link inside bot messages: opens the Mini App on that screen, else the web app. */
function deepLink(param: string, path: string): string {
  const startApp = botStartAppLink(param);
  return startApp ?? `${appLink()}${path}`;
}

function text(key: keyof typeof dictionaries.en, locale: Locale, vars?: Record<string, string>): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

async function resolveUser(from?: { id: number; first_name?: string; username?: string; language_code?: string }) {
  if (!from) return null;
  const telegramId = String(from.id);
  const existing = await one<{ id: string; language: string; role: string; status: string }>(
    "SELECT id, language, role, status FROM users WHERE telegram_id = ?",
    [telegramId],
  );
  if (existing) {
    await run("UPDATE users SET last_seen_at = ? WHERE id = ?", [nowIso(), existing.id]);
    return existing;
  }
  const id = crypto.randomUUID();
  const now = nowIso();
  const role = env.adminTelegramIds.includes(telegramId) ? "admin" : "user";
  await run(
    `INSERT INTO users (id, telegram_id, username, first_name, language, role, status, created_at, updated_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [id, telegramId, from.username ?? null, from.first_name ?? null, normaliseLocale(from.language_code), role, now, now, now],
  );
  return { id, language: normaliseLocale(from.language_code), role, status: "active" };
}

function miniAppKeyboard(locale: Locale, path = "/") {
  return {
    inline_keyboard: [
      [{ text: locale === "ar" ? "🎮 افتح بلاينكس" : locale === "fr" ? "🎮 Ouvrir Playnix" : "🎮 Open Playnix", web_app: { url: `${appLink()}${path}` } }],
    ],
  };
}

function gameLine(title: string, slug: string, pricing: string) {
  const href = deepLink(gameStartParam(slug), `/game/${slug}`);
  return `• <a href="${href}">${title}</a>${pricing === "premium" ? " ⭐" : ""}`;
}

async function listGames(kind: "popular" | "new" | "search", query = "", limit = 6) {
  if (kind === "search") {
    const tokens = query.toLowerCase().split(/\W+/).filter((token) => token.length > 1).slice(0, 4);
    if (tokens.length === 0) return [];
    const clauses = tokens.map(() => "search_text LIKE ?").join(" AND ");
    return all<{ title: string; slug: string; pricing_type: string }>(
      `SELECT title, slug, pricing_type FROM games WHERE publication_status = 'published' AND ${clauses}
       ORDER BY play_count DESC LIMIT ?`,
      [...tokens.map((token) => `%${token}%`), limit],
    );
  }
  const order = kind === "new" ? "COALESCE(published_at, created_at) DESC" : "play_count DESC, rating_avg DESC";
  return all<{ title: string; slug: string; pricing_type: string }>(
    `SELECT title, slug, pricing_type FROM games WHERE publication_status = 'published' ORDER BY ${order} LIMIT ?`,
    [limit],
  );
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  // idempotency
  try {
    await run("INSERT INTO telegram_updates (update_id, processed_at) VALUES (?, ?)", [String(update.update_id), nowIso()]);
  } catch {
    return; // already handled
  }

  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const valid = q.currency === "XTR" && q.total_amount >= 1;
    await answerPreCheckoutQuery(q.id, valid, valid ? undefined : "This invoice is no longer valid.");
    return;
  }

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message?.chat.id;
    const user = await resolveUser(callback.from);
    if (!chatId || !user) return;
    if (callback.data?.startsWith("lang:")) {
      const locale = normaliseLocale(callback.data.slice(5));
      await run("UPDATE users SET language = ?, updated_at = ? WHERE id = ?", [locale, nowIso(), user.id]);
      await sendMessage(chatId, text("common.language", locale) + `: ${locale.toUpperCase()}`, {
        replyMarkup: miniAppKeyboard(locale),
      });
    }
    return;
  }

  const message = update.message;
  if (!message?.from) return;
  const user = await resolveUser(message.from);
  if (!user) return;
  const locale = normaliseLocale(user.language);
  const chatId = message.chat.id;

  if (message.successful_payment) {
    const result = await handleSuccessfulPayment(message.successful_payment);
    if (result.ok) {
      await sendMessage(
        chatId,
        `⭐ <b>${text("premium.title", locale)}</b>\n\n${text("premium.success", locale)}${
          result.expiresAt ? `\n${text("premium.activeUntil", locale, { date: result.expiresAt.slice(0, 10) })}` : ""
        }`,
        { replyMarkup: miniAppKeyboard(locale, "/premium") },
      );
    } else {
      await sendMessage(chatId, text("premium.failed", locale), { replyMarkup: miniAppKeyboard(locale, "/premium") });
    }
    return;
  }
  const body = (message.text ?? "").trim();
  if (!body.startsWith("/")) {
    await sendMessage(chatId, text("home.searchPlaceholder", locale), { replyMarkup: miniAppKeyboard(locale, "/search") });
    return;
  }

  const [commandRaw, ...rest] = body.split(/\s+/);
  const command = commandRaw.split("@")[0].toLowerCase();
  const argument = rest.join(" ").trim();

  switch (command) {
    case "/start": {
      const welcome =
        locale === "ar"
          ? `<b>مرحبًا بك في بلاينكس!</b>\n\nاكتشف آلاف الألعاب واستكشف تجارب جديدة والعب فورًا داخل تيليجرام.\n\nابحث عن ألعابك المفضلة وابدأ اللعب.`
          : locale === "fr"
            ? `<b>Bienvenue sur Playnix !</b>\n\nDécouvrez des milliers de jeux, explorez de nouvelles expériences et jouez instantanément dans Telegram.\n\nCherchez vos jeux préférés et commencez à jouer.`
            : `<b>Welcome to Playnix!</b>\n\nDiscover thousands of games, explore new experiences, and play instantly inside Telegram.\n\nSearch your favorite games and start playing.`;
      await sendMessage(chatId, welcome, { replyMarkup: miniAppKeyboard(locale) });
      return;
    }
    case "/games":
      await sendMessage(chatId, text("categories.title", locale), { replyMarkup: miniAppKeyboard(locale, "/categories") });
      return;
    case "/search": {
      if (!argument) {
        await sendMessage(chatId, text("search.placeholder", locale), { replyMarkup: miniAppKeyboard(locale, "/search") });
        return;
      }
      const games = await listGames("search", argument);
      if (games.length === 0) {
        await sendMessage(
          chatId,
          text("search.noResultsTitle", locale, { query: argument }) + "\n\n" + text("search.noResultsBody", locale),
          { replyMarkup: miniAppKeyboard(locale, `/search?q=${encodeURIComponent(argument)}`) },
        );
        return;
      }
      const lines = games.map((game) => gameLine(game.title, game.slug, game.pricing_type));
      await sendMessage(chatId, `<b>${text("search.resultsFor", locale, { query: argument })}</b>\n${lines.join("\n")}`, {
        replyMarkup: miniAppKeyboard(locale, `/search?q=${encodeURIComponent(argument)}`),
      });
      return;
    }
    case "/popular": {
      const games = await listGames("popular");
      await sendMessage(chatId, `<b>${text("home.trending", locale)}</b>\n${games.map((g) => gameLine(g.title, g.slug, g.pricing_type)).join("\n")}`, {
        replyMarkup: miniAppKeyboard(locale, "/search?sort=popular"),
      });
      return;
    }
    case "/new": {
      const games = await listGames("new");
      await sendMessage(chatId, `<b>${text("home.newGames", locale)}</b>\n${games.map((g) => gameLine(g.title, g.slug, g.pricing_type)).join("\n")}`, {
        replyMarkup: miniAppKeyboard(locale, "/search?sort=newest"),
      });
      return;
    }
    case "/premium":
      await sendMessage(chatId, `<b>${text("premium.title", locale)}</b>\n\n${text("premium.subtitle", locale)}`, {
        replyMarkup: miniAppKeyboard(locale, "/premium"),
      });
      return;
    case "/profile":
      await sendMessage(chatId, text("profile.title", locale), { replyMarkup: miniAppKeyboard(locale, "/profile") });
      return;
    case "/language":
    case "/settings": {
      await sendMessage(chatId, text("common.language", locale), {
        replyMarkup: {
          inline_keyboard: [
            [
              { text: "English", callback_data: "lang:en" },
              { text: "العربية", callback_data: "lang:ar" },
              { text: "Français", callback_data: "lang:fr" },
            ],
          ],
        },
      });
      return;
    }
    case "/help":
    default:
      await sendMessage(
        chatId,
        `<b>${text("brand.name", locale)}</b>\n\n` +
          "/start · " + text("nav.home", locale) + "\n" +
          "/games · " + text("nav.categories", locale) + "\n" +
          "/search · " + text("common.search", locale) + "\n" +
          "/popular · " + text("home.trending", locale) + "\n" +
          "/new · " + text("home.newGames", locale) + "\n" +
          "/premium · " + text("common.premium", locale) + "\n" +
          "/profile · " + text("profile.title", locale) + "\n" +
          "/language · " + text("common.language", locale),
        { replyMarkup: miniAppKeyboard(locale) },
      );
  }
}

/** Handles a successful Stars payment (called from the webhook and bot polling). */
export async function handleSuccessfulPayment(payment: {
  invoice_payload: string;
  telegram_payment_charge_id: string;
  total_amount: number;
  currency: string;
}) {
  const result = await fulfilStarsPayment({
    payload: payment.invoice_payload,
    chargeId: payment.telegram_payment_charge_id,
    amount: payment.total_amount,
    currency: payment.currency,
    raw: payment,
  });
  return result;
}

/** Broadcasts a message to every active user (used for announcements). */
export async function broadcast(message: string, onlyPremium = false): Promise<{ sent: number; failed: number }> {
  const rows = onlyPremium
    ? await all<{ telegram_id: string }>(
        `SELECT DISTINCT u.telegram_id FROM users u
         JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active' AND s.expires_at > ?
         WHERE u.status = 'active'`,
        [nowIso()],
      )
    : await all<{ telegram_id: string }>("SELECT telegram_id FROM users WHERE status = 'active' AND role != 'admin'");

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await sendMessage(row.telegram_id, message, { replyMarkup: miniAppKeyboard("en") });
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}
