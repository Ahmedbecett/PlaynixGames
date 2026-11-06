import { getDashboardStats } from "@/lib/admin";
import { configStatus, env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";
import { WebhookButton } from "@/components/admin/SimpleForms";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const { dict } = await getDictionary();
  const [stats, config] = [await getDashboardStats(), configStatus()];

  return (
    <div className="fade-up space-y-4">
      <h1 className="text-lg font-extrabold">{dict["admin.system.title"]}</h1>

      <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
        <h2 className="mb-2 text-sm font-extrabold">{dict["admin.bot.title"]}</h2>
        <ul className="space-y-1.5 text-[12px]">
          <li className="flex justify-between gap-2">
            <span className="text-[var(--color-muted)]">Webhook URL</span>
            <code className="truncate">{env.appUrl}/api/telegram/webhook</code>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-[var(--color-muted)]">Bot API</span>
            <span style={{ color: env.botConfigured ? "var(--color-success)" : "var(--color-danger)" }}>
              {env.botConfigured ? "configured" : "missing token"}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-[var(--color-muted)]">Mini App URL</span>
            <code className="truncate">{env.appUrl}</code>
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <WebhookButton />
          <a href="/api/admin/bot" className="btn btn-sm btn-ghost" target="_blank" rel="noreferrer">
            {dict["admin.bot.info"]}
          </a>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
          Register the webhook after deploying to your production domain. In BotFather set the Mini App URL to{" "}
          <code>{env.appUrl}</code> and enable the menu button.
        </p>
      </section>

      <section className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.55)" }}>
        <h2 className="mb-2 text-sm font-extrabold">{dict["admin.stat.health"]}</h2>
        <ul className="space-y-1.5 text-[12px]">
          <li className="flex items-center justify-between">
            <span className="text-[var(--color-muted)]">Database</span>
            <span className="flex items-center gap-1 font-bold" style={{ color: stats.health.ok ? "var(--color-success)" : "var(--color-danger)" }}>
              <Icon name={stats.health.ok ? "check" : "x"} size={13} /> {stats.health.dialect}
            </span>
          </li>
          {config.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-muted)]">{item.key}</span>
              <span className="font-bold" style={{ color: item.ok ? "var(--color-success)" : "var(--color-orange)" }}>
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[rgba(255,122,24,.25)] p-4" style={{ background: "rgba(255,122,24,.06)" }}>
        <h2 className="mb-1 text-sm font-extrabold">Backups</h2>
        <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">
          PostgreSQL: schedule <code>pg_dump --format=custom</code> every 6 hours to object storage and test restores quarterly.
          SQLite (local dev): copy <code>data/playnix.db</code>. See <code>docs/DEPLOYMENT.md</code> for the recovery runbook.
        </p>
      </section>
    </div>
  );
}
