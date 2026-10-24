"use client";

import { useEffect } from "react";
import { usePracticeLocked } from "@/components/scenario/practice-workspace";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

/** Mount beneath PracticeWorkspace so inert/submitted attempts cannot tick. */
export function Dvor1150aMonitorClock() {
  const locked = usePracticeLocked();
  useEffect(() => {
    if (locked) return;
    const ticker = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const state = useVorPmdtStore.getState();
      if (!state.loginDialogOpen && state.config.simulation.connected) state.advanceMonitorTime(0.1);
    }, 100);
    return () => window.clearInterval(ticker);
  }, [locked]);
  return null;
}
