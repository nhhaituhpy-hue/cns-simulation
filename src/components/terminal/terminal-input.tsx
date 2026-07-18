"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { useEffect, useRef, useState } from "react";
import type { TerminalPendingPrompt } from "@/stores/terminal-store";

function promptLabel(prompt: TerminalPendingPrompt): string {
  if (prompt === "login") return "login:";
  if (prompt === "password") return "Password:";
  if (prompt === "display") return "RETURN:";
  return "->";
}

export interface TerminalInputProps {
  pendingPrompt: TerminalPendingPrompt;
  pendingSensitive: boolean;
  disabled: boolean;
  onSubmit: (input: string) => void;
}

export function TerminalInput({
  pendingPrompt,
  pendingSensitive,
  disabled,
  onSubmit,
}: TerminalInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isPassword = pendingPrompt === "password" || pendingSensitive;

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, pendingPrompt, pendingSensitive]);

  return (
    <form
      className="flex min-h-14 items-center gap-2 border-t border-[#2b2b2b] bg-[#080808] px-4 py-2 font-mono text-sm sm:px-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
        setValue("");
      }}
    >
      <label
        htmlFor="terminal-command-input"
        className="shrink-0 font-semibold text-[var(--terminal-green)]"
      >
        {promptLabel(pendingPrompt)}
      </label>
      <input
        ref={inputRef}
        id="terminal-command-input"
        type={isPassword ? "password" : "text"}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label={isPassword ? "Nhập mật khẩu mô phỏng" : "Nhập lệnh terminal"}
        className="min-w-0 flex-1 bg-transparent text-[var(--terminal-text)] caret-emerald-400 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed"
        placeholder={disabled ? "Phiên terminal đã kết thúc" : "Nhập lựa chọn rồi nhấn Enter"}
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label="Gửi lệnh"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded text-[var(--terminal-green)] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PaperPlaneTilt aria-hidden size={18} weight="fill" />
      </button>
    </form>
  );
}
