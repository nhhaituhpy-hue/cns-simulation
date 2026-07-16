"use client";

import { Clock, WifiHigh } from "@phosphor-icons/react";
import type { VorPmdtMode } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

const modeLabels: Record<VorPmdtMode, string> = {
  preview: "Preview",
  author: "Authoring",
  student: "Student session",
};

export function PmdtStatusBar() {
  const mode = useVorPmdtStore((state) => state.mode);
  const connected = useVorPmdtStore((state) => state.data.connected);
  const timestamp = useVorPmdtStore((state) => state.data.timestamp);
  const activeMenuPath = useVorPmdtStore((state) => state.activeMenuPath);

  return (
    <footer className="flex h-7 items-center gap-3 border-t border-[#334155] bg-[#0f172a] px-3 text-[10px] text-[#94a3b8]">
      <span className="min-w-0 flex-1 truncate text-[#cbd5e1]">
        {activeMenuPath.join(" > ")}
      </span>
      <span className="border-l border-[#334155] pl-3">{modeLabels[mode]}</span>
      <span className="inline-flex items-center gap-1 border-l border-[#334155] pl-3">
        <WifiHigh aria-hidden size={12} className={connected ? "text-[#22c55e]" : "text-[#ef4444]"} />
        {connected ? "RMS connected" : "Disconnected"}
      </span>
      <time className="inline-flex items-center gap-1 border-l border-[#334155] pl-3 font-mono tabular-nums text-[#cbd5e1]">
        <Clock aria-hidden size={12} />
        {timestamp}
      </time>
    </footer>
  );
}
