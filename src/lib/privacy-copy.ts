export type PrivacyLocale = "en" | "ar" | "fr";

export type PrivacyCopy = {
  title: string;
  updated: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

const UPDATED = "8 November 2026";
const UPDATED_AR = "8 نوفمبر 2026";
const UPDATED_FR = "8 novembre 2026";

export const privacyCopy: Record<PrivacyLocale, PrivacyCopy> = {
  en: {
    title: "Privacy Policy",
    updated: `Last updated: ${UPDATED}`,
    intro:
      "Playnix is a Telegram Mini App and bot (@PlayNixGamesBot). This policy explains what we collect when you use the bot or the Mini App, why we collect it, and the choices you have. We do not ask for an email or a password. Sign-in uses Telegram.",
    sections: [
      {
        heading: "1. Who we are",
        paragraphs: [
          "Playnix lets you search, discover and play HTML5 games inside Telegram. This policy covers the bot, the Mini App, and the website that hosts them.",
          "Telegram also processes your data under its own privacy policy when you use Telegram itself. That is separate from Playnix.",
        ],
      },
      {
        heading: "2. Data we collect",
        paragraphs: [
          "Telegram profile. When you open the Mini App or message the bot, Telegram sends us your Telegram user id, name, username, language code and profile photo URL. We store these to create and recognise your Playnix account.",
          "Activity (signed-in). Games you open and how long you play, favorites, ratings and reviews, reports, game suggestions, notification reads, and search queries.",
          "Payments. Premium is sold with Telegram Stars. We store invoice and payment records (amount, plan, Telegram payment identifiers, status) and subscription dates. Telegram processes the payment. We never receive card numbers, bank details, or your Stars balance beyond what the Bot API sends us.",
          "Ads. Free visitors may see ads from our advertising partner Monetag. Watching a rewarded ad can unlock one premium game for a short time; we store that unlock (which game, when, and how many today). Monetag may collect device, cookie or similar data under its own policy. We do not sell your Telegram identity to advertisers.",
          "Technical. We set an HttpOnly session cookie (playnix_session) and a language cookie (playnix_locale). We use IP addresses for rate limiting and, for admin actions, an audit log. Our host (Vercel) may record anonymous page analytics.",
          "You can browse some screens without signing in. In that case we have no Telegram profile for you, but ads, cookies and hosting logs may still apply.",
        ],
      },
      {
        heading: "3. How we use data",
        paragraphs: [
          "To run the bot and Mini App: sign you in, remember your language, and load the player.",
          "To keep favorites, history, reviews and suggestions.",
          "To fulfil Stars subscriptions and ad unlocks, and to prevent abuse of those rewards.",
          "To moderate reports and protect the service.",
          "To improve search and the catalog.",
          "To message you inside Telegram (bot replies and in-app notifications).",
          "We do not sell personal data.",
        ],
      },
      {
        heading: "4. Who we share with",
        paragraphs: [
          "Telegram — authentication, bot messages and Stars payments.",
          "Hosting and database providers that run Playnix (currently Vercel and a PostgreSQL host).",
          "Monetag — to display ads.",
          "Other players, when you publish a review: your display name may appear next to it.",
          "We share data only to operate Playnix, to comply with law, or to protect the service and other users.",
        ],
      },
      {
        heading: "5. Retention",
        paragraphs: [
          "We keep your profile while the account is active.",
          "If you delete the account we remove favorites, play history, reviews, reports and notification reads; we clear your name, username and photo; we cancel subscriptions; and we replace the Telegram id so that profile cannot be reused. Payment records are kept for accounting. Some security logs, search logs and ad-unlock records may remain for a limited time.",
        ],
      },
      {
        heading: "6. Your choices",
        paragraphs: [
          "Language: Profile in the Mini App, or /language in the bot.",
          "Delete account: Profile → Delete my account. You can also block the bot in Telegram.",
          "Ads: Premium subscribers do not see the automatic ads. We do not currently offer a separate in-app ads opt-out.",
        ],
      },
      {
        heading: "7. Children",
        paragraphs: [
          "Playnix is not directed at children under 13. Do not use it if you are under the minimum age required by Telegram in your country.",
        ],
      },
      {
        heading: "8. Changes",
        paragraphs: [
          "We may update this page. The date at the top will change. Continued use of Playnix after an update means you accept the revised policy.",
        ],
      },
      {
        heading: "9. Contact",
        paragraphs: [
          "Questions about this policy: message @PlayNixGamesBot on Telegram.",
        ],
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: `آخر تحديث: ${UPDATED_AR}`,
    intro:
      "بلاينكس (Playnix) تطبيق مصغّر وبوت على تيليجرام (@PlayNixGamesBot). توضّح هذه السياسة ما نجمعه عند استخدام البوت أو التطبيق، ولماذا، وما الخيارات المتاحة لك. لا نطلب بريدًا إلكترونيًا ولا كلمة مرور. تسجيل الدخول يتم عبر تيليجرام.",
    sections: [
      {
        heading: "1. من نحن",
        paragraphs: [
          "تتيح لك بلاينكس البحث واكتشاف ألعاب HTML5 ولعبها داخل تيليجرام. تشمل هذه السياسة البوت والتطبيق المصغّر والموقع الذي يستضيفهما.",
          "يعالج تيليجرام بياناتك أيضًا وفق سياسة خصوصيته عند استخدام تطبيق تيليجرام نفسه. ذلك مستقل عن بلاينكس.",
        ],
      },
      {
        heading: "2. البيانات التي نجمعها",
        paragraphs: [
          "ملف تيليجرام. عند فتح التطبيق المصغّر أو مراسلة البوت يرسل لنا تيليجرام معرّفك، اسمك، اسم المستخدم، رمز اللغة، ورابط صورة الملف. نخزّنها لإنشاء حسابك والتعرف عليه.",
          "النشاط (بعد تسجيل الدخول). الألعاب التي تفتحها ومدة اللعب، المفضلة، التقييمات والمراجعات، البلاغات، اقتراحات الألعاب، قراءة الإشعارات، واستعلامات البحث.",
          "المدفوعات. الاشتراك المميز يُباع بنجوم تيليجرام. نخزّن سجلات الفواتير والدفع (المبلغ، الخطة، معرّفات الدفع، الحالة) وتواريخ الاشتراك. تيليجرام يتولى الدفع. لا نستلم أرقام بطاقات ولا بيانات بنكية ولا رصيد نجومك بما يتجاوز ما يرسله Bot API.",
          "الإعلانات. قد يظهر للزوار المجانيين إعلانات من شريكنا Monetag. مشاهدة إعلان بمكافأة يمكن أن تفتح لعبة مميزة لفترة قصيرة؛ نخزّن هذا الفتح (اللعبة، الوقت، العدد اليومي). قد تجمع Monetag بيانات الجهاز أو ملفات تعريف الارتباط وفق سياستها. لا نبيع هويتك على تيليجرام للمعلنين.",
          "بيانات تقنية. نضع كوكي جلسة HttpOnly (playnix_session) وكوكي اللغة (playnix_locale). نستخدم عنوان IP لتحديد معدّل الطلبات، وللإجراءات الإدارية في سجل التدقيق. قد يسجّل المضيف (Vercel) إحصاءات صفحات مجهولة.",
          "يمكنك تصفح بعض الشاشات دون تسجيل دخول. عندها لا يكون لدينا ملف تيليجرام لك، لكن الإعلانات والكوكيز وسجلات الاستضافة قد تبقى سارية.",
        ],
      },
      {
        heading: "3. كيف نستخدم البيانات",
        paragraphs: [
          "لتشغيل البوت والتطبيق: تسجيل الدخول، تذكر اللغة، وتشغيل الألعاب.",
          "لحفظ المفضلة والسجل والمراجعات والاقتراحات.",
          "لتنفيذ اشتراكات النجوم وفتح الألعاب عبر الإعلان، ومنع إساءة استخدام المكافآت.",
          "لمراجعة البلاغات وحماية الخدمة.",
          "لتحسين البحث والكتالوج.",
          "لمراسلتك داخل تيليجرام (ردود البوت وإشعارات التطبيق).",
          "لا نبيع البيانات الشخصية.",
        ],
      },
      {
        heading: "4. مع من نشارك",
        paragraphs: [
          "تيليجرام — المصادقة ورسائل البوت ومدفوعات النجوم.",
          "مزوّدو الاستضافة وقاعدة البيانات الذين يشغّلون بلاينكس (حاليًا Vercel ومضيف PostgreSQL).",
          "Monetag — لعرض الإعلانات.",
          "اللاعبون الآخرون عندما تنشر مراجعة: قد يظهر اسم العرض بجانبها.",
          "نشارك البيانات فقط لتشغيل بلاينكس، أو للامتثال للقانون، أو لحماية الخدمة والمستخدمين.",
        ],
      },
      {
        heading: "5. مدة الاحتفاظ",
        paragraphs: [
          "نحتفظ بملفك ما دام الحساب نشطًا.",
          "إذا حذفت الحساب نزيل المفضلة وسجل اللعب والمراجعات والبلاغات وقراءات الإشعارات، ونمسح الاسم واسم المستخدم والصورة، ونلغي الاشتراكات، ونستبدل معرّف تيليجرام حتى لا يُعاد استخدام الملف. تُحفظ سجلات الدفع للمحاسبة. قد تبقى بعض سجلات الأمان والبحث وفتح الإعلانات لفترة محدودة.",
        ],
      },
      {
        heading: "6. خياراتك",
        paragraphs: [
          "اللغة: الملف الشخصي في التطبيق، أو /language في البوت.",
          "حذف الحساب: الملف الشخصي → حذف حسابي. يمكنك أيضًا حظر البوت في تيليجرام.",
          "الإعلانات: مشتركي البريميوم لا يرون الإعلانات التلقائية. لا نوفر حاليًا خيار إيقاف إعلانات منفصل داخل التطبيق.",
        ],
      },
      {
        heading: "7. الأطفال",
        paragraphs: [
          "بلاينكس غير موجّه لمن هم دون 13 عامًا. لا تستخدمه إن كنت أصغر من الحد الأدنى الذي يفرضه تيليجرام في بلدك.",
        ],
      },
      {
        heading: "8. التغييرات",
        paragraphs: [
          "قد نحدّث هذه الصفحة. يتغير التاريخ في الأعلى. استمرار استخدام بلاينكس بعد التحديث يعني قبول السياسة المعدّلة.",
        ],
      },
      {
        heading: "9. التواصل",
        paragraphs: [
          "للأسئلة حول هذه السياسة: راسل @PlayNixGamesBot على تيليجرام.",
        ],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: `Dernière mise à jour : ${UPDATED_FR}`,
    intro:
      "Playnix est une Mini App et un bot Telegram (@PlayNixGamesBot). Cette politique décrit les données que nous collectons lorsque vous utilisez le bot ou la Mini App, pourquoi, et vos choix. Nous ne demandons ni e-mail ni mot de passe. La connexion passe par Telegram.",
    sections: [
      {
        heading: "1. Qui nous sommes",
        paragraphs: [
          "Playnix permet de chercher, découvrir et jouer à des jeux HTML5 dans Telegram. Cette politique couvre le bot, la Mini App et le site qui les héberge.",
          "Telegram traite aussi vos données selon sa propre politique lorsque vous utilisez Telegram. Cela est distinct de Playnix.",
        ],
      },
      {
        heading: "2. Données collectées",
        paragraphs: [
          "Profil Telegram. À l’ouverture de la Mini App ou d’un message au bot, Telegram nous envoie votre identifiant, nom, nom d’utilisateur, langue et URL de photo. Nous les stockons pour créer et reconnaître votre compte Playnix.",
          "Activité (connecté). Jeux ouverts et durée de jeu, favoris, notes et avis, signalements, suggestions, lectures de notifications et requêtes de recherche.",
          "Paiements. L’abonnement Premium se paie en Telegram Stars. Nous stockons factures et paiements (montant, offre, identifiants Telegram, statut) et les dates d’abonnement. Telegram traite le paiement. Nous ne recevons ni numéro de carte, ni coordonnées bancaires, ni solde Stars au-delà de ce que l’API Bot nous envoie.",
          "Publicités. Les visiteurs gratuits peuvent voir des publicités de notre partenaire Monetag. Une publicité récompensée peut débloquer un jeu Premium pour une courte durée ; nous enregistrons ce déblocage (jeu, moment, quota du jour). Monetag peut collecter des données d’appareil ou de cookies selon sa propre politique. Nous ne vendons pas votre identité Telegram aux annonceurs.",
          "Données techniques. Cookie de session HttpOnly (playnix_session) et cookie de langue (playnix_locale). L’adresse IP sert au plafonnement des requêtes et, pour les actions d’administration, au journal d’audit. L’hébergeur (Vercel) peut enregistrer une analytics de pages anonyme.",
          "Vous pouvez parcourir certains écrans sans compte. Nous n’avons alors pas de profil Telegram, mais publicités, cookies et journaux d’hébergement peuvent s’appliquer.",
        ],
      },
      {
        heading: "3. Utilisation",
        paragraphs: [
          "Faire fonctionner le bot et la Mini App : connexion, langue, lecteur.",
          "Conserver favoris, historique, avis et suggestions.",
          "Honorer les abonnements Stars et les déblocages publicitaires, et en empêcher l’abus.",
          "Modérer les signalements et protéger le service.",
          "Améliorer la recherche et le catalogue.",
          "Vous écrire dans Telegram (réponses du bot et notifications).",
          "Nous ne vendons pas de données personnelles.",
        ],
      },
      {
        heading: "4. Destinataires",
        paragraphs: [
          "Telegram — authentification, messages du bot et paiements Stars.",
          "Hébergeurs et base de données qui font tourner Playnix (actuellement Vercel et un hôte PostgreSQL).",
          "Monetag — affichage des publicités.",
          "Les autres joueurs, si vous publiez un avis : votre nom d’affichage peut apparaître.",
          "Nous ne partageons des données que pour opérer Playnix, respecter la loi, ou protéger le service et les utilisateurs.",
        ],
      },
      {
        heading: "5. Conservation",
        paragraphs: [
          "Nous conservons votre profil tant que le compte est actif.",
          "Si vous supprimez le compte, nous retirons favoris, historique, avis, signalements et lectures de notifications ; nous effaçons nom, identifiant et photo ; nous annulons les abonnements ; et nous remplaçons l’identifiant Telegram pour que le profil ne soit pas réutilisé. Les paiements sont conservés pour la comptabilité. Certains journaux de sécurité, de recherche et de déblocages publicitaires peuvent rester un temps limité.",
        ],
      },
      {
        heading: "6. Vos choix",
        paragraphs: [
          "Langue : Profil dans la Mini App, ou /language dans le bot.",
          "Supprimer le compte : Profil → Supprimer mon compte. Vous pouvez aussi bloquer le bot dans Telegram.",
          "Publicités : les abonnés Premium ne voient pas les publicités automatiques. Nous n’offrons pas d’opt-out publicitaire séparé dans l’app.",
        ],
      },
      {
        heading: "7. Enfants",
        paragraphs: [
          "Playnix ne s’adresse pas aux enfants de moins de 13 ans. Ne l’utilisez pas si vous n’avez pas l’âge minimum exigé par Telegram dans votre pays.",
        ],
      },
      {
        heading: "8. Modifications",
        paragraphs: [
          "Nous pouvons mettre à jour cette page. La date en haut changera. Continuer à utiliser Playnix après une mise à jour vaut acceptation de la politique révisée.",
        ],
      },
      {
        heading: "9. Contact",
        paragraphs: [
          "Questions : écrivez à @PlayNixGamesBot sur Telegram.",
        ],
      },
    ],
  },
};

export function privacyFor(locale: string): PrivacyCopy {
  if (locale === "ar" || locale === "fr") return privacyCopy[locale];
  return privacyCopy.en;
}
