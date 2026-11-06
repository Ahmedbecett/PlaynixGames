"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Dict, DictKey, Locale } from "@/lib/i18n/dictionary";
import { makeTranslate, type Translate } from "@/lib/i18n/shared";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  dict: Dict;
  t: Translate;
  formatNumber: (value: number) => string;
  formatDate: (iso: string | null | undefined) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(() => {
    const intlLocale = locale === "ar" ? "ar" : locale === "fr" ? "fr-FR" : "en-GB";
    return {
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      dict,
      t: makeTranslate(dict),
      formatNumber: (input: number) => new Intl.NumberFormat(intlLocale).format(input),
      formatDate: (iso?: string | null) => {
        if (!iso) return "—";
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "—";
        return new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "short", day: "numeric" }).format(date);
      },
    };
  }, [locale, dict]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function useT(): Translate {
  return useLocale().t;
}

export type { DictKey };
