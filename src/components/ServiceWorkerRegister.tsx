"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let updateTimer = 0;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;
        void registration.update();
        updateTimer = window.setInterval(() => {
          void registration.update();
        }, 10 * 60_000);
      } catch {
        // O PWA continua funcional online mesmo se o SW não puder registrar.
      }
    };

    void register();

    return () => {
      cancelled = true;
      if (updateTimer) window.clearInterval(updateTimer);
    };
  }, []);

  return null;
}
