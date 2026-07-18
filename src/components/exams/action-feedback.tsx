"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";

export function ActionFeedback({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  const Icon = tone === "success" ? CheckCircle : WarningCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
        tone === "success"
          ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
          : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
      }`}
    >
      <Icon aria-hidden size={18} weight="duotone" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
