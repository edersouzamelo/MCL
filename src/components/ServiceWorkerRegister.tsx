"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    const cleanupLegacyOfflineState = async () => {
      const registrations = "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistrations()
        : [];
      const cacheNames = "caches" in window ? await caches.keys() : [];

      const registrationResults = await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

      const removedLegacyState =
        registrationResults.some(Boolean) || cacheNames.length > 0;
      const reloadKey = "mcl-legacy-offline-state-cleared-v2";

      if (removedLegacyState && sessionStorage.getItem(reloadKey) !== "1") {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      }
    };

    void cleanupLegacyOfflineState();
  }, []);

  return null;
}
