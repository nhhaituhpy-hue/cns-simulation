"use client";

import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

export function PmdtToolbar({ title }: { title: string }) {
  const applyConfigChanges = useDmePmdtStore((state) => state.applyConfigChanges);
  const restoreDefaultConfig = useDmePmdtStore((state) => state.restoreDefaultConfig);
  const configDirty = useDmePmdtStore((state) => state.configDirty);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const nextView = useDmePmdtStore((state) => state.nextView);
  const closeScreen = useDmePmdtStore((state) => state.closeScreen);
  const canApply = configDirty && securityLevel >= 3 && !loginDialogOpen && local;
  const canRestore = securityLevel >= 3 && !loginDialogOpen && local;

  function printScreen() {
    if (typeof window !== "undefined") window.print();
  }

  async function copyScreen() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const text = document.querySelector(".dme-pmdt-window")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text.replace(/\s+/g, " ").trim());
    } catch {
      // Clipboard access can be unavailable in a local preview; keep the PMDT usable.
    }
  }

  return (
    <div className="pmdt-toolbar">
      <h2 className="pmdt-toolbar-title">{title}</h2>
      <div className="pmdt-toolbar-actions" aria-label="Screen commands">
        <button type="button" title="Print" aria-label="Print" onClick={printScreen}><Printer aria-hidden size={13} /></button>
        <button type="button" title="Copy" aria-label="Copy" onClick={() => void copyScreen()}><Copy aria-hidden size={13} /></button>
        <button type="button" title="Next (F5)" onClick={nextView}>Next (F5)</button>
        <button type="button" title="Close (F6)" onClick={closeScreen}><X aria-hidden size={12} /> Close (F6)</button>
        <button type="button" title="Apply (F7)" disabled={!canApply} onClick={applyConfigChanges}><Check aria-hidden size={12} /> Apply (F7)</button>
        <button type="button" title="Reset (F8)" disabled={!canRestore} onClick={restoreDefaultConfig}><ArrowCounterClockwise aria-hidden size={12} /> Reset (F8)</button>
      </div>
    </div>
  );
}
