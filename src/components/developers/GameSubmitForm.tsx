"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

type Category = { id: string; name: string };

/**
 * Submission form for a developer's game.
 *
 * The cover is uploaded through the shared image endpoint, which re-encodes it
 * server-side. The build itself is either a same-origin path (a folder the
 * developer ships in the repo) or an https URL.
 */
export function GameSubmitForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    categoryId: categories[0]?.id ?? "",
    gameUrl: "",
    controls: "",
    orientation: "any" as "any" | "portrait" | "landscape",
  });
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /** Slug suggestion from the title, so a developer does not have to think about it. */
  function suggestSlug(title: string) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    setForm((current) => ({ ...current, title, slug: current.slug || slug }));
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/image?prefix=games", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error?.message ?? "Upload failed.");
        return;
      }
      setCoverUrl(payload.url);
      show("Cover uploaded", "success");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/developers/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, coverUrl, screenshots: [] }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not submit the game.");
        return;
      }
      show("Submitted for review", "success");
      router.push("/developers");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Game title *</span>
        <input
          className="input"
          value={form.title}
          onChange={(event) => suggestSlug(event.target.value)}
          placeholder="Neon Racer"
          required
          minLength={2}
          maxLength={120}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">URL slug *</span>
        <input
          className="input"
          value={form.slug}
          onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="neon-racer"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxLength={60}
        />
        <span className="mt-1 block text-[11px] text-[var(--color-muted)]">
          Playnix players will find the game at /game/{form.slug || "your-slug"}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Short description</span>
        <input
          className="input"
          value={form.shortDescription}
          onChange={(event) => update("shortDescription", event.target.value)}
          placeholder="One line that makes people tap Play."
          maxLength={200}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Full description</span>
        <textarea
          className="textarea"
          rows={4}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="How it plays, what makes it different, controls."
          maxLength={8000}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Category *</span>
          <select className="select" value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Orientation</span>
          <select
            className="select"
            value={form.orientation}
            onChange={(event) => update("orientation", event.target.value as typeof form.orientation)}
          >
            <option value="any">Any</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Game URL *</span>
        <input
          className="input"
          value={form.gameUrl}
          onChange={(event) => update("gameUrl", event.target.value)}
          placeholder="/games/neon-racer/index.html or https://cdn.example.com/game/"
          required
          maxLength={2048}
        />
        <span className="mt-1 block text-[11px] text-[var(--color-muted)]">
          An https build is fetched once by our reviewer to check that it loads and is not malicious.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Controls</span>
        <input className="input" value={form.controls} onChange={(event) => update("controls", event.target.value)} placeholder="Tap / swipe / arrow keys" maxLength={400} />
      </label>

      <div>
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Cover image</span>
        <div className="flex items-center gap-3">
          <label className="btn btn-sm btn-outline cursor-pointer">
            <Icon name="image" size={14} />
            {uploading ? "Uploading…" : "Choose image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadCover(file);
              }}
            />
          </label>
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="Cover preview" className="h-12 w-16 rounded-lg object-cover" />
          )}
        </div>
      </div>

      {error && <p className="rounded-lg p-2.5 text-[12px] font-semibold text-[#F87171]" style={{ background: "rgba(248,113,113,.1)" }}>{error}</p>}

      <div className="flex gap-2">
        <button className="btn flex-1" disabled={busy || uploading}>
          <Icon name="check" size={15} />
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
        Your game enters the review queue. A moderator plays it to confirm it loads, has no malware or tracking, and
        matches its description. You will be notified with the decision.
      </p>
    </form>
  );
}
