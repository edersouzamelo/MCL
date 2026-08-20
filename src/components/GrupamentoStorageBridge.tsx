"use client";

import { useEffect } from "react";
import { GROUP_STORAGE_KEYS } from "@/modules/grupamento/monitor";

export function GrupamentoStorageBridge() {
  useEffect(() => {
    let lastSag = window.localStorage.getItem(GROUP_STORAGE_KEYS.sag);
    let lastRpn = window.localStorage.getItem(GROUP_STORAGE_KEYS.rpn);
    let lastRules = window.localStorage.getItem(GROUP_STORAGE_KEYS.rules);

    const timer = window.setInterval(() => {
      const sag = window.localStorage.getItem(GROUP_STORAGE_KEYS.sag);
      const rpn = window.localStorage.getItem(GROUP_STORAGE_KEYS.rpn);
      const rules = window.localStorage.getItem(GROUP_STORAGE_KEYS.rules);

      if (sag !== lastSag) {
        lastSag = sag;
        window.dispatchEvent(new CustomEvent("mcl-grupamento-sag-updated"));
      }
      if (rpn !== lastRpn) {
        lastRpn = rpn;
        window.dispatchEvent(new CustomEvent("mcl-grupamento-rpn-updated"));
      }
      if (rules !== lastRules) {
        lastRules = rules;
        window.dispatchEvent(new CustomEvent("mcl-grupamento-rules-updated"));
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
