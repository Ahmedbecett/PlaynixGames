"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./LocaleProvider";
import { useTelegram } from "./TelegramBridge";
import { Icon } from "./Icons";

export function GamePlayer({
  gameId,
  slug,
  title,
  gameUrl,
  orientation,
}: {
  gameId: string;
  slug: string;
  title: string;
  gameUrl: string;
  orientation: string;
}) {
  const t = useT();
  const router = useRouter();
  const { haptic } = useTelegram();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sessionRef = useRef<{ id: string; startedAt: number } | null>(null);
  const endedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rotated, setRotated] = useState(false);

  // Start a tracked play session (server-authoritative).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${gameId}/play`, { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        const payload = (await response.json()) as { sessionId: string };
        if (!cancelled) sessionRef.current = { id: payload.sessionId, startedAt: Date.now() };
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // End the session on exit / background.
  useEffect(() => {
    const end = () => {
      const session = sessionRef.current;
      if (!session || endedRef.current) return;
      endedRef.current = true;
      const body = JSON.stringify({ durationMs: Date.now() - session.startedAt });
      try {
        fetch(`/api/play-sessions/${session.id}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      } catch {
        /* best effort */
      }
    };
    window.addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        iframeRef.current?.contentWindow?.postMessage({ type: "playnix:pause" }, "*");
      }
    });
    return () => {
      window.removeEventListener("pagehide", end);
      end();
    };
  }, []);

  // Telegram back button returns to the details page.
  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    const handler = () => router.push(`/game/${slug}`);
    if (backButton) {
      backButton.onClick(handler);
      backButton.show();
    }
    return () => {
      if (backButton) {
        backButton.offClick(handler);
        backButton.hide();
      }
    };
  }, [router, slug]);

  // Fallback if the frame never loads (blocked host, offline, timeout).
  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "error" : current));
    }, 15_000);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  useEffect(() => {
    const check = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setRotated(orientation === "landscape" && portrait);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [orientation]);

  function toggleFullscreen() {
    haptic("light");
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  }

  function togglePause() {
    const next = !paused;
    setPaused(next);
    iframeRef.current?.contentWindow?.postMessage({ type: next ? "playnix:pause" : "playnix:resume" }, "*");
    haptic("light");
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#05070d" }}>
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{
          paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))",
          background: "rgba(9,11,20,.9)",
          borderBottom: "1px solid rgba(139,92,246,.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/game/${slug}`)}
          className="icon-btn"
          aria-label={t("player.exit")}
          title={t("player.exit")}
        >
          <Icon name="arrowLeft" size={18} className="flip-x" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold">{title}</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Playnix</p>
        </div>
        <button type="button" className="icon-btn" onClick={togglePause} aria-label={paused ? t("player.resume") : t("player.pause")}>
          <Icon name={paused ? "play" : "pause"} size={17} filled={paused} />
        </button>
        <button type="button" className="icon-btn" onClick={toggleFullscreen} aria-label={t("player.fullscreen")}>
          <Icon name="fullscreen" size={17} />
        </button>
      </div>

      <div className="relative flex-1">
        <iframe
          key={attempt}
          ref={iframeRef}
          src={gameUrl}
          title={title}
          className="h-full w-full border-0"
          allow="fullscreen; autoplay; gamepad; focus-without-user-activation"
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-orientation-lock allow-popups-by-user-activation"
          onLoad={() => {
            setStatus("ready");
            if (sessionRef.current === null) {
              // Session API may have been slower than the frame; retry once.
              fetch(`/api/games/${gameId}/play`, { method: "POST" })
                .then(async (response) => {
                  if (!response.ok) return;
                  const payload = (await response.json()) as { sessionId: string };
                  sessionRef.current = { id: payload.sessionId, startedAt: Date.now() };
                })
                .catch(() => undefined);
            }
          }}
          onError={() => setStatus("error")}
        />

        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(5,7,13,.96)" }}>
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "#FF7A18", borderRightColor: "#8B5CF6" }} />
              <p className="text-sm font-bold">{t("player.loading")}</p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">{t("player.starting")}</p>
              <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "linear-gradient(90deg,#FF7A18,#22D3EE)" }} />
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center p-6" style={{ background: "rgba(5,7,13,.97)" }}>
            <div className="max-w-sm text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: "rgba(239,68,68,.15)" }}>
                <Icon name="info" size={22} style={{ color: "var(--color-danger)" }} />
              </span>
              <h2 className="text-base font-extrabold">{t("player.errorTitle")}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{t("player.errorBody")}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setStatus("loading");
                    setAttempt((current) => current + 1);
                  }}
                >
                  {t("player.retry")}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/game/${slug}`)}>
                  {t("player.backToDetails")}
                </button>
              </div>
            </div>
          </div>
        )}

        {paused && status === "ready" && (
          <button
            type="button"
            className="absolute inset-0 grid place-items-center"
            style={{ background: "rgba(5,7,13,.72)", backdropFilter: "blur(4px)" }}
            onClick={togglePause}
          >
            <span className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold" style={{ background: "rgba(23,30,48,.92)", border: "1px solid rgba(255,122,24,.5)" }}>
              <Icon name="play" size={18} filled />
              {t("player.resume")}
            </span>
          </button>
        )}

        {rotated && status === "ready" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <span className="flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold" style={{ background: "rgba(23,30,48,.92)", border: "1px solid rgba(34,211,238,.35)" }}>
              <Icon name="rotate" size={13} />
              {t("player.rotate")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
