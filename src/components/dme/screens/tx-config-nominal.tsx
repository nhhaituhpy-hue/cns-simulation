"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeConfigControl } from "./dme-config-control";
import { PmdtPanel, dmeFieldMetadata } from "./screen-primitives";

function CheckField({
  fieldId,
  label,
  disabled = false,
}: {
  fieldId: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`dme-pmdt-config-check${disabled ? " dme-pmdt-config-check--disabled" : ""}`}>
      <DmeConfigControl fieldId={fieldId} label={label} type="boolean" disabled={disabled} className="accent-[#22c55e]" />
      <span>{label}</span>
    </label>
  );
}

function RadioField({
  fieldId,
  label,
  value,
  selected,
}: {
  fieldId: string;
  label: string;
  value: string;
  selected: boolean;
}) {
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const canEdit = securityLevel >= 3 && !loginDialogOpen && local;

  return (
    <label className="dme-pmdt-config-radio">
      <input id={`dme-tx-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}-${value.replace(/[^A-Za-z0-9_-]/g, "-")}`} type="radio" name={fieldId} value={value} checked={selected} disabled={!canEdit} onChange={() => setParameterValue(fieldId, value)} />
      <span>{label}</span>
    </label>
  );
}

function NominalValue({
  fieldId,
  label,
  precision,
}: {
  fieldId: string;
  label: string;
  precision: number;
}) {
  return (
    <span className="dme-pmdt-spin-value">
      <DmeConfigControl
        fieldId={fieldId}
        label={label}
        type="number"
        digits={precision}
        className="dme-pmdt-config-input"
      />
      <span aria-hidden className="dme-pmdt-spin-buttons"><span>▲</span><span>▼</span></span>
    </span>
  );
}

export function TxConfigNominal() {
  const config = useDmePmdtStore((state) => state.configDraft.txConfigNominal);
  const timing = config.operation.timing;
  const keyerSource = config.ident.keyerSource;
  const rtcFields = [
    ["powerOutput", "Power Output", "dB", 2],
    ["minimumSquitter", "Minimum Squitter", "ppps", 0],
    ["maximumPrf", "Maximum PRF", "ppps", 0],
    ["ldesWindow", "LDES Window", "us", 0],
    ["ldesThreshold", "LDES Threshold", "dBm", 0],
    ["deadTime", "Dead Time", "us", 0],
    ["replyDelayOffset", "Reply Delay Offset", "us", 2],
    ["rxSensitivity", "Rx Sensitivity", "dBm", 0],
    ["nominalPropagationDelay", "Nominal Propagation Delay", "us", 2],
    ["maxPropagationVariance", "Max Propagation Variance", "us", 2],
    ["standbyPropagationOffset", "Standby Propagation Offset", "us", 2],
  ] as const;

  return (
    <div className="dme-pmdt-tx-nominal">
      <div className="dme-pmdt-tx-nominal-left">
        <PmdtPanel title="RTC Parameters" className="dme-pmdt-tx-rtc-parameters">
          <dl>
            {rtcFields.map(([key, label, unit, precision]) => (
              <div key={key}>
                <dt>{label}{key === "maxPropagationVariance" ? <span>+/-</span> : null}</dt>
                <dd><NominalValue fieldId={`txConfigNominal.rtcParameters.${key}`} label={label} precision={precision} /></dd>
                <dd>{unit}</dd>
              </div>
            ))}
          </dl>
        </PmdtPanel>

        <PmdtPanel title="Power Amplifiers" className="dme-pmdt-tx-power-amplifiers">
          <div className="dme-pmdt-pa-limit-row">
            <span>Low Output Power Alert Limit</span>
            <NominalValue fieldId="txConfigNominal.powerAmplifiers.lowOutputPowerAlertLimit" label="Low Output Power Alert Limit" precision={1} />
            <span>%</span>
          </div>
          <CheckField fieldId="txConfigNominal.powerAmplifiers.hpa1Enabled" label="HPA #1 Enabled" />
          <CheckField fieldId="txConfigNominal.powerAmplifiers.hpa2Enabled" label="HPA #2 Enabled" />
        </PmdtPanel>
      </div>

      <div className="dme-pmdt-tx-nominal-right">
        <PmdtPanel title="Operation" className="dme-pmdt-tx-operation">
          <div {...dmeFieldMetadata("txConfigNominal.operation.timing", "Timing", timing, "green")} className="dme-pmdt-timing-row">
            <span>Timing</span>
            <RadioField fieldId="txConfigNominal.operation.timing" label="1st Pulse" value="1st Pulse" selected={timing === "1st Pulse"} />
            <RadioField fieldId="txConfigNominal.operation.timing" label="2nd Pulse" value="2nd Pulse" selected={timing === "2nd Pulse"} />
          </div>
          <CheckField fieldId="txConfigNominal.operation.squitterEnabled" label="Squitter Enabled" />
          <CheckField fieldId="txConfigNominal.operation.sdesEnabled" label="SDES Enabled" />
          <CheckField fieldId="txConfigNominal.operation.ldesEnabled" label="LDES Enabled" />
          <CheckField fieldId="txConfigNominal.operation.equalizationPulsesEnabled" label="Equalization Pulses Enabled" />
        </PmdtPanel>

        <PmdtPanel title="Ident" className="dme-pmdt-tx-ident">
          <div className="dme-pmdt-keyer-io-row">
            <span>Keyer I/O</span>
            <DmeConfigControl fieldId="txConfigNominal.ident.keyerIo" label="Keyer I/O" type="select" className="dme-pmdt-select-readout" />
          </div>
          <CheckField fieldId="txConfigNominal.ident.windowedKeying" label="Windowed Keying" />
          <div className="dme-pmdt-keyer-source-label">Keyer Source :</div>
          <RadioField fieldId="txConfigNominal.ident.keyerSource" label="External Keying" value="External Keying" selected={keyerSource === "External Keying"} />
          <div className="dme-pmdt-key-loss-options">
            <CheckField fieldId="txConfigNominal.ident.selfKeyOnLoss" label="Self-Key on Loss of Keyed Signal" disabled />
            <CheckField fieldId="txConfigNominal.ident.shutdownOnLoss" label="Shutdown on Loss of Keyed Signal" disabled />
            <CheckField fieldId="txConfigNominal.ident.restartWhenSignalResumes" label="Restart when Keyed Signal Resumes" disabled />
          </div>
          <RadioField fieldId="txConfigNominal.ident.keyerSource" label="Internal Keying" value="Internal Keying" selected={keyerSource === "Internal Keying"} />
          <div className="dme-pmdt-ident-codes">
            <div><span>Primary Ident Code</span><DmeConfigControl fieldId="txConfigNominal.ident.primaryIdentCode" label="Primary Ident Code" type="text" /></div>
            <div><CheckField fieldId="txConfigNominal.ident.secondaryIdentEnabled" label="Secondary Ident Code" /><DmeConfigControl fieldId="txConfigNominal.ident.secondaryIdentCode" label="Secondary Ident Code" type="text" /></div>
            <div><span>Standby Ident</span><DmeConfigControl fieldId="txConfigNominal.ident.standbyIdent" label="Standby Ident" type="select" className="dme-pmdt-select-readout" /></div>
          </div>
        </PmdtPanel>
      </div>
    </div>
  );
}
