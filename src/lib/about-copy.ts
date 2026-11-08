import type { PrivacyLocale } from "./privacy-copy";

type PageCopy = { title: string; updated: string; intro: string; sections: Array<{ heading: string; paragraphs: string[] }> };

export const aboutCopy: Record<PrivacyLocale, PageCopy> = {
  en: {
    title: "About Playnix",
    updated: "A Telegram Mini App for real, instant-play games.",
    intro:
      "Playnix is a gaming marketplace and launcher that lives inside Telegram. Search, discover and play verified HTML5 games without installing an APK. The catalog is original Playnix titles with recorded licences — not empty cards.",
    sections: [
      {
        heading: "What you can do",
        paragraphs: [
          "Browse categories, search by name, developer or tag, save favorites, rate games, and resume what you were playing.",
          "Four titles sit behind Playnix Premium. Subscribe with Telegram Stars, or watch a short rewarded ad for a time-limited pass to one premium game.",
        ],
      },
      {
        heading: "How it is built",
        paragraphs: [
          "Sign-in uses Telegram (initData is verified on the server). Payments use Telegram Stars. Hosting is on Vercel with a PostgreSQL database.",
          "We do not invent ratings, player counts or games. If a title cannot launch, it is not shown as playable.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["Message the bot @PlayNixGamesBot on Telegram."],
      },
    ],
  },
  ar: {
    title: "حول بلاينكس",
    updated: "تطبيق تيليجرام مصغّر لألعاب حقيقية تُلعب فورًا.",
    intro:
      "بلاينكس سوق ألعاب ومشغّل داخل تيليجرام. ابحث واكتشف والعب ألعاب HTML5 موثّقة دون تثبيت. الكتالوج عناوين أصلية بتراخيص مسجّلة — ليست بطاقات فارغة.",
    sections: [
      {
        heading: "ماذا يمكنك أن تفعل",
        paragraphs: [
          "تصفح الفئات، ابحث بالاسم أو المطوّر أو الوسم، احفظ المفضلة، قيّم الألعاب، وأكمل ما كنت تلعبه.",
          "أربع ألعاب خلف بلاينكس بريميوم. اشترك بنجوم تيليجرام، أو شاهد إعلانًا بمكافأة لفتح لعبة مميزة لفترة محدودة.",
        ],
      },
      {
        heading: "كيف بُنيت",
        paragraphs: [
          "تسجيل الدخول عبر تيليجرام (يُتحقق من initData على الخادم). الدفع بنجوم تيليجرام. الاستضافة على Vercel وقاعدة PostgreSQL.",
          "لا نخترع تقييمات ولا أعداد لاعبين ولا ألعابًا. إن تعذّر تشغيل عنوان فلن يُعرض كقابل للعب.",
        ],
      },
      {
        heading: "تواصل",
        paragraphs: ["راسل البوت @PlayNixGamesBot على تيليجرام."],
      },
    ],
  },
  fr: {
    title: "À propos de Playnix",
    updated: "Une Mini App Telegram pour de vrais jeux instantanés.",
    intro:
      "Playnix est une marketplace et un lanceur dans Telegram. Cherchez, découvrez et jouez à des jeux HTML5 vérifiés, sans APK. Le catalogue contient des titres originaux sous licence — pas des cartes vides.",
    sections: [
      {
        heading: "Ce que vous pouvez faire",
        paragraphs: [
          "Parcourir les catégories, chercher par nom, développeur ou tag, garder des favoris, noter, et reprendre une partie.",
          "Quatre titres sont derrière Playnix Premium. Abonnez-vous en Telegram Stars, ou regardez une publicité récompensée pour un accès limité à un jeu Premium.",
        ],
      },
      {
        heading: "Technique",
        paragraphs: [
          "Connexion Telegram (initData vérifié côté serveur). Paiements en Stars. Hébergement Vercel et PostgreSQL.",
          "Nous n’inventons ni notes, ni compteurs, ni jeux. Un titre qui ne se lance pas n’est pas affiché comme jouable.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["Écrivez à @PlayNixGamesBot sur Telegram."],
      },
    ],
  },
};

export function aboutFor(locale: string): PageCopy {
  if (locale === "ar" || locale === "fr") return aboutCopy[locale];
  return aboutCopy.en;
}
