"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

export type GameFormValues = {
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  coverUrl: string;
  developer: string;
  publisher: string;
  categoryId: string;
  gameUrl: string;
  gameType: "html5" | "external" | "native_apk";
  source: string;
  license: string;
  pricingType: "free" | "premium";
  publicationStatus: "draft" | "pending" | "approved" | "published" | "rejected" | "disabled";
  featured: boolean;
  releasedAt: string;
  supportedDevices: string;
  controls: string;
  languages: string;
  orientation: "any" | "portrait" | "landscape";
  screenshots: string[];
};

const empty: GameFormValues = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  coverUrl: "",
  developer: "",
  publisher: "",
  categoryId: "",
  gameUrl: "",
  gameType: "html5",
  source: "",
  license: "",
  pricingType: "free",
  publicationStatus: "draft",
  featured: false,
  releasedAt: "",
  supportedDevices: "Android, iOS, Telegram Desktop, Telegram Web",
  controls: "",
  languages: "en,ar,fr",
  orientation: "any",
  screenshots: [],
};

export function GameForm({
  initial,
  categories,
}: {
  initial?: Partial<GameFormValues> & { id?: string };
  categories: { id: string; name: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<GameFormValues>({ ...empty, ...initial });
  const [screenshotsText, setScreenshotsText] = useState((initial?.screenshots ?? []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<{ name: string; ok: boolean; detail: string }[] | null>(null);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof GameFormValues>(key: K, value: GameFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "upload failed");
      set("coverUrl", payload.url as string);
      show(t("common.saved"), "success");
    } catch (error) {
      show(error instanceof Error ? error.message : t("common.error"), "error");
    } finally {
      setUploading(false);
    }
  }

  async function verifyUrl() {
    if (values.id) {
      const response = await fetch(`/api/admin/games/${values.id}/verify`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      setChecks(payload?.checks ?? null);
      if (payload?.ok) show(t("admin.games.verified"), "success");
      else show(t("admin.games.verifyFailed", { reason: payload?.error?.message ?? "" }), "error");
      return;
    }
    // Unsaved game: dry-run through the create endpoint is destructive, so check locally instead.
    show(t("admin.form.urlHint"), "info");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setChecks(null);
    const payload = {
      ...values,
      categoryId: values.categoryId || "",
      screenshots: screenshotsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
    try {
      const response = await fetch(values.id ? `/api/admin/games/${values.id}` : "/api/admin/games", {
        method: values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.error?.code === "validation_error" && data.error.details?.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(data.error.details.fieldErrors as Record<string, string[]>).map(([key, list]) => [key, list[0]]),
            ),
          );
          show(t("admin.form.errors"), "error");
        } else if (data?.error?.code === "verification_failed") {
          setChecks(data.error.details as { name: string; ok: boolean; detail: string }[]);
          show(t("admin.form.errors"), "error");
        } else {
          show(data?.error?.message ?? t("common.error"), "error");
        }
        return;
      }
      show(values.id ? t("admin.form.updated") : t("admin.form.created"), "success");
      router.push("/admin/games");
      router.refresh();
    } catch {
      show(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="title">{t("admin.form.title")}</label>
          <input
            id="title"
            className={`input ${errors.title ? "input-error" : ""}`}
            value={values.title}
            onChange={(event) => {
              set("title", event.target.value);
              if (!values.id && (!values.slug || values.slug === slugify(values.title))) set("slug", slugify(event.target.value));
            }}
            required
            maxLength={120}
          />
          {errors.title && <span className="text-[11px] text-[var(--color-danger)]">{errors.title}</span>}
        </div>
        <div className="field">
          <label htmlFor="slug">{t("admin.form.slug")}</label>
          <input
            id="slug"
            className={`input ${errors.slug ? "input-error" : ""}`}
            value={values.slug}
            onChange={(event) => set("slug", slugify(event.target.value))}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
          {errors.slug && <span className="text-[11px] text-[var(--color-danger)]">{errors.slug}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="short">{t("admin.form.shortDescription")}</label>
        <input id="short" className="input" maxLength={200} value={values.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="description">{t("admin.form.description")}</label>
        <textarea id="description" className="textarea" rows={4} maxLength={8000} value={values.description} onChange={(event) => set("description", event.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="cover">{t("admin.form.cover")}</label>
          <input id="cover" className="input" value={values.coverUrl} onChange={(event) => set("coverUrl", event.target.value)} placeholder="/covers/game.jpg or https://…" />
          <div className="mt-1.5 flex items-center gap-2">
            <label className="btn btn-sm btn-ghost cursor-pointer">
              <Icon name="image" size={13} />
              {uploading ? t("common.loading") : "Upload"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
              />
            </label>
            {values.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.coverUrl} alt="" className="h-10 w-16 rounded-md object-cover" />
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor="screenshots">{t("admin.form.screenshots")}</label>
          <textarea id="screenshots" className="textarea" rows={3} value={screenshotsText} onChange={(event) => setScreenshotsText(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="developer">{t("admin.form.developer")}</label>
          <input id="developer" className="input" value={values.developer} onChange={(event) => set("developer", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="publisher">{t("admin.form.publisher")}</label>
          <input id="publisher" className="input" value={values.publisher} onChange={(event) => set("publisher", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="category">{t("admin.form.category")}</label>
          <select id="category" className="select" value={values.categoryId} onChange={(event) => set("categoryId", event.target.value)}>
            <option value="">—</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="gameUrl">{t("admin.form.gameUrl")}</label>
          <input id="gameUrl" className={`input ${errors.gameUrl ? "input-error" : ""}`} value={values.gameUrl} onChange={(event) => set("gameUrl", event.target.value)} placeholder="/games/slug/ or https://publisher.com/game" />
          <span className="text-[10px] text-[var(--color-muted)]">{t("admin.form.urlHint")}</span>
          {errors.gameUrl && <span className="text-[11px] text-[var(--color-danger)]">{errors.gameUrl}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="gameType">{t("admin.form.gameType")}</label>
            <select id="gameType" className="select" value={values.gameType} onChange={(event) => set("gameType", event.target.value as GameFormValues["gameType"])}>
              <option value="html5">HTML5</option>
              <option value="external">External</option>
              <option value="native_apk">Native APK</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pricing">{t("admin.form.pricing")}</label>
            <select id="pricing" className="select" value={values.pricingType} onChange={(event) => set("pricingType", event.target.value as GameFormValues["pricingType"])}>
              <option value="free">{t("common.free")}</option>
              <option value="premium">{t("common.premium")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="license">{t("admin.form.license")}</label>
          <input id="license" className="input" value={values.license} onChange={(event) => set("license", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="source">{t("admin.form.source")}</label>
          <input id="source" className="input" value={values.source} onChange={(event) => set("source", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="devices">{t("admin.form.devices")}</label>
          <input id="devices" className="input" value={values.supportedDevices} onChange={(event) => set("supportedDevices", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="controls">{t("admin.form.controls")}</label>
          <input id="controls" className="input" value={values.controls} onChange={(event) => set("controls", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="languages">{t("admin.form.languages")}</label>
          <input id="languages" className="input" value={values.languages} onChange={(event) => set("languages", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="orientation">{t("admin.form.orientation")}</label>
          <select id="orientation" className="select" value={values.orientation} onChange={(event) => set("orientation", event.target.value as GameFormValues["orientation"])}>
            <option value="any">{t("game.orientation.any")}</option>
            <option value="portrait">{t("game.orientation.portrait")}</option>
            <option value="landscape">{t("game.orientation.landscape")}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="released">{t("admin.form.releasedAt")}</label>
          <input id="released" type="date" className="input" value={values.releasedAt} onChange={(event) => set("releasedAt", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="status">{t("admin.form.status")}</label>
          <select id="status" className="select" value={values.publicationStatus} onChange={(event) => set("publicationStatus", event.target.value as GameFormValues["publicationStatus"])}>
            {["draft", "pending", "approved", "published", "rejected", "disabled"].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.featured} onChange={(event) => set("featured", event.target.checked)} className="accent-[var(--color-orange)]" />
        {t("admin.form.featured")}
      </label>

      {checks && (
        <ul className="space-y-1 rounded-xl border border-[rgba(139,92,246,.25)] p-3 text-[11.5px]">
          {checks.map((check) => (
            <li key={check.name} className="flex items-start gap-2">
              <Icon name={check.ok ? "check" : "x"} size={13} style={{ color: check.ok ? "var(--color-success)" : "var(--color-danger)", marginTop: 2 }} />
              <span>
                <b>{check.name}</b> — {check.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={busy}>
          {busy ? t("admin.form.saving") : t("admin.form.save")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={verifyUrl}>
          <Icon name="shield" size={14} />
          {t("admin.games.verify")}
        </button>
        {values.id && values.gameType === "html5" && values.gameUrl && (
          <a className="btn btn-ghost" href={`/play/${values.slug}`} target="_blank" rel="noreferrer">
            <Icon name="play" size={14} filled />
            {t("admin.games.test")}
          </a>
        )}
      </div>
    </form>
  );
}
