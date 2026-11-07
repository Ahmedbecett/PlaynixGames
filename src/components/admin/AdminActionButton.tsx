"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";

export function AdminActionButton({
  endpoint,
  method = "PATCH",
  body,
  label,
  confirmText,
  variant = "ghost",
  onDone,
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  label: string;
  confirmText?: string;
  variant?: "ghost" | "primary" | "danger" | "outline";
  onDone?: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? t("common.error"));
      }
      show(t("common.saved"), "success");
      onDone?.();
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  const className =
    variant === "primary" ? "btn btn-sm" : variant === "danger" ? "btn btn-sm btn-ghost" : "btn btn-sm btn-ghost";

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={className}
      style={variant === "danger" ? { borderColor: "rgba(239,68,68,.45)", color: "#fca5a5" } : undefined}
    >
      {busy ? "…" : label}
    </button>
  );
}
