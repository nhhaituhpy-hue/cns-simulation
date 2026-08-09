"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function PmdtToolbar({ title }: { title: string }) {
  const applyConfigChanges = useVorPmdtStore((state) => state.applyConfigChanges);
  const restoreDefaultConfig = useVorPmdtStore((state) => state.restoreDefaultConfig);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const bypass = useVorPmdtStore((state) => state.config.simulation.integralMonitorBypass);
  const configDirty = useVorPmdtStore((state) => state.configDirty);
  const canApply = configDirty && securityLevel >= 3 && local && bypass;
  const canRestore = securityLevel >= 3 && local && bypass;

  return (
    <div className="pmdt-toolbar">
      <h2 className="pmdt-toolbar-title">{title}</h2>
      <div className="pmdt-toolbar-actions" aria-label="Screen commands">
        <button type="button" title="Print" aria-label="Print"><Printer aria-hidden size={13} /></button>
        <button type="button" title="Copy" aria-label="Copy"><Copy aria-hidden size={13} /></button>
        <button type="button" title="Next (F5)">Next (F5)</button>
        <button type="button" title="Close (F6)"><X aria-hidden size={12} /> Close (F6)</button>
        <button type="button" title="Apply (F7)" disabled={!canApply} onClick={applyConfigChanges}><Check aria-hidden size={12} /> Apply (F7)</button>
        <button type="button" title="Reset (F8)" disabled={!canRestore} onClick={restoreDefaultConfig}><ArrowCounterClockwise aria-hidden size={12} /> Reset (F8)</button>
      </div>
    </div>
  );
}
