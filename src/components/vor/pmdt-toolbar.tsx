"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function PmdtToolbar({ title }: { title: string }) {
  const applyConfigChanges = useVorPmdtStore((state) => state.applyConfigChanges);
  const discardConfigChanges = useVorPmdtStore((state) => state.discardConfigChanges);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const configDirty = useVorPmdtStore((state) => state.configDirty);
  const securityView = useVorPmdtStore(state => state.activeView === "rms-config-security");
  const securityDirty = useVorPmdtStore(state => state.securityDraftDirty);
  const securityAllowed = useVorPmdtStore(state => state.securityLevel === 4 && state.config.simulation.connected && !state.scenario.active);
  const dirty = securityView ? securityDirty : configDirty;
  const canApply = dirty && local && (securityView ? securityAllowed : securityLevel >= 3);

  return (
    <div className="pmdt-toolbar">
      <h2 className="pmdt-toolbar-title">{title}</h2>
      <div className="pmdt-toolbar-actions" aria-label="Screen commands">
        <button type="button" title="Print" aria-label="Print"><Printer aria-hidden size={13} /></button>
        <button type="button" title="Copy" aria-label="Copy"><Copy aria-hidden size={13} /></button>
        <button type="button" title="Next (F5)">Next (F5)</button>
        <button type="button" title="Close (F6)"><X aria-hidden size={12} /> Close (F6)</button>
        <button type="button" title="Apply (F7)" disabled={!canApply} onClick={applyConfigChanges}><Check aria-hidden size={12} /> Apply (F7)</button>
        <button type="button" title="Reset (F8): cancel pending changes" disabled={!dirty} onClick={discardConfigChanges}><ArrowCounterClockwise aria-hidden size={12} /> Reset (F8)</button>
      </div>
    </div>
  );
}
