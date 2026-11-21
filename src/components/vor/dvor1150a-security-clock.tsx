"use client";

import { useEffect } from "react";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function Dvor1150aSecurityClock() {
  useEffect(() => {
    let previous = performance.now();
    const tick = () => {
      const current = performance.now();
      useVorPmdtStore.getState().advanceSecurityTime((current - previous) / 1000);
      previous = current;
    };
    const activity = () => { tick(); useVorPmdtStore.getState().noteSecurityActivity(); };
    const timer = window.setInterval(tick, 1000);
    const events = ["pointermove", "pointerdown", "keydown"] as const;
    for (const event of events) document.addEventListener(event, activity, true);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      for (const event of events) document.removeEventListener(event, activity, true);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return null;
}
