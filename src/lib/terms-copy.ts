import type { PrivacyLocale } from "./privacy-copy";

type PageCopy = { title: string; updated: string; intro: string; sections: Array<{ heading: string; paragraphs: string[] }> };

export const termsCopy: Record<PrivacyLocale, PageCopy> = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: 8 November 2026",
    intro:
      "These terms govern use of the Playnix Telegram bot and Mini App. By opening Playnix you agree to them.",
    sections: [
      {
        heading: "1. The service",
        paragraphs: [
          "Playnix lets you search and play HTML5 games inside Telegram. Features, catalog size and availability can change as we add or retire titles.",
          "Premium access is sold with Telegram Stars. Rewarded ads may grant a short pass to one premium game. Ads are not shown during an already-running game session.",
        ],
      },
      {
        heading: "2. Your account",
        paragraphs: [
          "You sign in with Telegram. You are responsible for activity on your Telegram account. Do not abuse ratings, reports, search or the player.",
          "We may suspend accounts that break these terms, spam, cheat reward limits, or harm other players.",
        ],
      },
      {
        heading: "3. Games and licences",
        paragraphs: [
          "Each listed game has a recorded licence and source. You get a personal, non-transferable right to play it through Playnix — not ownership of the game files.",
          "Do not scrape, redistribute or wrap our games outside Playnix.",
        ],
      },
      {
        heading: "4. Payments",
        paragraphs: [
          "Stars payments are processed by Telegram. Premium starts only after we receive a verified successful_payment. Refunds follow Telegram’s Stars rules.",
          "Deleting your account cancels subscriptions going forward; payment records are kept for accounting.",
        ],
      },
      {
        heading: "5. Acceptable use",
        paragraphs: [
          "No cheating of ad rewards, no automated abuse of the APIs, no illegal content in reviews, no attempts to break authentication or payments.",
        ],
      },
      {
        heading: "6. Liability",
        paragraphs: [
          "Playnix is provided as available. Games, ads and Telegram itself can fail. We are not liable for lost progress, failed payments outside our control, or third-party ad content.",
        ],
      },
      {
        heading: "7. Contact",
        paragraphs: ["Questions: @PlayNixGamesBot on Telegram. Privacy: /privacy."],
      },
    ],
  },
  ar: {
    title: "شروط الخدمة",
    updated: "آخر تحديث: 8 نوفمبر 2026",
    intro: "تنظّم هذه الشروط استخدام بوت بلاينكس والتطبيق المصغّر. بفتح بلاينكس فأنت توافق عليها.",
    sections: [
      {
        heading: "1. الخدمة",
        paragraphs: [
          "تتيح بلاينكس البحث ولعب ألعاب HTML5 داخل تيليجرام. قد تتغير الميزات وحجم الكتالوج مع إضافة أو سحب عناوين.",
          "البريميوم يُباع بنجوم تيليجرام. قد تمنح الإعلانات بمكافأة مرورًا قصيرًا للعبة مميزة واحدة. لا تُعرض إعلانات فوق جلسة لعب جارية.",
        ],
      },
      {
        heading: "2. حسابك",
        paragraphs: [
          "تسجّل الدخول بتيليجرام. أنت مسؤول عن نشاط حسابك. لا تُسئ استخدام التقييمات أو البلاغات أو البحث أو المشغّل.",
          "قد نعلّق الحسابات التي تخالف الشروط أو تزعج أو تحتال على حدود المكافآت أو تضر باللاعبين.",
        ],
      },
      {
        heading: "3. الألعاب والتراخيص",
        paragraphs: [
          "لكل لعبة معروضة ترخيص ومصدر مسجّلان. تحصل على حق شخصي غير قابل للنقل للعبها عبر بلاينكس — وليس ملكية الملفات.",
          "لا تنسخ الألعاب ولا تعيد توزيعها خارج بلاينكس.",
        ],
      },
      {
        heading: "4. المدفوعات",
        paragraphs: [
          "مدفوعات النجوم يعالجها تيليجرام. يبدأ البريميوم فقط بعد successful_payment موثّق. الاسترجاع وفق قواعد نجوم تيليجرام.",
          "حذف الحساب يلغي الاشتراكات لاحقًا؛ تُحفظ سجلات الدفع للمحاسبة.",
        ],
      },
      {
        heading: "5. الاستخدام المقبول",
        paragraphs: ["لا احتيال على مكافآت الإعلان، ولا إساءة آلية لواجهات البرمجة، ولا محتوى غير قانوني في المراجعات، ولا محاولات كسر المصادقة أو الدفع."],
      },
      {
        heading: "6. المسؤولية",
        paragraphs: ["تُقدَّم بلاينكس كما هي متاحة. قد تفشل الألعاب أو الإعلانات أو تيليجرام. لا نتحمل ضياع التقدّم أو فشل دفع خارج سيطرتنا أو محتوى إعلانات طرف ثالث."],
      },
      {
        heading: "7. تواصل",
        paragraphs: ["الأسئلة: @PlayNixGamesBot على تيليجرام. الخصوصية: /privacy."],
      },
    ],
  },
  fr: {
    title: "Conditions d’utilisation",
    updated: "Dernière mise à jour : 8 novembre 2026",
    intro: "Ces conditions régissent l’usage du bot et de la Mini App Playnix. En ouvrant Playnix, vous les acceptez.",
    sections: [
      {
        heading: "1. Le service",
        paragraphs: [
          "Playnix permet de chercher et jouer à des jeux HTML5 dans Telegram. Le catalogue peut évoluer.",
          "Le Premium se paie en Telegram Stars. Une publicité récompensée peut donner un accès court à un jeu Premium. Pas de pub pendant une partie déjà lancée.",
        ],
      },
      {
        heading: "2. Compte",
        paragraphs: [
          "Connexion via Telegram. Vous êtes responsable de l’activité de votre compte. Pas d’abus des notes, signalements, recherche ou lecteur.",
          "Nous pouvons suspendre les comptes qui enfreignent ces conditions, spamment, trichent sur les récompenses ou nuisent aux autres.",
        ],
      },
      {
        heading: "3. Jeux et licences",
        paragraphs: [
          "Chaque jeu a une licence et une source enregistrées. Vous obtenez un droit personnel de jouer via Playnix, pas la propriété des fichiers.",
          "Pas de redistribution hors de Playnix.",
        ],
      },
      {
        heading: "4. Paiements",
        paragraphs: [
          "Les Stars sont traités par Telegram. Le Premium commence après un successful_payment vérifié. Remboursements selon les règles Stars.",
          "La suppression du compte annule les abonnements à venir ; les paiements sont conservés pour la comptabilité.",
        ],
      },
      {
        heading: "5. Usage acceptable",
        paragraphs: ["Pas de triche sur les pubs, pas d’abus automatisé des API, pas de contenu illégal dans les avis, pas de contournement de l’auth ou des paiements."],
      },
      {
        heading: "6. Responsabilité",
        paragraphs: ["Playnix est fourni en l’état. Jeux, pubs et Telegram peuvent échouer. Pas de responsabilité pour une progression perdue, un paiement hors de notre contrôle, ou le contenu publicitaire tiers."],
      },
      {
        heading: "7. Contact",
        paragraphs: ["Questions : @PlayNixGamesBot. Confidentialité : /privacy."],
      },
    ],
  },
};

export function termsFor(locale: string): PageCopy {
  if (locale === "ar" || locale === "fr") return termsCopy[locale];
  return termsCopy.en;
}
