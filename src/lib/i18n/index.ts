import { cookies } from "next/headers";
import type { Dict, Locale } from "./dictionary";
import { getDictionaryFor, isLocale, LOCALE_COOKIE } from "./shared";

export * from "./shared";

/** Reads the locale cookie; falls back to English. */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const fromCookie = store.get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    // Outside a request scope (static rendering of not-found, build time, tests).
  }
  return "en";
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dict; dir: "rtl" | "ltr" }> {
  const locale = await getLocale();
  return { locale, dict: getDictionaryFor(locale), dir: locale === "ar" ? "rtl" : "ltr" };
}
