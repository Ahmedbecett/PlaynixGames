"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "./LocaleProvider";
import { useToast } from "./Toast";
import { Icon } from "./Icons";

export function ProfileSettings({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const { show } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      const response = await fetch("/api/users/me", { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      show(t("profile.deleted"), "success");
      setConfirming(false);
      router.push("/");
      router.refresh();
    } catch {
      show(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) return null;

  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--color-muted)]">{t("profile.settings")}</h2>
      <div className="space-y-2">
        <button className="btn btn-ghost w-full justify-start" onClick={signOut} disabled={busy}>
          <Icon name="logout" size={16} />
          {t("profile.signOut")}
        </button>

        {!confirming ? (
          <button
            className="btn btn-ghost w-full justify-start"
            style={{ borderColor: "rgba(239,68,68,.4)", color: "#fca5a5" }}
            onClick={() => setConfirming(true)}
          >
            <Icon name="trash" size={16} />
            {t("profile.deleteAccount")}
          </button>
        ) : (
          <div className="rounded-xl border border-[rgba(239,68,68,.4)] p-3.5" style={{ background: "rgba(239,68,68,.08)" }}>
            <p className="mb-3 text-[12px] leading-relaxed text-[var(--color-muted)]">{t("profile.deleteWarning")}</p>
            <div className="flex gap-2">
              <button
                className="btn btn-sm"
                style={{ background: "linear-gradient(135deg,#EF4444,#f87171)", color: "#0b0f18" }}
                onClick={deleteAccount}
                disabled={busy}
              >
                {t("profile.deleteConfirm")}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
