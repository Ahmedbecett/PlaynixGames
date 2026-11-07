"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Variant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: Variant };

const ToastContext = createContext<{ show: (message: string, variant?: Variant) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, variant: Variant = "info") => {
    counter.current += 1;
    const id = counter.current;
    setItems((current) => [...current.slice(-2), { id, message, variant }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(88px + var(--safe-bottom))" }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="fade-up pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm font-semibold shadow-2xl"
            style={{
              background:
                item.variant === "error"
                  ? "rgba(239,68,68,.16)"
                  : item.variant === "success"
                    ? "rgba(34,197,94,.16)"
                    : "rgba(23,30,48,.94)",
              border: `1px solid ${
                item.variant === "error"
                  ? "rgba(239,68,68,.55)"
                  : item.variant === "success"
                    ? "rgba(34,197,94,.5)"
                    : "rgba(139,92,246,.4)"
              }`,
              color: "#F8FAFC",
              backdropFilter: "blur(14px)",
            }}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
