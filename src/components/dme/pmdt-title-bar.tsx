"use client";

import { Minus, Square, X } from "@phosphor-icons/react";

const windowButtons = [
  { label: "Thu nhỏ cửa sổ mô phỏng", icon: Minus },
  { label: "Phóng to cửa sổ mô phỏng", icon: Square },
  { label: "Đóng cửa sổ mô phỏng", icon: X },
] as const;

export function PmdtTitleBar() {
  return (
    <header className="flex h-8 items-center border-b border-[#29496a] bg-gradient-to-r from-[#1e3a5f] to-[#0f2847] px-2 text-[#f8fafc] shadow-sm">
      <span
        aria-hidden
        className="mr-2 grid size-5 place-items-center border border-[#7392b1] bg-[#e5edf5] text-[10px] font-black text-[#1e40af]"
      >
        A
      </span>
      <h1 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide">
        - Dual DME - SELEX Systems Integration Inc. PMDT
      </h1>
      <div className="ml-3 flex h-full items-stretch" aria-label="Điều khiển cửa sổ mô phỏng">
        {windowButtons.map(({ label, icon: WindowIcon }, index) => (
          <button
            key={label}
            type="button"
            title="Chỉ mang tính mô phỏng"
            aria-label={label}
            className={`grid w-9 place-items-center border-l border-white/10 text-[#dbeafe] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#93c5fd] ${
              index === windowButtons.length - 1 ? "hover:bg-[#b91c1c]" : ""
            }`}
          >
            <WindowIcon aria-hidden size={13} weight="bold" />
          </button>
        ))}
      </div>
    </header>
  );
}

