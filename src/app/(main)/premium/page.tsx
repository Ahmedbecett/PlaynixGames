import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { adUnlocksUsed, adsPolicy } from "@/lib/ads";
import { getPublishedGameBySlug, listGamesByFlag } from "@/lib/games";
import { AdUnlockCard } from "@/components/ads/AdUnlockCard";
import { env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";
import { listPlans, planFeatures } from "@/lib/payments";
import { Icon } from "@/components/Icons";
import { PremiumPlans } from "@/components/PremiumPlans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Premium" };

export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; game?: string }>;
}) {
  const { reason, game: gameSlug } = await searchParams;
  const { dict, locale } = await getDictionary();
  const [user, premiumStatus, plans] = await Promise.all([getCurrentUser(), getPremiumStatus(), listPlans()]);

  const localizedPlans = plans.map((plan) => ({
    id: plan.id,
    name: (locale === "ar" && plan.name_ar) || (locale === "fr" && plan.name_fr) || plan.name,
    description: plan.description,
    price: Number(plan.price),
    durationDays: Number(plan.duration_days),
    features: planFeatures(plan),
  }));

  // Rewarded ads: a third path for people who will not pay today. The card only
  // renders when the visitor was actually stopped by a premium game, so the page
  // never advertises "watch an ad" out of context.
  const adPolicy = adsPolicy();
  const adAudience = adPolicy.enabled && Boolean(user) && !premiumStatus.premium;
  const adRemaining = adAudience && user ? Math.max(0, adPolicy.dailyLimit - (await adUnlocksUsed(user.id))) : 0;
  const lockedGame = reason === "locked" && gameSlug ? await getPublishedGameBySlug(gameSlug) : null;
  const adOption =
    adAudience && lockedGame && lockedGame.pricing_type === "premium"
      ? { game: lockedGame, remaining: adRemaining }
      : null;
  // Always offer the ad path on this page (not only after a redirect): a visitor
  // who opened Premium directly could otherwise never discover it.
  const adPicker = adAudience ? { games: await listGamesByFlag("premium", 8), remaining: adRemaining } : null;

  const benefits: (keyof typeof dict)[] = [
    "premium.benefit.library",
    "premium.benefit.collections",
    "premium.benefit.ads",
    "premium.benefit.early",
    "premium.benefit.support",
  ];

  return (
    <div className="fade-up">
      <section
        className="relative mb-5 overflow-hidden rounded-[1.4rem] border border-[rgba(139,92,246,.35)] p-5 sm:p-7"
        style={{ background: "linear-gradient(140deg,rgba(139,92,246,.22),rgba(9,11,20,.9) 55%,rgba(255,122,24,.14))" }}
      >
        <span className="eyebrow flex items-center gap-1.5">
          <Icon name="crown" size={13} style={{ color: "var(--color-orange)" }} />
          Playnix Premium
        </span>
        <h1 className="mt-2 text-2xl font-[850] tracking-tight sm:text-3xl">{dict["premium.title"]}</h1>
        <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-[var(--color-muted)]">{dict["premium.subtitle"]}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-[12.5px]">
              <Icon name="check" size={14} style={{ color: "var(--color-success)", marginTop: 3, flexShrink: 0 }} />
              <span className="text-[var(--color-cream)]">{dict[benefit]}</span>
            </li>
          ))}
        </ul>
      </section>

      {adOption ? (
        <AdUnlockCard
          gameSlug={adOption.game.slug}
          gameTitle={adOption.game.title}
          minutes={adPolicy.rewardMinutes}
          remainingToday={adOption.remaining}
        />
      ) : null}

      {adPicker && adPicker.games.length ? (
        <section
          className="mt-6 rounded-2xl border border-[rgba(255,122,24,.3)] p-4"
          style={{ background: "rgba(23,30,48,.55)" }}
          aria-labelledby="ad-pick-title"
        >
          <h2 id="ad-pick-title" className="flex items-center gap-2 text-sm font-extrabold">
            <Icon name="play" size={14} style={{ color: "var(--color-orange)" }} />
            {dict["ads.pickTitle"]}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            {dict["ads.pickBody"].replace("{minutes}", String(adPolicy.rewardMinutes))}
            {" · "}
            {dict["ads.remaining"].replace("{count}", String(adPicker.remaining))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {adPicker.games.map((game) => (
              <Link
                key={game.id}
                href={`/play/${game.slug}`}
                className="rounded-xl border border-[rgba(161,170,189,.28)] px-3 py-2 text-[12px] font-bold text-[var(--color-cream)]"
                style={{ background: "rgba(9,11,20,.6)" }}
              >
                {game.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <h2 className="mb-2 text-base font-extrabold">{dict["premium.currentPlan"]}</h2>
      <PremiumPlans
        plans={localizedPlans}
        premium={premiumStatus.premium}
        expiresAt={premiumStatus.subscription?.expires_at ?? null}
        botConfigured={env.botConfigured}
        signedIn={Boolean(user)}
        reason={reason}
      />

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { title: dict["premium.step1"], icon: "crown" as const },
          { title: dict["premium.step2"], icon: "shield" as const },
          { title: dict["premium.step3"], icon: "sparkles" as const },
        ].map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
            <span className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[var(--color-muted)]">
              <span className="grid h-6 w-6 place-items-center rounded-full text-[10px]" style={{ background: "rgba(255,122,24,.2)", color: "var(--color-orange)" }}>
                {index + 1}
              </span>
              {dict["premium.howItWorks"]}
            </span>
            <p className="flex items-start gap-2 text-[13px]">
              <Icon name={step.icon} size={15} style={{ color: "var(--color-cyan)", marginTop: 2 }} />
              {step.title}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[rgba(161,170,189,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <h2 className="text-sm font-extrabold">{dict["premium.freeTier"]}</h2>
        <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">{dict["premium.freeTierBody"]}</p>
      </section>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--color-muted)]">{dict["premium.oneTime"]} · {dict["premium.verifyNote"]}</p>
    </div>
  );
}
