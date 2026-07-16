"use client";

import type { VorEditableValue } from "@/lib/vor-types";
import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

function ValueField({ label, fieldId, value, unit }: { label: string; fieldId: string; value: VorEditableValue; unit?: string }) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  const resolved = resolveVorField(value, fieldId, overrides);
  return (
    <label data-vor-field-id={fieldId} className="grid gap-1 text-[10px] text-[#94a3b8]">
      <span>{label}</span>
      <span className="flex items-center gap-2"><input readOnly value={resolved === null ? "" : String(resolved)} className="h-8 min-w-0 flex-1 border border-[#475569] bg-[#0f172a] px-2 font-mono text-[11px] text-[#e2e8f0] outline-none" />{unit ? <span className="w-10">{unit}</span> : null}</span>
    </label>
  );
}

function CheckField({ label, fieldId, checked }: { label: string; fieldId: string; checked: boolean }) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  return <label data-vor-field-id={fieldId} className="flex min-h-7 items-center gap-2 text-[10px] text-[#cbd5e1]"><input type="checkbox" checked={resolveVorField(checked, fieldId, overrides)} disabled className="accent-[#22c55e] disabled:opacity-100" />{label}</label>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-[#334155] bg-[#111827]"><h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold">{title}</h3><div className="p-3">{children}</div></section>;
}

export function TxConfigNominal() {
  const config = useVorPmdtStore((state) => state.data.txConfigNominal);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const audioFields = [
    ["azimuthIndex", "Azimuth Index", "°"], ["outputPower", "Output Power", "%"],
    ["voiceModulation", "Voice Modulation", "%"], ["identModulation", "Ident Modulation", "%"],
    ["referenceModulation", "Reference Modulation", "%"], ["sboRfLevel", "SBO RF Level", "%"],
  ] as const;

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-2">
      <Panel title="Audio Generator Parameters">
        <div className="grid grid-cols-2 gap-3">{audioFields.map(([key, label, unit]) => <ValueField key={key} label={label} fieldId={`txConfigNominal.audioGenParams.${key}`} value={config.audioGenParams[key]} unit={unit} />)}</div>
      </Panel>
      <Panel title="Identification">
        <div className="grid gap-3"><ValueField label="Main Ident Code" fieldId="txConfigNominal.ident.mainIdentCode" value={config.ident.mainIdentCode} /><ValueField label="Standby Ident Code" fieldId="txConfigNominal.ident.standbyIdentCode" value={config.ident.standbyIdentCode} /></div>
      </Panel>
      <Panel title="Keyer Input">
        <fieldset className="mb-3"><legend className="mb-1 text-[10px] text-[#94a3b8]">Mode</legend><div className="flex gap-5 text-[10px] text-[#cbd5e1]">{(["disabled", "external"] as const).map((mode) => <label key={mode} className="flex items-center gap-1.5"><input type="radio" name="keyer-mode" checked={resolveVorField(config.keyerInput.mode, "txConfigNominal.keyerInput.mode", overrides) === mode} disabled className="accent-[#22c55e] disabled:opacity-100" />{mode === "disabled" ? "Disabled" : "External"}</label>)}</div></fieldset>
        <ValueField label="Keyer Input Level" fieldId="txConfigNominal.keyerInput.keyerInputLevel" value={config.keyerInput.keyerInputLevel} />
        <div className="mt-3 grid grid-cols-2 gap-x-3">{([
          ["windowedKeyingInput", "Windowed Keying Input"], ["selfKeyOnLoss", "Self Key on Loss"],
          ["shutdownOnLoss", "Shutdown on Loss"], ["restartWhenResumed", "Restart when Resumed"],
        ] as const).map(([key, label]) => <CheckField key={key} label={label} fieldId={`txConfigNominal.keyerInput.${key}`} checked={config.keyerInput[key]} />)}</div>
      </Panel>
      <Panel title="Keyer Output">
        <div className="grid gap-3"><ValueField label="External Keying" fieldId="txConfigNominal.keyerOutput.externalKeying" value={config.keyerOutput.externalKeying} /><CheckField label="Suppress on Shutdown" fieldId="txConfigNominal.keyerOutput.suppressOnShutdown" checked={config.keyerOutput.suppressOnShutdown} /></div>
      </Panel>
    </div>
  );
}
