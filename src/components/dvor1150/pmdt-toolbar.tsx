"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Printer } from "@phosphor-icons/react/dist/csr/Printer";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useState } from "react";
import { canEditDvor1150SecurityCodes, useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

export function Dvor1150Toolbar({ title, nextAvailable, securityDraftDirty = false, readCopyText }: {
  title: string;
  nextAvailable: boolean;
  securityDraftDirty?: boolean;
  readCopyText?: () => string;
}) {
  const apply = useDvor1150PmdtStore((state) => state.applyConfigChanges);
  const resetConfigDraft = useDvor1150PmdtStore((state) => state.resetConfigDraft);
  const next = useDvor1150PmdtStore((state) => state.nextView);
  const close = useDvor1150PmdtStore((state) => state.closeScreen);
  const dirty = useDvor1150PmdtStore((state) => state.configDirty);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const lastCommand = useDvor1150PmdtStore((state) => state.lastCommand);
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const configScreen = useDvor1150PmdtStore((state) => ["rms-config", "monitor-config", "tx-config"].includes(state.activeScreen));
  const canEditCodes = useDvor1150PmdtStore(canEditDvor1150SecurityCodes);
  const onSecurityCodes = activeView === "rms-config-security-codes";
  const canEdit = onSecurityCodes ? canEditCodes && securityDraftDirty : configScreen && dirty && security >= 3 && local;
  const [copyMessage, setCopyMessage] = useState("");

  async function copyText() {
    if (!readCopyText) return;
    try {
      await navigator.clipboard.writeText(readCopyText());
      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Clipboard unavailable");
    }
  }
  return (
    <div className="pmdt-toolbar">
      <h2 className="pmdt-toolbar-title">{title}</h2>
      <div className="pmdt-toolbar-actions" aria-label="Screen commands">
        <button type="button" title="Print" aria-label="Print" onClick={() => window.print()}><Printer size={13} /></button>
        <button type="button" title="Copy" aria-label="Copy" disabled={!readCopyText} onClick={copyText}><Copy size={13} /></button>
        <button type="button" data-pmdt-key="F5" disabled={!nextAvailable} onClick={next}>Next (F5)</button>
        <button type="button" data-pmdt-key="F6" onClick={close}><X size={12} /> Close (F6)</button>
        <button type={onSecurityCodes ? "submit" : "button"} form={onSecurityCodes ? "dvor1150-security-codes" : undefined}
          data-pmdt-key="F7" disabled={!canEdit} onClick={onSecurityCodes ? undefined : apply}><Check size={12} /> Apply (F7)</button>
        <button type={onSecurityCodes ? "reset" : "button"} form={onSecurityCodes ? "dvor1150-security-codes" : undefined}
          data-pmdt-key="F8" disabled={!canEdit} onClick={onSecurityCodes ? undefined : resetConfigDraft}><ArrowCounterClockwise size={12} /> Reset (F8)</button>
      </div>
      <span className="sr-only" role="status">{copyMessage}</span>
      {configScreen && !onSecurityCodes && (lastCommand?.startsWith("Apply failed:") || lastCommand?.startsWith("Apply blocked:")) ? <span className="dvor1150-config-notice" role="alert">{lastCommand}</span> : null}
    </div>
  );
}
