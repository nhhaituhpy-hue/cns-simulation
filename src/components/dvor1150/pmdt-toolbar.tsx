"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

export function Dvor1150Toolbar({ title }: { title: string }) {
  const apply = useDvor1150PmdtStore((state) => state.applyConfigChanges);
  const reset = useDvor1150PmdtStore((state) => state.resetConfigDraft);
  const next = useDvor1150PmdtStore((state) => state.nextView);
  const close = useDvor1150PmdtStore((state) => state.closeScreen);
  const dirty = useDvor1150PmdtStore((state) => state.configDirty);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const bypass = useDvor1150PmdtStore((state) => state.config.simulation.integralMonitorBypass);
  const canApply = dirty && security >= 3 && local && bypass;
  return (
    <div className="pmdt-toolbar">
      <h2 className="pmdt-toolbar-title">{title}</h2>
      <div className="pmdt-toolbar-actions" aria-label="Screen commands">
        <button type="button" title="Print"><Printer size={13} /></button>
        <button type="button" title="Copy"><Copy size={13} /></button>
        <button type="button" title="Next (F5)" onClick={next}>Next (F5)</button>
        <button type="button" title="Close (F6)" onClick={close}><X size={12} /> Close (F6)</button>
        <button type="button" title="Apply (F7)" disabled={!canApply} onClick={apply}><Check size={12} /> Apply (F7)</button>
        <button type="button" title="Reset (F8)" disabled={!dirty} onClick={reset}><ArrowCounterClockwise size={12} /> Reset (F8)</button>
      </div>
    </div>
  );
}
