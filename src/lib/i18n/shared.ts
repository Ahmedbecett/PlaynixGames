/**
 * Locale helpers that are safe for both server and client bundles.
 * Anything that reads cookies lives in ./index.ts (server only).
 */
import { dictionaries, locales, type Dict, type DictKey, type Locale } from "./dictionary";

export { dictionaries, locales };
export type { Dict, DictKey, Locale };

export const LOCALE_COOKIE = "playnix_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && (locales as string[]).includes(value);
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Language names, each written in its own script. */
export function localeLabel(locale: Locale): string {
  return { en: "English", ar: "العربية", fr: "Français", es: "Español", ru: "Русский" }[locale];
}

export function normaliseLocale(value: string | null | undefined): Locale {
  if (!value) return "en";
  const lower = value.toLowerCase();
  if (isLocale(lower)) return lower;
  const base = lower.split("-")[0];
  return isLocale(base) ? base : "en";
}

/**
 * Resolves a locale to a complete dictionary. English is complete by definition;
 * other locales are layered on top of it, so an untranslated key renders in
 * English rather than as a raw `section.key` string.
 */
export function getDictionaryFor(locale: Locale): Dict {
  if (locale === "en") return dictionaries.en as Dict;
  return { ...dictionaries.en, ...dictionaries[locale] } as Dict;
}

/** How many keys a locale actually translates (used by `npm run i18n:coverage`). */
export function translationCoverage(locale: Locale): { translated: number; total: number } {
  const total = Object.keys(dictionaries.en).length;
  const dict = dictionaries[locale] as Record<string, string | undefined>;
  const translated = Object.keys(dictionaries.en).filter((key) => Boolean(dict[key])).length;
  return { translated, total };
}

export type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

export function makeTranslate(dict: Dict): Translate {
  return (key, vars) => {
    const template = dict[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
    );
  };
}

const intlLocales: Record<Locale, string> = { en: "en-GB", ar: "ar", fr: "fr-FR", es: "es-ES", ru: "ru-RU" };

export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocales[locale] ?? "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocales[locale] ?? "en-GB").format(value);
}

export function formatStars(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocales[locale] ?? "en-GB").format(value);
}
