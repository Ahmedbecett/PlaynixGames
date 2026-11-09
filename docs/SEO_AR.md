# دليل الظهور في محرّكات البحث (SEO)

هذا الدليل يجعل Playnix قابلًا للفهرسة والظهور القوي في Google، ويشرح خطوات التحقق من ملكية الموقع.

---

## 1) ما تم تجهيزه في الكود

| المكوّن | المسار | الوظيفة |
| --- | --- | --- |
| ملف تحقق Google | `public/google16fac1570d0d10bd.html` | إثبات ملكية الموقع (طريقة ملف HTML) |
| `robots.txt` | `src/app/robots.ts` → `/robots.txt` | يسمح بالفهرسة ويحجب الصفحات الخاصة |
| `sitemap.xml` | `src/app/sitemap.ts` → `/sitemap.xml` | كل الصفحات العامة + الألعاب + التصنيفات (محدّث تلقائيًا) |
| بيانات الميتا | `src/lib/seo.ts` | canonical، hreflang (ar/en/fr)، Open Graph، Twitter Card |
| البيانات المنظّمة | `src/lib/seo.ts` → JSON-LD | `Organization`, `WebSite`, `VideoGame`, `BreadcrumbList`, `ItemList` |
| صورة المشاركة | `public/brand/og-1200x630.png` | معاينة الرابط في تيليجرام وواتساب وX وفيسبوك |
| إعادة توجيه | `next.config.ts` | `/games/*` → `/game/*` و `/category` → `/categories` |

**الصفحات المفهرسة:** الرئيسية، `/categories`، `/category/<slug>`، `/game/<slug>`، `/premium`.

**الصفحات المحجوبة (noindex):** `/profile`، `/favorites`، `/notifications`، `/search`، `/play/<slug>`، `/admin/*`، `/api/*`.

> السبب: صفحات الحساب خاصة، و`/search` نتائج متغيّرة، و`/play/<slug>` نسخة مكرّرة من صفحة اللعبة.

---

## 2) ضبط المتغيرات على Vercel

`NEXT_PUBLIC_APP_URL` هو أساس كل الروابط المطلقة (canonical + sitemap + معاينة المشاركة).
**يجب ضبطه قبل البناء** لأن متغيّرات `NEXT_PUBLIC_*` تُدمج وقت البناء.

1. Vercel → المشروع → **Settings → Environment Variables**
2. أضف:

| الاسم | القيمة | البيئة |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` (بدون `/` في النهاية) | Production |

> إذا لم تضبطه، يكتشف الكود النطاق تلقائيًا من `VERCEL_PROJECT_PRODUCTION_URL`، لكن الضبط الصريح أدق وأأمن.

3. أعد النشر: **Deployments → … → Redeploy** (بدون cache إن أمكن).

### (اختياري) التحقق بطريقة وسم HTML

بدلًا من الملف يمكنك استخدام وسم الميتا:

| الاسم | القيمة |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | الرمز من Search Console (المحتوى فقط، بدون الوسم) |

---

## 3) خطوات التحقق في Google Search Console

1. افتح <https://search.google.com/search-console> → **Add property** → **URL prefix**.
2. أدخل نطاق الإنتاج بالضبط، مثال: `https://playnix.vercel.app`.
3. اختر طريقة **HTML file** → سترى اسم الملف `google16fac1570d0d10bd.html`.
   - إن كان الاسم مطابقًا للموجود في `public/` فاضغط **Verify** مباشرة.
   - إن اختلف، أضف الملف الجديد بنفس الاسم والمحتوى داخل `public/`.
4. تأكد يدويًا أولًا:

```bash
curl -s https://your-domain.com/google16fac1570d0d10bd.html
# google-site-verification: google16fac1570d0d10bd.html
```

5. اضغط **Verify**. بعد النجاح، اذهب إلى **Sitemaps** وأضف:

```
https://your-domain.com/sitemap.xml
```

---

## 4) بعد التحقق — تسريع الظهور

1. **اطلب الفهرسة يدويًا:** Search Console → **URL Inspection** → ألصق رابط الصفحة الرئيسية → **Request indexing**. كرّرها لأهم 5–10 صفحات ألعاب.
2. **تحقّق من robots.txt:** افتح `https://your-domain.com/robots.txt` — يجب أن ترى `Allow: /` و`Sitemap:`.
3. **افحص البيانات المنظّمة:** <https://search.google.com/test/rich-results> — الصق رابط لعبة، يجب أن يظهر `VideoGame` بدون أخطاء.
4. **اختبر معاينة المشاركة:** أرسل الرابط لنفسك في تيليجرام — يجب أن تظهر صورة `og-1200x630.png`.
5. **PageSpeed:** <https://pagespeed.web.dev> — الأداء عامل ترتيب.

---

## 5) ملاحظات مهمّة

- **لا تضع `noindex` في صفحة رئيسية أو لعبة**: التحقق ينجح لكن الصفحة لن تظهر أبدًا.
- **تكرار المحتوى (Duplicate content):** صفحات `/game/<slug>` هي الأصل، و`/play/<slug>` محجوبة بـ `noindex` وتعيد التوجيه عند عدم الصلاحية. لا تنشر روابط `/play/` للزوار القادمين من محرّكات البحث.
- **الوسوم `hreflang`:** الموقع يعرض ar/en/fr عبر كوكي على نفس الرابط، لذلك تشير كل اللغات إلى نفس الـ canonical — هذا مقبول عندما يكون المحتوى متماثلًا في نفس المسار.
- **حدّ التحديث:** يُعاد توليد `sitemap.xml` عند كل طلب، لذا أي لعبة تُنشر من لوحة التحكم تظهر مباشرة دون إعادة نشر.
- **الروابط الخارجية:** الظهور القوي يحتاج روابط خارجية (backlinks). شارك روابط الألعاب في قنوات تيليجرام، Reddit، Product Hunt، ومواقع ألعاب HTML5.
- **وقت الفهرسة:** موقع جديد قد يحتاج من عدة أيام إلى أسابيع. المتابعة الأسبوعية من Search Console كافية.

---

## 6) تشغيل محلي للتحقق

```bash
npm run build
NEXT_PUBLIC_APP_URL=https://your-domain.com npm run start
# ثم
curl -s localhost:3000/robots.txt
curl -s localhost:3000/sitemap.xml | head -40
```

لإعادة توليد صورة المشاركة بعد تغيير الألوان أو النص:

```bash
npm run og:image
```
