"use client";

import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import type { TerminalPendingPrompt } from "@/stores/terminal-store";
import { TerminalInput } from "./terminal-input";
import { TerminalOutput } from "./terminal-output";

export interface TerminalWindowProps {
  ipAddress: string;
  output: string[];
  pendingPrompt: TerminalPendingPrompt;
  pendingSensitive: boolean;
  isExited: boolean;
  onSubmit: (input: string) => void;
}

export function TerminalWindow({
  ipAddress,
  output,
  pendingPrompt,
  pendingSensitive,
  isExited,
  onSubmit,
}: TerminalWindowProps) {
  return (
    <section
      aria-label={`Terminal SSH mô phỏng đến ${ipAddress}`}
      className="terminal-surface flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#333333] shadow-[0_18px_45px_rgb(0_0_0/0.26)] lg:min-h-[640px]"
    >
      <div className="flex min-h-11 items-center gap-2 border-b border-[#333333] bg-[#1a1a1a] px-4">
        <span aria-hidden className="size-3 rounded-full bg-[#ff5f57]" />
        <span aria-hidden className="size-3 rounded-full bg-[#febc2e]" />
        <span aria-hidden className="size-3 rounded-full bg-[#28c840]" />
        <div className="ml-2 flex min-w-0 items-center gap-2 text-xs text-zinc-300 sm:text-sm">
          <Terminal aria-hidden size={17} />
          <span className="truncate">SSH {ipAddress}</span>
        </div>
        <span
          className={`ml-auto text-xs font-medium ${
            isExited ? "text-zinc-500" : "text-emerald-400"
          }`}
        >
          {isExited ? "Đã đóng" : "Đang kết nối"}
        </span>
      </div>

      <TerminalOutput output={output} />
      <TerminalInput
        pendingPrompt={pendingPrompt}
        pendingSensitive={pendingSensitive}
        disabled={isExited}
        onSubmit={onSubmit}
      />
    </section>
  );
}
