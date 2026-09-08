"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";
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

function CheckLine({ fieldId, label, checked }: { fieldId: string; label: string; checked: boolean }) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  return (
    <label className="pmdt-tx-check-line" data-vor-field-id={fieldId}>
      <input type="checkbox" aria-label={fieldId} disabled checked={Boolean(resolveVorField(checked, fieldId, overrides))} />
      <span>{label}</span>
    </label>
  );
}

export function TxConfigNominal() {
  const data = useVorPmdtStore((state) => state.data);
  const config = data.txConfigNominal;
  const overrides = useVorPmdtStore((state) => state.overrides);
  const keyerMode = resolveVorField(config.keyerInput.mode, "txConfigNominal.keyerInput.mode", overrides);

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
              <label><input type="radio" disabled checked={keyerMode === "disabled"} /> Disabled (Self-Keyed)</label>
              <label><input type="radio" disabled checked={keyerMode === "external"} /> External Keying</label>
            </div>
            <div className="pmdt-tx-disabled-row">
              <span>Keyer Input Level</span>
              <select disabled value={String(config.keyerInput.keyerInputLevel)} onChange={() => {}}>
                <option>Active High/Open</option>
                <option>Active Low/Closed</option>
              </select>
            </div>
            <div className="pmdt-tx-check-grid">
              <CheckLine fieldId="txConfigNominal.keyerInput.windowedKeyingInput" label="Windowed Keying Input" checked={config.keyerInput.windowedKeyingInput} />
              <CheckLine fieldId="txConfigNominal.keyerInput.selfKeyOnLoss" label="Self-Key on Loss of Keying Signal" checked={config.keyerInput.selfKeyOnLoss} />
              <CheckLine fieldId="txConfigNominal.keyerInput.shutdownOnLoss" label="Shutdown on Loss of Keyed Signal" checked={config.keyerInput.shutdownOnLoss} />
              <CheckLine fieldId="txConfigNominal.keyerInput.restartWhenResumed" label="Restart when Keying Signal Resumes" checked={config.keyerInput.restartWhenResumed} />
            </div>
          </div>

          <div className="pmdt-tx-keyer-section pmdt-tx-keyer-output">
            <h3>Keyer Output:</h3>
            <div className="pmdt-tx-disabled-row">
              <span>External Keying</span>
              <select disabled value={String(config.keyerOutput.externalKeying)} onChange={() => {}}>
                <option>Disabled</option>
                <option>Enabled</option>
              </select>
            </div>
            <CheckLine fieldId="txConfigNominal.keyerOutput.suppressOnShutdown" label="Suppress External Keyer on Shutdown" checked={config.keyerOutput.suppressOnShutdown} />
          </div>
        </fieldset>
      </div>
    </section>
  );
}
