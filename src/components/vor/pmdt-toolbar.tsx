"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { copyPmdtLog, printPmdtScreen } from "./pmdt-file-commands";

export function PmdtToolbar({ title }: { title: string }) {
  const applyConfigChanges = useVorPmdtStore((state) => state.applyConfigChanges);
  const discardConfigChanges = useVorPmdtStore((state) => state.discardConfigChanges);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const configDirty = useVorPmdtStore((state) => state.configDirty);
  const canApply = configDirty && securityLevel >= 3 && local;
  const canCopy = useVorPmdtStore(state => state.activeScreen === "rms-logs" && state.activeView !== "rms-logs-operational-summary");

  return (
    <div className="pmdt-toolbar">
      <h2 className="pmdt-toolbar-title">{title}</h2>
      <div className="pmdt-toolbar-actions" aria-label="Screen commands">
        <button type="button" title="Print" aria-label="Print" onClick={event => printPmdtScreen(event.currentTarget)}><Printer aria-hidden size={13} /></button>
        <button type="button" title={canCopy ? "Copy" : "Copy chỉ có tại các màn log dạng text (TM §3.6.4)"} aria-label="Copy" disabled={!canCopy} onClick={event => void copyPmdtLog(event.currentTarget)}><Copy aria-hidden size={13} /></button>
        <button type="button" title="Next (F5)">Next (F5)</button>
        <button type="button" title="Close (F6)"><X aria-hidden size={12} /> Close (F6)</button>
        <button type="button" title="Apply (F7)" disabled={!canApply} onClick={applyConfigChanges}><Check aria-hidden size={12} /> Apply (F7)</button>
        <button type="button" title="Reset (F8): cancel pending changes" disabled={!configDirty} onClick={discardConfigChanges}><ArrowCounterClockwise aria-hidden size={12} /> Reset (F8)</button>
      </div>
    </div>
  );
}
