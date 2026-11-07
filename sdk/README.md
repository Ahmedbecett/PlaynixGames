# playnix-sdk

حزمة تطوير رسمية (SDK) لتطبيق **Playnix** وبوته على تيليجرام: عميل للـ API، أدوات
Mini App، تحقّق من `initData`، معالج ويب هوك، واشتراكات نجوم تيليجرام (Stars).

TypeScript أولًا · بلا أي تبعيات وقت تشغيل · يعمل في المتصفح وNode 18+ وBun وDeno وWorkers.

```bash
npm install playnix-sdk
# أو محليًا من المستودع
cd sdk && npm install && npm run build && npm link
```

---

## البدء السريع

### ١) داخل التطبيق (Mini App)

```ts
import { initMiniApp, currentUser, haptic, startParam, resolveStartParam, shareGameLink } from "playnix-sdk";

initMiniApp();                       // ready() + expand() داخل تيليجرام
const user = currentUser();          // { id, first_name, username, … }
haptic("success");                   // اهتزاز خفيف

const route = resolveStartParam(startParam()); // "game_card-blitz" → "/game/card-blitz"

const share = shareGameLink({ botUsername: "PlaynixGamesBot", slug: "card-blitz", title: "Card Blitz" });
// → https://t.me/share/url?url=…
```

كل دوال Mini App آمنة على السيرفر (SSR): تُعيد قيمًا افتراضية بدلًا من رمي أخطاء.

### ٢) على السيرفر: تحقّق من الهوية + عميل الـ API

```ts
import { validateInitData } from "playnix-sdk/server";
import { PlaynixClient } from "playnix-sdk";

export async function POST(request: Request) {
  const { initData } = await request.json();

  // يتحقق من التوقيع (HMAC-SHA256) ومن عمر البيانات
  const { user, startParam } = validateInitData(initData, { botToken: process.env.TELEGRAM_BOT_TOKEN });

  const playnix = new PlaynixClient({ baseUrl: "https://playnix-ashen.vercel.app" });
  await playnix.signIn(initData);        // يحفظ كوكي الجلسة داخل العميل تلقائيًا

  const me = await playnix.me();          // { premium, subscription, stats }
  const plans = await playnix.listPlans();// خطط Stars
  const games = await playnix.listGames({ pricing: "premium", sort: "newest" });

  return Response.json({ userId: user.id, premium: me.premium, plans: plans.plans, games: games.games, startParam });
}
```

### ٣) البوت: ويب هوك + فاتورة Stars

```ts
// app/api/telegram/webhook/route.ts
import { createWebhookHandler, parseStarsPayment, TelegramBot } from "playnix-sdk/server";

const bot = new TelegramBot({ token: process.env.TELEGRAM_BOT_TOKEN! });

export const POST = createWebhookHandler({
  secret: process.env.TELEGRAM_WEBHOOK_SECRET,
  onUpdate: async (update) => {
    const payment = parseStarsPayment(update);
    if (payment) {
      // المفتاح الوحيد الآمن للتكرار: invoice_payload
      console.log("paid", payment.invoice_payload, payment.total_amount, payment.currency);
      return;
    }

    if (update.message?.text === "/start") {
      await bot.sendPhoto(update.message.chat.id, "https://playnix-ashen.vercel.app/brand/welcome.jpg",
        "<b>Welcome to Playnix 👋</b>", {
          replyMarkup: {
            inline_keyboard: [[
              { text: "👑 Premium", callback_data: "premium:plans" },
            ]],
          },
        });
    }

    if (update.callback_query?.data === "premium:plans") {
      const link = await bot.createInvoiceLink({
        title: "Premium · 1 month",
        description: "30 days of Playnix Premium",
        payload: `plan:${update.callback_query.from.id}:${Date.now()}`,
        stars: 250,
      });
      await bot.answerCallbackQuery(update.callback_query.id);
      await bot.sendMessage(update.callback_query.from.id, "⭐ 250 Stars", {
        replyMarkup: { inline_keyboard: [[{ text: "Pay 250 ⭐", url: link }]] },
      });
    }
  },
});
```

---

## مرجع سريع

### `playnix-sdk` (المتصفح + السيرفر)

| التصدير | الوظيفة |
| --- | --- |
| `new PlaynixClient({ baseUrl, fetch?, sessionCookie?, locale?, timeoutMs? })` | عميل الـ API مع مهلة وكوكي جلسة |
| `client.health()` | `/api/health` |
| `client.listCategories()` | `/api/categories` |
| `client.listGames({ q, category, pricing, sort, limit, offset })` | `/api/games` |
| `client.search(q, opts)` | `/api/games/search` |
| `client.getGame(idOrSlug)` | `/api/games/:id` (تفاصيل + لقطات + مشابهة) |
| `client.listPlans()` | `/api/premium/plans` |
| `client.createInvoice(planId)` | فاتورة Stars (يتطلب جلسة) |
| `client.signIn(initData)` | `/api/auth/telegram` — يحفظ الكوكي |
| `client.me()` / `favorites()` / `addFavorite()` / `removeFavorite()` | حساب المستخدم |
| `client.startPlaySession(gameId)` / `endPlaySession(id, ms)` | تتبع اللعب + بوّابة بريميوم |
| `PlaynixError` | خطأ موحّد: `code`, `status`, `body`, `retryable` |
| `initMiniApp`, `currentUser`, `startParam`, `haptic`, `notify`, `openLink`, `openInvoice`, `showAlert`, `showConfirm`, `onBackButton`, `onViewportChange` | أدوات Mini App |
| `startAppLink`, `botLink`, `resolveStartParam`, `shareGameLink`, `gameStartParam` | روابط عميقة |

### `playnix-sdk/server` (يتطلب `node:crypto`)

| التصدير | الوظيفة |
| --- | --- |
| `validateInitData(initData, { botToken, maxAgeSeconds?, now? })` | تحقّق كامل من توقيع وعمر `initData` |
| `parseInitData(initData)` | قراءة بدون تحقق (للتشخيص فقط) |
| `computeInitDataHash(token, params)` | حساب التوقيع (للاختبارات) |
| `new TelegramBot({ token, fetch?, apiBase?, timeoutMs? })` | عميل Bot API |
| `bot.call(method, body)` + `getMe`, `sendMessage`, `sendPhoto`, `answerCallbackQuery`, `answerPreCheckoutQuery`, `createInvoiceLink`, `setWebhook`, `deleteWebhook`, `getWebhookInfo`, `setMyCommands`, `setChatMenuButton` | تغليف كامل للطرق المستخدمة |
| `createWebhookHandler({ secret, onUpdate, onError?, respondOnError?, dedupe? })` | معالج ويب هوك جاهز لـ `Request`/`Response` |
| `verifyWebhookSecret(header, secret)` | مقارنة ثابتة الزمن |
| `parseStarsPayment(update)` / `isSuccessfulPayment(update)` | قراءة دفعات Stars |
| `parseCommand("/search@bot neon")` | تحليل الأوامر |
| `TelegramApiError` | خطأ Bot API مع `status` و`description` |

---

## الأمان

- **لا تضع `TELEGRAM_BOT_TOKEN` في المتصفح أبدًا** — استخدم `playnix-sdk/server` فقط على السيرفر.
- تحقّق دائمًا من `initData` قبل منح جلسة أو تفعيل اشتراك.
- الويب هوك محمي بـ `X-Telegram-Bot-Api-Secret-Token` (مقارنة ثابتة الزمن) وبـ `dedupe` على `update_id`.
- لا تمنح بريميوم من المتصفح: التفعيل الحقيقي يحدث فقط من `successful_payment` على السيرفر، ومفتاح التكرار هو `invoice_payload`.

## تطوير

```bash
cd sdk
npm install
npm run build    # ESM + CJS + .d.ts في dist/
npm test         # 21 اختبار عقدي على الناتج المبني
```

`npm pack --dry-run` يعرض محتوى الحزمة (‎~17 kB مضغوطة).

## الترخيص

MIT — راجع [LICENSE](./LICENSE).
