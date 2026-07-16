"use client";

import {
  ArrowCounterClockwise,
  ArrowRight,
  Check,
  FloppyDisk,
  Printer,
  X,
  type Icon,
} from "@phosphor-icons/react";

interface ToolbarButton {
  label: string;
  shortcut?: string;
  icon: Icon;
}

const defaultButtons: readonly ToolbarButton[] = [
  { label: "Save", icon: FloppyDisk },
  { label: "Print", icon: Printer },
  { label: "Next", shortcut: "F5", icon: ArrowRight },
  { label: "Close", shortcut: "F6", icon: X },
  { label: "Apply", shortcut: "F7", icon: Check },
  { label: "Reset", shortcut: "F8", icon: ArrowCounterClockwise },
];

export function PmdtToolbar({ title }: { title: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2 border-b border-[#334155] bg-[#111827] px-3">
      <h2 className="mr-auto truncate text-sm font-semibold text-[#e2e8f0]">
        {title}
      </h2>
      <div className="flex items-center gap-1" aria-label="Thanh công cụ mô phỏng">
        {defaultButtons.map(({ label, shortcut, icon: ButtonIcon }) => (
          <button
            key={label}
            type="button"
            title={`${label} chỉ mang tính mô phỏng`}
            className="inline-flex h-8 items-center gap-1.5 border border-[#475569] bg-[#1e293b] px-2 text-[11px] font-medium text-[#cbd5e1] hover:border-[#60a5fa] hover:bg-[#273449] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          >
            <ButtonIcon aria-hidden size={14} />
            <span>{label}</span>
            {shortcut ? <kbd className="text-[9px] text-[#94a3b8]">{shortcut}</kbd> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
