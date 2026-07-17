"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeValueCell, PmdtPanel, dmeFieldMetadata } from "./screen-primitives";

function CheckField({ fieldId, label, checked }: { fieldId: string; label: string; checked: boolean }) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const value = resolveDmeField(checked, fieldId, overrides);
  return (
    <label {...dmeFieldMetadata(fieldId, label, value, value ? "green" : "gray")} className="flex min-h-7 items-center gap-2 text-[10px] text-[#cbd5e1]">
      <input type="checkbox" checked={value} disabled className="accent-[#22c55e] disabled:opacity-100" />
      {label}
    </label>
  );
}

export function TxConfigNominal() {
  const config = useDmePmdtStore((state) => state.data.txConfigNominal);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const rtcFields = [
    ["powerOutput", "Power Output", "%"],
    ["minimumSquitter", "Minimum Squitter", "ppps"],
    ["maximumPrf", "Maximum PRF", "ppps"],
    ["ldesWindow", "LDES Window", "us"],
    ["ldesThreshold", "LDES Threshold", "dBm"],
    ["deadTime", "Dead Time", "us"],
    ["replyDelayOffset", "Reply Delay Offset", "us"],
    ["rxSensitivity", "Rx Sensitivity", "dBm"],
    ["nominalPropagationDelay", "Nominal Propagation Delay", "us"],
    ["maxPropagationVariance", "Max Propagation Variance", "us"],
    ["standbyPropagationOffset", "Standby Propagation Offset", "us"],
  ] as const;
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <PmdtPanel title="RTC Parameters">
        <dl className="grid gap-2">
          {rtcFields.map(([key, label, unit]) => (
            <div key={key} className="grid grid-cols-[minmax(10rem,1fr)_7rem_3.5rem] items-center gap-2">
              <dt>{label}</dt><dd><DmeValueCell fieldId={`txConfigNominal.rtcParameters.${key}`} label={label} value={config.rtcParameters[key]} className="w-full" /></dd><dd className="text-[#94a3b8]">{unit}</dd>
            </div>
          ))}
        </dl>
      </PmdtPanel>
      <div className="grid content-start gap-4">
        <PmdtPanel title="Operation">
          <div {...dmeFieldMetadata("txConfigNominal.operation.timing", "Timing", config.operation.timing, "green")} className="mb-3 flex gap-6">
            {(["1st Pulse", "2nd Pulse"] as const).map((option) => (
              <label key={option} className="flex items-center gap-2"><input type="radio" name="dme-timing" checked={resolveDmeField(config.operation.timing, "txConfigNominal.operation.timing", overrides) === option} disabled className="accent-[#22c55e] disabled:opacity-100" />{option}</label>
            ))}
          </div>
          <CheckField fieldId="txConfigNominal.operation.squitterEnabled" label="Squitter Enabled" checked={config.operation.squitterEnabled} />
          <CheckField fieldId="txConfigNominal.operation.sdesEnabled" label="SDES Enabled" checked={config.operation.sdesEnabled} />
          <CheckField fieldId="txConfigNominal.operation.ldesEnabled" label="LDES Enabled" checked={config.operation.ldesEnabled} />
          <CheckField fieldId="txConfigNominal.operation.equalizationPulsesEnabled" label="Equalization Pulses Enabled" checked={config.operation.equalizationPulsesEnabled} />
        </PmdtPanel>
        <PmdtPanel title="Power Amplifiers">
          <div className="grid grid-cols-[1fr_7rem_3rem] items-center gap-2"><span>Low Output Power Alert Limit</span><DmeValueCell fieldId="txConfigNominal.powerAmplifiers.lowOutputPowerAlertLimit" label="Low Output Power Alert Limit" value={config.powerAmplifiers.lowOutputPowerAlertLimit} className="w-full" /><span>%</span></div>
          <div className="mt-2 grid grid-cols-2 gap-2"><CheckField fieldId="txConfigNominal.powerAmplifiers.hpa1Enabled" label="HPA 1 Enabled" checked={config.powerAmplifiers.hpa1Enabled} /><CheckField fieldId="txConfigNominal.powerAmplifiers.hpa2Enabled" label="HPA 2 Enabled" checked={config.powerAmplifiers.hpa2Enabled} /></div>
        </PmdtPanel>
        <PmdtPanel title="Ident">
          <div {...dmeFieldMetadata("txConfigNominal.ident.keyerSource", "Keyer Source", config.ident.keyerSource, "green")} className="mb-3 flex gap-5">
            {(["External Keying", "Internal Keying"] as const).map((option) => <label key={option} className="flex items-center gap-2"><input type="radio" name="dme-keyer" checked={resolveDmeField(config.ident.keyerSource, "txConfigNominal.ident.keyerSource", overrides) === option} disabled className="accent-[#22c55e] disabled:opacity-100" />{option}</label>)}
          </div>
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <span>Primary Ident Code</span><DmeValueCell fieldId="txConfigNominal.ident.primaryIdentCode" label="Primary Ident Code" value={config.ident.primaryIdentCode} className="w-full" />
            <span>Secondary Ident Code</span><DmeValueCell fieldId="txConfigNominal.ident.secondaryIdentCode" label="Secondary Ident Code" value={config.ident.secondaryIdentCode} className="w-full" />
            <span>Standby Ident</span><DmeValueCell fieldId="txConfigNominal.ident.standbyIdent" label="Standby Ident" value={config.ident.standbyIdent} className="w-full" />
          </div>
        </PmdtPanel>
      </div>
    </div>
  );
}
