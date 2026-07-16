"use client";

import { useEffect, useState } from "react";

export type QcmsPanel = "sites" | "log" | "replay" | "general";

type QcmsToolbarProps = {
  activePanel: QcmsPanel;
  onSelect: (panel: QcmsPanel) => void;
  onExit: () => void;
};

const toolbarItems = [
  {
    label: "MAPS",
    disabled: true,
    tooltip: "Không khả dụng trong chế độ mô phỏng",
    grid: "col-start-1 row-start-1",
  },
  {
    label: "SITES",
    panel: "sites" as const,
    grid: "col-start-2 row-start-1",
  },
  {
    label: "MET",
    disabled: true,
    tooltip: "Không khả dụng trong chế độ mô phỏng",
    grid: "col-start-3 row-start-1",
  },
  {
    label: "REPLAY",
    panel: "replay" as const,
    grid: "col-start-1 row-start-2",
  },
  {
    label: "EXPORT",
    disabled: true,
    tooltip: "Không khả dụng trong chế độ mô phỏng",
    grid: "col-start-2 row-start-2",
  },
  {
    label: "LOG",
    panel: "log" as const,
    grid: "col-start-3 row-start-2",
  },
  {
    label: "GEN",
    panel: "general" as const,
    grid: "col-start-4 row-span-2 row-start-1",
  },
  {
    label: "EXIT",
    exit: true,
    grid: "col-start-5 row-span-2 row-start-1",
  },
] as const;

function QcmsClock() {
  const [time, setTime] = useState("-- : -- : --");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTime(
        [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map((value) => String(value).padStart(2, "0"))
          .join(" : "),
      );
    }

    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <time
      aria-label="Đồng hồ QCMS"
      className="font-mono text-[11px] tabular-nums text-[#202124]"
    >
      {time}
    </time>
  );
}

function DisplayField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-7 items-center gap-2 border border-[#7a7d80] bg-[#c7c9ca] px-2 font-mono text-[10px] text-[#25282a] shadow-[inset_1px_1px_0_#eceeef]">
      <span className="font-bold">{label}</span>
      <span className="ml-auto tabular-nums">{value}</span>
    </div>
  );
}

export function QcmsToolbar({
  activePanel,
  onSelect,
  onExit,
}: QcmsToolbarProps) {
  return (
    <header className="border-b-2 border-[#202a64] bg-[#b9bbbc] font-mono text-[#202124]">
      <div className="border-b border-[#4d5154] bg-[#202a64] px-3 py-1 text-center text-[11px] font-bold tracking-wide text-white">
        QCMS Quadrant Control and Monitoring System
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[920px] grid-cols-[minmax(0,1fr)_23rem]">
          <div className="grid grid-cols-[repeat(3,minmax(8rem,1fr))_10rem] border-r border-[#6f7275]">
            <DisplayField label="HGT" value="0-900 FL" />
            <DisplayField label="HL" value="10" />
            <DisplayField label="RANGE" value="325 NM" />
            <div className="row-span-2 flex flex-col justify-center border border-[#7a7d80] bg-[#c7c9ca] px-3 shadow-[inset_1px_1px_0_#eceeef]">
              <QcmsClock />
              <span className="mt-1 text-[9px] font-bold">ONLINE</span>
            </div>
            <DisplayField label="PRE" value="0 MIN" />
            <DisplayField label="CR" value="none" />
            <DisplayField label="GRID" value="none" />
          </div>

          <div
            role="toolbar"
            aria-label="QCMS controls"
            className="grid grid-cols-[repeat(3,minmax(4rem,1fr))_4.6rem_4.6rem] grid-rows-2 bg-[#aeb0b1] p-0.5"
          >
            {toolbarItems.map((item) => {
              const active = "panel" in item && item.panel === activePanel;
              const disabled = "disabled" in item && item.disabled;
              const tooltip = "tooltip" in item ? item.tooltip : undefined;

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={disabled}
                  title={tooltip}
                  aria-pressed={"panel" in item ? active : undefined}
                  onClick={() => {
                    if ("exit" in item && item.exit) {
                      onExit();
                    } else if ("panel" in item) {
                      onSelect(item.panel);
                    }
                  }}
                  className={`min-h-8 border px-2 text-[10px] font-bold tracking-wide focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172c9d] disabled:cursor-not-allowed disabled:text-[#707476] ${item.grid} ${
                    active
                      ? "border-b-[#f7f7f7] border-l-[#515354] border-r-[#f7f7f7] border-t-[#515354] bg-[#f1e765] shadow-[inset_1px_1px_2px_rgb(0_0_0/0.32)]"
                      : "border-b-[#515354] border-l-[#f7f7f7] border-r-[#515354] border-t-[#f7f7f7] bg-[#c6c8c9] shadow-[inset_-1px_-1px_0_rgb(0_0_0/0.2)] enabled:hover:bg-[#d5d7d8] enabled:active:border-b-[#f7f7f7] enabled:active:border-l-[#515354] enabled:active:border-r-[#f7f7f7] enabled:active:border-t-[#515354]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
