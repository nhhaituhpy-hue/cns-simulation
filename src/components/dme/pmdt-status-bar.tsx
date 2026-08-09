"use client";

import { useEffect, useState } from "react";
import { formatDmeTimestamp, useDmePmdtStore } from "@/stores/dme-pmdt-store";

export function PmdtStatusBar() {
  const alert = useDmePmdtStore((state) => state.data.alert);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const authenticatedUserId = useDmePmdtStore((state) => state.authenticatedUserId);
  // Keep the server and first client render identical. The live value is
  // populated immediately after mount, then refreshed once per second.
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    setClock(new Date());
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="pmdt-statusbar">
      <span className={`pmdt-statusbar-path ${alert ? "pmdt-status-alarm" : "pmdt-status-ok"}`}>
        {alert ? "Alert" : "Ready"}
      </span>
      <span className="pmdt-statusbar-segment dme-pmdt-status-cap">CAP</span>
      <span className="pmdt-statusbar-segment dme-pmdt-status-num">NUM</span>
      <span className="pmdt-statusbar-segment dme-pmdt-status-level">{securityLevel ? `Level ${securityLevel}` : ""}</span>
      <span className="pmdt-statusbar-segment dme-pmdt-status-security">{authenticatedUserId ?? ""}</span>
      <span className="dme-pmdt-status-spacer" aria-hidden="true" />
      <time className="pmdt-statusbar-segment dme-pmdt-status-time font-mono tabular-nums">{clock ? formatDmeTimestamp(clock) : ""}</time>
    </footer>
  );
}
