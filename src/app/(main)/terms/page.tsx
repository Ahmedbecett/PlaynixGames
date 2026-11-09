import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import { termsFor } from "@/lib/terms-copy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using the Playnix Telegram bot and Mini App.",
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const { locale } = await getDictionary();
  const copy = termsFor(locale);

  return (
    <article className="fade-up mx-auto max-w-2xl pb-8">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-cyan)]">Playnix</p>
      <h1 className="text-2xl font-extrabold tracking-tight">{copy.title}</h1>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.updated}</p>
      <p className="mt-4 text-[15px] leading-relaxed">{copy.intro}</p>
      {copy.sections.map((section) => (
        <section key={section.heading} className="mt-7">
          <h2 className="text-base font-extrabold">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-2 text-[14px] leading-relaxed text-[var(--color-muted)]">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
