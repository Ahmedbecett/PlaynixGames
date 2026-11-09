import { all } from "@/lib/db";
import { adUnlockStats } from "@/lib/ads";
import { getDictionary, formatNumber } from "@/lib/i18n";
import { PlacementForm } from "@/components/admin/SimpleForms";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

export const dynamic = "force-dynamic";

type Placement = { id: string; key: string; label: string; enabled: number; image_url: string | null; target_url: string | null };
type Campaign = {
  id: string;
  name: string;
  status: string;
  budget_stars: number;
  spent_stars: number;
  impressions: number;
  clicks: number;
  starts_at: string | null;
  ends_at: string | null;
  game_title: string;
};

export default async function AdminAdsPage() {
  const { dict, locale } = await getDictionary();
  const [placements, campaigns, adStats] = await Promise.all([
    all<Placement>("SELECT * FROM ad_placements ORDER BY key"),
    all<Campaign>(
      `SELECT c.*, g.title AS game_title FROM ad_campaigns c JOIN games g ON g.id = c.game_id ORDER BY c.created_at DESC LIMIT 50`,
    ),
    adUnlockStats(),
  ]);

  return (
    <div className="fade-up space-y-5">
      <h1 className="text-lg font-extrabold">{dict["admin.ads.title"]}</h1>

      <section className="rounded-2xl border border-[rgba(255,122,24,.3)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">{dict["admin.ads.rewarded"]}</h2>
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold"
            style={{
              background: adStats.enabled ? "rgba(34,197,94,.16)" : "rgba(239,68,68,.16)",
              color: adStats.enabled ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {adStats.enabled ? "ON" : "OFF"}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">{dict["admin.ads.rewardedHint"]}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: dict["admin.ads.zone"], value: adStats.zoneId ? `#${adStats.zoneId}` : "—" },
            { label: dict["admin.ads.unlocks24h"], value: formatNumber(adStats.unlocks24h, locale) },
            { label: dict["admin.ads.users24h"], value: formatNumber(adStats.users24h, locale) },
            { label: dict["premium.perDays"], value: `${adStats.rewardMinutes} / ${adStats.dailyLimit}` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[rgba(161,170,189,.18)] p-2.5">
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-extrabold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--color-muted)]">{dict["admin.ads.placements"]}</h2>
        {placements.map((placement) => (
          <div key={placement.id} className="rounded-xl border border-[rgba(139,92,246,.18)] p-3" style={{ background: "rgba(23,30,48,.5)" }}>
            <div className="mb-2 flex items-center gap-2">
              <b className="text-[13px]">{placement.label}</b>
              <code className="text-[10px] text-[var(--color-muted)]">{placement.key}</code>
              <span className="chip ms-auto" style={{ color: placement.enabled ? "var(--color-success)" : "var(--color-muted)" }}>
                {placement.enabled ? dict["admin.ads.enabled"] : dict["admin.ads.disabled"]}
              </span>
            </div>
            <PlacementForm
              placementKey={placement.key}
              enabled={Number(placement.enabled) === 1}
              imageUrl={placement.image_url ?? ""}
              targetUrl={placement.target_url ?? ""}
            />
          </div>
        ))}
        <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
          Ads only render inside clearly labelled placements and never cover game controls. Keep at most one active placement per page.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--color-muted)]">{dict["admin.ads.campaigns"]}</h2>
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[rgba(161,170,189,.25)] p-4 text-center text-xs text-[var(--color-muted)]">
            {dict["admin.stat.noData"]}
          </p>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(139,92,246,.16)] p-2.5" style={{ background: "rgba(23,30,48,.5)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{campaign.name}</p>
                  <p className="text-[10.5px] text-[var(--color-muted)]">
                    {campaign.game_title} · {formatNumber(campaign.impressions, locale)} impressions · {formatNumber(campaign.clicks, locale)} clicks ·{" "}
                    {formatNumber(campaign.budget_stars, locale)} ⭐ budget
                  </p>
                </div>
                <span className="chip">{campaign.status}</span>
                {campaign.status !== "active" ? (
                  <AdminActionButton endpoint="/api/admin/ads/campaigns" label={dict["admin.ads.enabled"]} body={{ id: campaign.id, status: "active" }} variant="primary" />
                ) : (
                  <AdminActionButton endpoint="/api/admin/ads/campaigns" label={dict["admin.ads.disabled"]} body={{ id: campaign.id, status: "paused" }} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
