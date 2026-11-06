/**
 * Locale helpers that are safe for both server and client bundles.
 * Anything that reads cookies lives in ./index.ts (server only).
 */
import { dictionaries, locales, type Dict, type DictKey, type Locale } from "./dictionary";

export { dictionaries, locales };
export type { Dict, DictKey, Locale };

export const LOCALE_COOKIE = "playnix_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ar" || value === "fr";
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function localeLabel(locale: Locale): string {
  return { en: "English", ar: "العربية", fr: "Français" }[locale];
}

export function normaliseLocale(value: string | null | undefined): Locale {
  if (!value) return "en";
  const lower = value.toLowerCase();
  if (isLocale(lower)) return lower;
  const base = lower.split("-")[0];
  return isLocale(base) ? base : "en";
}

export function getDictionaryFor(locale: Locale): Dict {
  return dictionaries[locale] as Dict;
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

const intlLocales: Record<Locale, string> = { en: "en-GB", ar: "ar", fr: "fr-FR" };

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
