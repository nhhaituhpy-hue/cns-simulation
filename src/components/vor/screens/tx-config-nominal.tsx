"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtConfigControl } from "../pmdt-config-control";

function NumberRow({
  fieldId,
  configFieldId,
  label,
  unit,
  digits,
}: {
  fieldId: string;
  configFieldId: string;
  label: string;
  unit: string;
  digits: number;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td><PmdtConfigControl displayFieldId={fieldId} configFieldId={configFieldId} mirrorFieldIds={[configFieldId.replace("transmitters.tx1.", "transmitters.tx2.")]} type="number" digits={digits} className="pmdt-classic-control" /></td>
      <td>{unit}</td>
    </tr>
  );
}

function CheckLine({ fieldId, label, disabled = false }: { fieldId: string; label: string; checked: boolean; disabled?: boolean }) {
  const key = fieldId.split(".").at(-1)!;
  return (
    <label className="pmdt-tx-check-line" data-vor-field-id={fieldId}>
      <PmdtConfigControl displayFieldId={fieldId} ariaLabel={label} configFieldId={`transmitters.tx1.nominal.${key}`} mirrorFieldIds={[`transmitters.tx2.nominal.${key}`]} type="boolean" disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

export function TxConfigNominal() {
  const data = useVorPmdtStore((state) => state.data);
  const config = data.txConfigNominal;
  const keyerMode = useVorPmdtStore((state) => state.configDraft.transmitters.tx1.nominal.keyerMode);

  const audioFields = [
    ["azimuthIndex", "Azimuth Index", "°", 2],
    ["outputPower", "Output Power", "Watts", 1],
    ["voiceModulation", "Voice Modulation", "%", 1],
    ["identModulation", "Ident Modulation", "%", 1],
    ["referenceModulation", "Reference Modulation", "%", 1],
    ["sboRfLevel", "SBO RF Level", "%", 1],
  ] as const;

  return (
    <section className="pmdt-tx-config-nominal" aria-label="Transmitter nominal configuration">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <div className="pmdt-tx-config-nominal-grid">
        <fieldset className="pmdt-tx-config-fieldset pmdt-tx-audio-generator">
          <legend>Audio Generator Parameters</legend>
          <table>
            <tbody>
              {audioFields.map(([key, label, unit, digits]) => (
                <NumberRow
                  key={key}
                  fieldId={`txConfigNominal.audioGenParams.${key}`}
                  configFieldId={`transmitters.tx1.nominal.${key}`}
                  label={label}
                  unit={unit}
                  digits={digits}
                />
              ))}
            </tbody>
          </table>
        </fieldset>

        <fieldset className="pmdt-tx-config-fieldset pmdt-tx-ident-keyer">
          <legend>Identification/Keyer</legend>
          <table className="pmdt-tx-ident-table">
            <tbody>
              <tr>
                <th scope="row">Main Ident Code</th>
                <td><PmdtConfigControl displayFieldId="txConfigNominal.ident.mainIdentCode" configFieldId="transmitters.tx1.nominal.mainIdentCode" mirrorFieldIds={["transmitters.tx2.nominal.mainIdentCode"]} className="pmdt-classic-control" /></td>
              </tr>
              <tr>
                <th scope="row">Standby Ident Code</th>
                <td>
                  <PmdtConfigControl displayFieldId="txConfigNominal.ident.standbyIdentCode" configFieldId="transmitters.tx1.nominal.standbyIdentCode" mirrorFieldIds={["transmitters.tx2.nominal.standbyIdentCode"]} className="pmdt-tx-ident-control" />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="pmdt-tx-keyer-section">
            <h3>Keyer Input:</h3>
            <div className="pmdt-tx-radio-lines">
              <label><PmdtConfigControl displayFieldId="txConfigNominal.keyerInput.mode.disabled" ariaLabel="Disabled (Self-Keyed)" configFieldId="transmitters.tx1.nominal.keyerMode" mirrorFieldIds={["transmitters.tx2.nominal.keyerMode"]} optionValue="disabled" /> Disabled (Self-Keyed)</label>
              <label><PmdtConfigControl displayFieldId="txConfigNominal.keyerInput.mode.external" ariaLabel="External Keying" configFieldId="transmitters.tx1.nominal.keyerMode" mirrorFieldIds={["transmitters.tx2.nominal.keyerMode"]} optionValue="external" /> External Keying</label>
            </div>
            <div className="pmdt-tx-disabled-row">
              <span>Keyer Input Level</span>
              <PmdtConfigControl displayFieldId="txConfigNominal.keyerInput.keyerInputLevel" ariaLabel="Keyer Input Level" configFieldId="transmitters.tx1.nominal.keyerInputLevel" mirrorFieldIds={["transmitters.tx2.nominal.keyerInputLevel"]} disabled={keyerMode !== "external"} />
            </div>
            <div className="pmdt-tx-check-grid">
              <CheckLine fieldId="txConfigNominal.keyerInput.windowedKeyingInput" label="Windowed Keying Input" disabled={keyerMode !== "external"} checked={config.keyerInput.windowedKeyingInput} />
              <CheckLine fieldId="txConfigNominal.keyerInput.selfKeyOnLoss" label="Self-Key on Loss of Keying Signal" disabled={keyerMode !== "external"} checked={config.keyerInput.selfKeyOnLoss} />
              <CheckLine fieldId="txConfigNominal.keyerInput.shutdownOnLoss" label="Shutdown on Loss of Keyed Signal" disabled={keyerMode !== "external"} checked={config.keyerInput.shutdownOnLoss} />
              <CheckLine fieldId="txConfigNominal.keyerInput.restartWhenResumed" label="Restart when Keying Signal Resumes" disabled={keyerMode !== "external"} checked={config.keyerInput.restartWhenResumed} />
            </div>
          </div>

          <div className="pmdt-tx-keyer-section pmdt-tx-keyer-output">
            <h3>Keyer Output:</h3>
            <div className="pmdt-tx-disabled-row">
              <span>External Keying</span>
              <PmdtConfigControl displayFieldId="txConfigNominal.keyerOutput.externalKeying" ariaLabel="External Keying output" configFieldId="transmitters.tx1.nominal.externalKeying" mirrorFieldIds={["transmitters.tx2.nominal.externalKeying"]} />
            </div>
            <CheckLine fieldId="txConfigNominal.keyerOutput.suppressOnShutdown" label="Suppress External Keyer on Shutdown" checked={config.keyerOutput.suppressOnShutdown} />
          </div>
        </fieldset>
      </div>
    </section>
  );
}
