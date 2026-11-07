"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";

function useSubmit(endpoint: string, method: "POST" | "PUT" = "POST") {
  const router = useRouter();
  const { show } = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? t("common.error"));
      show(t("common.saved"), "success");
      router.refresh();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      setError(message);
      show(message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { submit, busy, error };
}

export function CategoryForm() {
  const t = useT();
  const { submit, busy, error } = useSubmit("/api/admin/categories");
  const [values, setValues] = useState({ name: "", nameAr: "", nameFr: "", slug: "", icon: "🎮", description: "", sortOrder: 99 });

  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await submit(values);
        setValues({ name: "", nameAr: "", nameFr: "", slug: "", icon: "🎮", description: "", sortOrder: 99 });
      }}
    >
      <input className="input" placeholder={`${t("admin.form.title")} (EN)`} required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      <input className="input" placeholder="العربية" value={values.nameAr} onChange={(e) => setValues({ ...values, nameAr: e.target.value })} />
      <input className="input" placeholder="Français" value={values.nameFr} onChange={(e) => setValues({ ...values, nameFr: e.target.value })} />
      <input className="input" placeholder={t("admin.form.slug")} required value={values.slug} onChange={(e) => setValues({ ...values, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
      <input className="input" placeholder="🎮" maxLength={4} value={values.icon} onChange={(e) => setValues({ ...values, icon: e.target.value })} />
      <button className="btn" disabled={busy}>
        {busy ? t("common.sending") : t("admin.categories.new")}
      </button>
      {error && <p className="text-[11px] text-[var(--color-danger)] sm:col-span-2">{error}</p>}
    </form>
  );
}

export function AnnouncementForm() {
  const t = useT();
  const { submit, busy, error } = useSubmit("/api/admin/announcements");
  const [values, setValues] = useState({ title: "", body: "", url: "", broadcast: false });

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await submit(values);
        setValues({ title: "", body: "", url: "", broadcast: false });
      }}
    >
      <input className="input" placeholder={t("admin.form.title")} required value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
      <textarea className="textarea" rows={3} placeholder={t("admin.form.description")} value={values.body} onChange={(e) => setValues({ ...values, body: e.target.value })} />
      <input className="input" placeholder="/premium (optional)" value={values.url} onChange={(e) => setValues({ ...values, url: e.target.value })} />
      <label className="flex items-center gap-2 text-[12.5px]">
        <input type="checkbox" checked={values.broadcast} onChange={(e) => setValues({ ...values, broadcast: e.target.checked })} className="accent-[var(--color-orange)]" />
        {t("admin.announcements.sendBot")}
      </label>
      <button className="btn" disabled={busy}>
        {busy ? t("common.sending") : t("admin.announcements.send")}
      </button>
      {error && <p className="text-[11px] text-[var(--color-danger)]">{error}</p>}
    </form>
  );
}

export function PlanForm() {
  const t = useT();
  const { submit, busy, error } = useSubmit("/api/admin/plans");
  const [values, setValues] = useState({ name: "", nameAr: "", nameFr: "", price: 250, durationDays: 30, description: "", features: "" });

  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await submit({
          ...values,
          features: values.features.split("\n").map((line) => line.trim()).filter(Boolean),
        });
        setValues({ ...values, name: "", price: 250, durationDays: 30 });
      }}
    >
      <input className="input" placeholder={t("admin.form.title")} required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      <input className="input" type="number" min={1} required value={values.price} onChange={(e) => setValues({ ...values, price: Number(e.target.value) })} placeholder="Stars" />
      <input className="input" type="number" min={1} required value={values.durationDays} onChange={(e) => setValues({ ...values, durationDays: Number(e.target.value) })} placeholder="Days" />
      <input className="input" placeholder="وصف / description" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      <textarea className="textarea sm:col-span-2" rows={3} placeholder="premium.benefit.library" value={values.features} onChange={(e) => setValues({ ...values, features: e.target.value })} />
      <button className="btn sm:col-span-2" disabled={busy}>
        {busy ? t("common.sending") : t("common.save")}
      </button>
      {error && <p className="text-[11px] text-[var(--color-danger)] sm:col-span-2">{error}</p>}
    </form>
  );
}

export function PlacementForm({
  placementKey,
  enabled,
  imageUrl,
  targetUrl,
}: {
  placementKey: string;
  enabled: boolean;
  imageUrl: string;
  targetUrl: string;
}) {
  const t = useT();
  const { submit, busy } = useSubmit("/api/admin/ads", "PUT");
  const [values, setValues] = useState({ enabled, imageUrl, targetUrl });

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await submit({ key: placementKey, ...values });
      }}
    >
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" checked={values.enabled} onChange={(e) => setValues({ ...values, enabled: e.target.checked })} className="accent-[var(--color-orange)]" />
        {values.enabled ? t("admin.ads.enabled") : t("admin.ads.disabled")}
      </label>
      <input className="input h-9 max-w-[220px]" placeholder="Image URL" value={values.imageUrl} onChange={(e) => setValues({ ...values, imageUrl: e.target.value })} />
      <input className="input h-9 max-w-[220px]" placeholder="Target URL" value={values.targetUrl} onChange={(e) => setValues({ ...values, targetUrl: e.target.value })} />
      <button className="btn btn-sm" disabled={busy}>
        {t("common.save")}
      </button>
    </form>
  );
}

export function WebhookButton() {
  const t = useT();
  const { submit, busy } = useSubmit("/api/admin/bot", "POST");
  return (
    <button className="btn btn-sm" onClick={() => void submit({ action: "set_webhook" })} disabled={busy}>
      {busy ? t("common.loading") : t("admin.bot.webhook")}
    </button>
  );
}
