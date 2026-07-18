"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useMemo, useState } from "react";
import type { SiteState } from "@/lib/types";

type SiteStatisticsWindowProps = {
  site: SiteState;
  onClose: () => void;
};

type StatisticsTab = "coverage" | "load" | "update" | "sam";
const TABS: Array<{ id: StatisticsTab; label: string }> = [
  { id: "coverage", label: "Coverage" },
  { id: "load", label: "Load" },
  { id: "update", label: "Update Rate" },
  { id: "sam", label: "SAM" },
];
const ALTITUDE_BANDS = ["0-10,000 ft", "10,000-25,000 ft", "25,000-60,000 ft"];

function profileMessageCount(site: SiteState): number {
  return [site.sensorA, site.sensorB].reduce((total, sensor) => {
    const stats = sensor?.dataProfile?.receiverStats;
    return total + (stats?.shortSquitter.total ?? 0) + (stats?.extendedSquitter.total ?? 0);
  }, 0);
}

function tableData(tab: StatisticsTab, messageCount: number) {
  const scaled = Math.max(messageCount, 125_000);
  if (tab === "coverage") {
    return {
      headings: ["Range (NM)", "Detected targets", "Availability"],
      rows: [
        ["0-50", Math.round(scaled / 18).toLocaleString("en-US"), "99.8%"],
        ["50-100", Math.round(scaled / 29).toLocaleString("en-US"), "99.2%"],
        ["100-150", Math.round(scaled / 47).toLocaleString("en-US"), "97.6%"],
        ["150-200", Math.round(scaled / 86).toLocaleString("en-US"), "92.4%"],
      ],
    };
  }
  if (tab === "load") {
    return {
      headings: ["Sector", "Message count", "Load"],
      rows: ["North", "East", "South", "West"].map((sector, index) => [
        sector,
        Math.round(scaled / (4 + index)).toLocaleString("en-US"),
        (42 + index * 9) + "%",
      ]),
    };
  }
  if (tab === "update") {
    return {
      headings: ["Sector", "Average update", "Peak update"],
      rows: ["North", "East", "South", "West"].map((sector, index) => [
        sector,
        (0.94 + index * 0.03).toFixed(2) + " s",
        (1.18 + index * 0.04).toFixed(2) + " s",
      ]),
    };
  }
  return {
    headings: ["Sector", "Average amplitude", "Peak amplitude"],
    rows: ["North", "East", "South", "West"].map((sector, index) => [
      sector,
      (-52 - index * 2) + " dBm",
      (-38 - index) + " dBm",
    ]),
  };
}

export function SiteStatisticsWindow({
  site,
  onClose,
}: SiteStatisticsWindowProps) {
  const [activeTab, setActiveTab] = useState<StatisticsTab>("coverage");
  const [altitudeBand, setAltitudeBand] = useState(ALTITUDE_BANDS[0]);
  const [lastReset, setLastReset] = useState("2026-01-15 09:00:00");
  const [confirmReset, setConfirmReset] = useState(false);
  const messageCount = profileMessageCount(site);
  const data = useMemo(
    () => tableData(activeTab, messageCount),
    [activeTab, messageCount],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmReset) setConfirmReset(false);
        else onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmReset, onClose]);

  function resetStatistics() {
    setLastReset(new Date().toLocaleString("sv-SE"));
    setConfirmReset(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/50 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="site-statistics-title" className="w-full max-w-4xl overflow-hidden rounded-lg border border-[#40566b] bg-white shadow-[0_20px_60px_rgb(15_23_42/0.35)]">
        <header className="flex items-center justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <div>
            <h2 id="site-statistics-title" className="text-lg font-bold">Site Statistics</h2>
            <p className="text-xs text-[#cbd5e1]">{site.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Site Statistics" className="inline-flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="border-b border-[#b8c4ce] bg-[#edf2f5] px-3 pt-3">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Statistics type">
            {TABS.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={"min-h-10 shrink-0 rounded-t border border-b-0 px-4 text-xs font-bold " + (activeTab === tab.id ? "border-[#94a3b8] bg-white text-[#172033]" : "border-transparent text-[#64748b] hover:bg-white/60")}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="text-xs font-bold uppercase tracking-wide text-[#475569]">
              Altitude band
              <select value={altitudeBand} onChange={(event) => setAltitudeBand(event.target.value)} className="mt-1 block min-h-10 rounded border border-[#94a3b8] bg-white px-3 font-mono text-sm font-normal text-[#172033]">
                {ALTITUDE_BANDS.map((band) => <option key={band}>{band}</option>)}
              </select>
            </label>
            <div className="text-right">
              <p className="font-mono text-xs text-[#64748b]">Last Reset: {lastReset}</p>
              <button type="button" onClick={() => setConfirmReset(true)} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded border border-[#94a3b8] bg-white px-3 text-xs font-bold text-[#334155] hover:bg-[#f8fafc]">
                <ArrowCounterClockwise aria-hidden size={15} /> RESET
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded border border-[#b8c4ce]">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="bg-[#dce5eb] text-xs uppercase tracking-wide text-[#475569]">
                <tr>{data.headings.map((heading) => <th key={heading} className="border-b border-[#94a3b8] px-4 py-2.5">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row[0]} className="odd:bg-white even:bg-[#f8fafc]">
                    {row.map((cell, index) => <td key={index} className="border-b border-[#e2e8f0] px-4 py-2.5 font-mono text-[#334155]">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="mt-4 flex justify-end border-t border-[#b8c4ce] pt-4">
            <button type="button" onClick={onClose} className="min-h-10 rounded bg-[#2563eb] px-5 text-sm font-bold text-white">CLOSE</button>
          </footer>
        </div>
      </section>

      {confirmReset ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#172033]/35 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="reset-statistics-title" className="w-full max-w-sm rounded-lg border border-[#94a3b8] bg-white p-5 shadow-xl">
            <h3 id="reset-statistics-title" className="text-base font-bold text-[#172033]">Reset statistics?</h3>
            <p className="mt-2 text-sm text-[#64748b]">The simulated statistics timestamp will be reset.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className="min-h-10 rounded border border-[#94a3b8] px-4 text-sm font-bold">CANCEL</button>
              <button type="button" onClick={resetStatistics} className="min-h-10 rounded bg-[#2563eb] px-4 text-sm font-bold text-white">RESET</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
