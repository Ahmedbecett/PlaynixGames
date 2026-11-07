"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "./LocaleProvider";
import { Icon } from "./Icons";

/** Only rendered when the server reports ALLOW_DEV_LOGIN=true (never in production). */
export function PreviewAuth() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/dev", { method: "POST" });
      if (!response.ok) throw new Error("failed");
      router.refresh();
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div
      className="mb-4 rounded-2xl p-4"
      style={{ background: "rgba(34,211,238,.07)", border: "1px solid rgba(34,211,238,.28)" }}
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-[var(--color-cyan)]">
        <Icon name="info" size={16} />
        {t("auth.previewTitle")}
      </div>
      <p className="mb-3 text-xs leading-relaxed text-[var(--color-muted)]">{t("auth.previewBody")}</p>
      <button className="btn btn-sm" onClick={signIn} disabled={loading}>
        {loading ? t("common.loading") : t("auth.previewCta")}
      </button>
      {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{t("common.error")}</p>}
    </div>
  );
}
