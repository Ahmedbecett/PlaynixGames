import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { botStartAppLink } from "@/lib/telegram-links";
import { Icon } from "./Icons";

/**
 * Big, unmissable call-to-action that pushes visitors into the Telegram bot.
 *
 * Rendered on the home page and as a compact banner elsewhere. The link uses
 * `https://t.me/<bot>?startapp=…` so Telegram opens the Mini App straight into
 * the requested screen; without a configured bot username it falls back to the
 * in-app page so the block never renders a dead button.
 */
export async function TelegramCta({
  variant = "hero",
  startParam,
  href,
}: {
  variant?: "hero" | "banner";
  /** `startapp` payload, e.g. `game_neon-serpent` (see telegram-links). */
  startParam?: string;
  /** In-app fallback when no bot username is configured. */
  href?: string;
}) {
  const { dict } = await getDictionary();
  const telegramUrl = botStartAppLink(startParam);
  const target = telegramUrl ?? href ?? "/";

  if (variant === "banner") {
    return (
      <Link
        href={target}
        {...(telegramUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="mb-6 flex items-center gap-3 rounded-2xl border border-[rgba(41,182,246,.34)] p-3.5 transition hover:border-[rgba(41,182,246,.6)]"
        style={{ background: "linear-gradient(120deg,rgba(41,182,246,.16),rgba(139,92,246,.12))" }}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg,#29B6F6,#0288D1)" }}>
          <Icon name="telegram" size={22} filled style={{ color: "#fff" }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold leading-tight">{dict["telegram.ctaTitle"]}</span>
          <span className="block text-[11px] leading-snug text-[var(--color-muted)]">{dict["telegram.bannerBody"]}</span>
        </span>
        <Icon name="chevronRight" size={16} className="shrink-0 flip-x" style={{ color: "var(--color-cyan)" }} />
      </Link>
    );
  }

  return (
    <section
      className="relative mb-7 overflow-hidden rounded-[1.4rem] border border-[rgba(41,182,246,.34)] p-5 sm:p-6"
      style={{ background: "linear-gradient(125deg,rgba(41,182,246,.18),rgba(139,92,246,.14) 55%,rgba(255,122,24,.12))" }}
      aria-labelledby="telegram-cta-title"
    >
      <span
        className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full"
        style={{ background: "radial-gradient(circle,rgba(41,182,246,.42),transparent 70%)" }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-start">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl"
          style={{ background: "linear-gradient(135deg,#29B6F6,#0288D1)", boxShadow: "0 14px 34px -14px rgba(41,182,246,.9)" }}
        >
          <Icon name="telegram" size={32} filled style={{ color: "#fff" }} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="telegram-cta-title" className="text-lg font-[850] tracking-tight sm:text-xl">
            {dict["telegram.ctaTitle"]}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">{dict["telegram.ctaBody"]}</p>
        </div>
        <div className="flex w-full flex-col items-center gap-1.5 sm:w-auto">
          <Link
            href={target}
            {...(telegramUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="btn w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg,#29B6F6,#0288D1)", boxShadow: "0 12px 30px -12px rgba(41,182,246,.85)", color: "#fff" }}
          >
            <Icon name="telegram" size={17} filled />
            {dict["telegram.ctaButton"]}
          </Link>
          <span className="text-[10.5px] font-semibold text-[var(--color-muted)]">{dict["telegram.ctaHint"]}</span>
        </div>
      </div>
    </section>
  );
}
