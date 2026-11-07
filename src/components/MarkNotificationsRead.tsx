"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Marks visible notifications as read once, then refreshes the badge count. */
export function MarkNotificationsRead() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((response) => {
        if (response.ok) setTimeout(() => router.refresh(), 400);
      })
      .catch(() => undefined);
  }, [router]);

  return null;
}
