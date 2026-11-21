"use client";

import { useEffect } from "react";
import { usePracticeLocked } from "@/components/scenario/practice-workspace";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

/** Practice lifecycle pauses are explicit; PMDT presentation/link state is not a clock. */
export function Dvor1150aMonitorClock() {
  const locked = usePracticeLocked();
  useEffect(() => {
    if (locked) return;
    let previous = performance.now();
    const ticker = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) / 1000;
      previous = now;
      useVorPmdtStore.getState().advanceMonitorTime(elapsed);
    }, 100);
    return () => window.clearInterval(ticker);
  }, [locked]);
  return null;
}
