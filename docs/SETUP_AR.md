# دليل التشغيل السريع (بالعربية)

هدف هذا الدليل: من الصفر إلى بوت يعمل ويفتح منصة Playnix داخل تيليجرام.
الوقت المتوقع: **15–20 دقيقة**. لا تحتاج كتابة كود، ولا terminal إذا استخدمت Vercel + Neon.

> كل ما تحتاجه: حساب GitHub فيه المستودع، حساب Vercel، حساب Neon (قاعدة بيانات)، وبوت من BotFather.

---

## الخطوة 1 — دمج الكود في `main` (زر واحد)

افتح رابط الـ Pull Request الجاهز:

```
https://github.com/Ahmedbecett/PlaynixGames/pulls
```

اضغط على الـ PR المفتوح ثم **Merge pull request**. هذا يجعل Vercel ينشر التحديثات تلقائيًا لاحقًا.

---

## الخطوة 2 — قاعدة بيانات مجانية (Neon)

1. ادخل: **https://neon.tech** → Sign up (بحساب GitHub).
2. **Create project** → الاسم `playnix` → المنطقة الأقرب لك (Frankfurt مثلًا) → Create.
3. من صفحة المشروع اضغط **Connect** → اختر **Node.js** → انسخ الرابط الذي يبدأ بـ
   `postgresql://…?sslmode=require`
4. احفظه مؤقتًا في مكان آمن — سيكون قيمة `DATABASE_URL`.

---

## الخطوة 3 — النشر على Vercel

1. ادخل: **https://vercel.com/new**
2. **Import Git Repository** → اختر `Ahmedbecett/PlaynixGames` → Import.
3. اترك الإعدادات كما هي (Framework: Next.js، Build: `npm run build`).
4. افتح قسم **Environment Variables** وأضف القيم التالية (Name / Value):

| الاسم | القيمة من أين |
| --- | --- |
| `DATABASE_URL` | رابط Neon من الخطوة 2 |
| `TELEGRAM_BOT_TOKEN` | BotFather → `/mybots` → API Token |
| `TELEGRAM_WEBHOOK_SECRET` | كلمة عشوائية طويلة (32 حرفًا) — أنشئها من https://randomkeygen.com |
| `SESSION_SECRET` | كلمة عشوائية أخرى (مختلفة) |
| `ADMIN_TELEGRAM_IDS` | معرّفك الرقمي في تيليجرام — من **https://t.me/userinfobot** |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | اسم بوتك بدون @ مثل `PlaynixGamesBot` |
| `NEXT_PUBLIC_APP_URL` | اتركه مؤقتًا `https://example.com` وسنصححه في الخطوة 5 |
| `ALLOW_DEV_LOGIN` | `false` |

5. اضغط **Deploy** وانتظر دقيقتين.

> أثناء البناء يشغّل المشروع تلقائيًا إنشاء الجداول + تعبئة البيانات (16 تصنيفًا، 6 ألعاب، 3 خطط). لا تحتاج أي أمر يدوي.

---

## الخطوة 4 — ضبط البوت في BotFather

افتح **https://t.me/BotFather** وأرسل الأوامر التالية واحدًا واحدًا:

1. `/setname` → اختر بوتك → `Playnix`
2. `/setdescription` → `Search, discover and play instantly inside Telegram.`
3. `/setuserpic` → ارفع الصورة `public/brand/icon-512.png` من المستودع
4. `/setcommands` → اختر بوتك ثم الصق:
   ```
   start - Open Playnix
   games - Browse categories
   search - Find a game
   popular - Trending now
   new - Recently added
   premium - Premium membership
   profile - Your profile
   help - Help
   language - Change language
   ```

---

## الخطوة 5 — ربط العنوان الحقيقي وزر الفتح

1. في Vercel → مشروعك → انسخ الدومين (مثل `playnix-xyz.vercel.app`).
2. **Settings → Environment Variables** → عدّل `NEXT_PUBLIC_APP_URL` إلى
   `https://playnix-xyz.vercel.app` (بدون `/` في النهاية).
3. **Deployments** → آخر نشر → `⋯` → **Redeploy** (مهم: القيمة تُدمج وقت البناء).
4. في BotFather: `/mybots` → بوتك → **Bot Settings → Menu Button** → أرسل
   `https://playnix-xyz.vercel.app`

الآن سيظهر زر **Open Playnix** أسفل المحادثة.

---

## الخطوة 6 — تسجيل الويب هوك (بدون terminal)

1. افتح بوتك في تيليجرام → اضغط زر **Open Playnix**.
2. سيتم إنشاء حسابك تلقائيًا (لأن معرّفك في `ADMIN_TELEGRAM_IDS` ستصبح مديرًا).
3. من صفحة **الملف الشخصي** → **لوحة التحكم** → **System**.
4. اضغط **Register webhook** → يجب أن تظهر حالة ناجحة مع عدم وجود أخطاء.

هذه الخطوة تجعل البوت يستقبل `/start` ويدفع اشتراكات Stars.

---

## الخطوة 7 — اختبار سريع (5 دقائق)

| الاختبار | المتوقع |
| --- | --- |
| أرسل `/start` للبوت | رسالة ترحيب + زر **🎮 Open Playnix** |
| اضغط الزر | تفتح المنصة ويعرض اسمك |
| ابحث عن `serpent` | نتيجة حقيقية: Neon Serpent |
| افتح لعبة → Play | اللعبة تعمل، إيقاف/ملء الشاشة يعملان |
| أضف للمفضلة ثم أغلق وافتح | المفضلة محفوظة |
| `/language` ثم العربية | الواجهة تصبح من اليمين إلى اليسار |
| لوحة التحكم → Games | 6 ألعاب حقيقية وإحصاءات من قاعدة البيانات |

---

## روابطك النهائية

| الغرض | الرابط |
| --- | --- |
| فتح المنصة من تيليجرام | `https://t.me/<اسم_بوتك>` |
| فتح لعبة مباشرة | `https://t.me/<اسم_بوتك>?startapp=game_neon-serpent` |
| فتح تصنيف | `https://t.me/<اسم_بوتك>?startapp=cat_arcade` |
| فتح خطط الاشتراك | `https://t.me/<اسم_بوتك>?startapp=premium` |
| المنصة في المتصفح | `https://<دومين_فيرسل>` |
| فحص الصحة | `https://<دومين_فيرسل>/api/health` |
| لوحة التحكم | `https://<دومين_فيرسل>/admin` |

---

## أخطاء شائعة وحلولها

| المشكلة | الحل |
| --- | --- |
| زر البوت يفتح صفحة بيضاء | `NEXT_PUBLIC_APP_URL` خطأ أو لم تُعد النشر بعد تعديله |
| المنصة تفتح لكن بلا تسجيل دخول | التوكن في Vercel يختلف عن توكن البوت الذي فتحت منه |
| البوت لا يرد | لم يُسجّل الويب هوك → الخطوة 6 |
| `/api/health` يعطي 503 | `DATABASE_URL` خطأ أو لم يُضف |
| Stars لا تفتح | افتح المنصة من داخل تيليجرام (لا من المتصفح)، وتأكد أن الويب هوك مسجّل |
| الصورة أو زر القائمة لا يظهران | أعد `/setuserpic` أو أعد الخطوة 5.4 |
| المشاركة تفتح رابط موقع | `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` فارغ → أضفه وأعد النشر |

---

## أمان — لا تتجاهله

- **التوكن الذي أُرسل في المحادثة اعتبره مكشوفًا**: في BotFather أرسل `/revoke` ثم ضع التوكن الجديد في Vercel فقط.
- لا تضع أي توكن في GitHub أو في الكود أو في رسالة.
- `ALLOW_DEV_LOGIN=false` في الإنتاج (الدخول التجريبي معطّل أصلًا في production).
- احتفظ بنسخة احتياطية أسبوعية من قاعدة البيانات (Neon يوفّر نسخًا تلقائية، ويمكن أيضًا `pg_dump`).
