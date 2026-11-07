"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale, useT } from "./LocaleProvider";
import { Icon } from "./Icons";
import { localeLabel, locales, type Locale } from "@/lib/i18n/shared";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function choose(next: Locale) {
    setOpen(false);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={compact ? "icon-btn" : "chip"}
        onClick={() => setOpen((current) => !current)}
        aria-label={t("common.language")}
        aria-expanded={open}
        disabled={pending}
      >
        <Icon name="globe" size={18} />
        {!compact && <span>{localeLabel(locale)}</span>}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} tabIndex={-1} />
          <div className="glass absolute end-0 top-[calc(100%+0.4rem)] z-50 w-40 overflow-hidden rounded-xl p-1.5 shadow-2xl">
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => choose(item)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/5"
                style={{ color: item === locale ? "var(--color-cyan)" : undefined }}
              >
                <span>{localeLabel(item)}</span>
                {item === locale && <Icon name="check" size={15} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
