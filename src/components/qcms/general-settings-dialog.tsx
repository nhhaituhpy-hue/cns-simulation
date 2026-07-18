"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useState, type ReactNode } from "react";

type GeneralSettingsDialogProps = {
  onClose: () => void;
};

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-[#b8c4ce] bg-white p-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[#475569]">
        {title}
      </h3>
      <dl className="mt-2 space-y-1.5">{children}</dl>
    </section>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(9rem,1fr)_minmax(8rem,1fr)] gap-3 text-sm">
      <dt className="text-[#64748b]">{label}</dt>
      <dd className="text-right font-mono font-semibold text-[#172033]">
        {value}
      </dd>
    </div>
  );
}

export function GeneralSettingsDialog({
  onClose,
}: GeneralSettingsDialogProps) {
  const [resetNotice, setResetNotice] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="general-settings-title"
        className="w-full max-w-xl overflow-hidden rounded-lg border border-[#40566b] bg-[#edf2f5] shadow-[0_20px_60px_rgb(15_23_42/0.35)]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <h2 id="general-settings-title" className="text-lg font-bold">
            General Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close General Settings" className="inline-flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <div className="rounded border border-[#b8c4ce] bg-white p-3">
            <Setting label="QCMS Version" value="1-5-3" />
          </div>
          <SettingsGroup title="Communication Settings">
            <Setting label="Surveillance Port" value="20550 (UDP)" />
            <Setting label="Weather Port" value="20660 (UDP)" />
          </SettingsGroup>
          <SettingsGroup title="SNMP Settings">
            <Setting label="Cycle Time" value="10 seconds" />
            <Setting label="Trap Port" value="20900" />
            <Setting label="Trap Community" value="qcms_trap" />
          </SettingsGroup>
          <SettingsGroup title="Viewport Settings">
            <Setting label="Viewport A" value={"8.68\u00b0N 106.60\u00b0E 400NM"} />
          </SettingsGroup>

          <p aria-live="polite" className="min-h-5 text-xs font-medium text-[#334155]">
            {resetNotice ? "Viewport reset to default values." : ""}
          </p>

          <footer className="flex flex-col-reverse gap-2 border-t border-[#b8c4ce] pt-4 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setResetNotice(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#64748b] bg-white px-3 text-xs font-bold text-[#263746] hover:bg-[#e8f2fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]">
              <ArrowCounterClockwise aria-hidden size={16} />
              RESET TO DEFAULT VIEWPORTS
            </button>
            <button type="button" onClick={onClose} className="min-h-10 rounded bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2">
              CLOSE
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
