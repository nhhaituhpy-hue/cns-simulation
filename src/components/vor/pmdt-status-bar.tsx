"use client";

import { useEffect, useState } from "react";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function formatPmdtDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function PmdtStatusBar() {
  const alert = useVorPmdtStore((state) => state.data.alert);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const authenticatedUserId = useVorPmdtStore((state) => state.authenticatedUserId);
  const configuredTimestamp = useVorPmdtStore((state) => state.data.timestamp);
  const [timestamp, setTimestamp] = useState(configuredTimestamp);

  useEffect(() => {
    const updateTimestamp = () => setTimestamp(formatPmdtDateTime(new Date()));
    updateTimestamp();
    const timer = window.setInterval(updateTimestamp, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="pmdt-statusbar">
      <span className={`pmdt-statusbar-path ${alert ? "pmdt-status-alarm" : "pmdt-status-ok"}`}>
        {alert ? "Alert" : "Ready"}
      </span>
      <span className="pmdt-statusbar-segment">CAP</span>
      <span className="pmdt-statusbar-segment">NUM</span>
      <span className="pmdt-statusbar-segment">{securityLevel ? `Level ${securityLevel}` : ""}</span>
      <span className="pmdt-statusbar-segment">{authenticatedUserId ?? ""}</span>
      <time className="pmdt-statusbar-segment font-mono tabular-nums">{timestamp}</time>
    </footer>
  );
}
