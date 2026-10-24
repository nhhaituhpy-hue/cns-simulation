"use client";

import { Fragment, useState } from "react";
import type { DvorKeyerObservations, DvorTransmitterId } from "@/lib/dvor1150a/config-types";
import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const statusClasses: Record<VorIndicatorColor, string> = {
  green: "bg-[var(--cns-surface-card)] text-[#bbf7d0]",
  yellow: "bg-[#3a2f0f] text-[#fef08a]",
  red: "bg-[#3a0f0f] text-[#fecaca]",
  gray: "bg-[#1e293b] text-[#94a3b8]",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="pmdt-tx-data-panel"><h3>{title}</h3>{children}</section>;
}

function TxDualColumns() {
  return (
    <colgroup>
      <col className="pmdt-tx-label-column" />
      <col className="pmdt-tx-value-column" />
      <col className="pmdt-tx-spacer-column" />
      <col className="pmdt-tx-value-column" />
      <col className="pmdt-tx-unit-column" />
    </colgroup>
  );
}

function Readout({ children }: { children: React.ReactNode }) {
  return <span className="pmdt-tx-readout">{children}</span>;
}

function KeyerObservationControls({ id }: { id: DvorTransmitterId }) {
  const observation = useVorPmdtStore(state => state.keyerObservations?.[id]);
  const observe = useVorPmdtStore(state => state.setKeyerObservation);
  const signal = observation?.externalSignal;
  const received = signal && signal.state !== "lost" ? signal : undefined;
  const [code, setCode] = useState(received?.decodedIdentCode ?? "");
  const [invalid, setInvalid] = useState(false);
  const label = id.toUpperCase();
  const update = (next: DvorKeyerObservations[DvorTransmitterId]) => observe(id, next);
  return <fieldset className="p-2"><legend>{label} instructor observation (digital only)</legend>
    <label>External signal <select aria-label={`${label} observed external signal`} value={signal?.state ?? "unspecified"}
      onChange={event => {
        const state = event.currentTarget.value;
        update({ ...observation, externalSignal: state === "unspecified" ? undefined
          : state === "lost" ? { state: "lost" }
            : { state: state as "present" | "resumed", level: received?.level ?? "high/open",
              ...(received?.decodedIdentCode ? { decodedIdentCode: received.decodedIdentCode } : {}) } });
      }}>
      {["unspecified", "present", "lost", "resumed"].map(value => <option key={value}>{value}</option>)}
    </select></label>
    <label>Contact <select aria-label={`${label} observed contact`} value={received?.level ?? "high/open"} disabled={!received}
      onChange={event => received && update({ ...observation, externalSignal: { ...received, level: event.currentTarget.value as "high/open" | "low/closed" } })}>
      <option>high/open</option><option>low/closed</option>
    </select></label>
    <label>Decoded ident <input aria-label={`${label} observed decoded ident`} value={code} maxLength={4} disabled={!received}
      aria-invalid={invalid} onChange={event => {
        const value = event.currentTarget.value;
        setCode(value);
        const valid = value === "" || /^[A-Za-z0-9]{2,4}$/.test(value);
        setInvalid(!valid);
        if (valid && received) update({ ...observation, externalSignal: { ...received, decodedIdentCode: value || undefined } });
      }} /></label>
    <label>Shutdown cause <select aria-label={`${label} observed shutdown cause`} value={observation?.shutdownCause ?? "unspecified"}
      onChange={event => update({ ...observation, shutdownCause: event.currentTarget.value === "unspecified" ? undefined : event.currentTarget.value as "keying-loss" | "other" })}>
      <option>unspecified</option><option>keying-loss</option><option>other</option>
    </select></label>
  </fieldset>;
}

export function TxDataMain() {
  const data = useVorPmdtStore((state) => state.data);
  const keyers = useVorPmdtStore((state) => state.derived.keyers);
  const scenarioRunId = useVorPmdtStore((state) => state.scenario.runId);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const instructor = useVorPmdtStore(state => state.scenarioAuthoringEnabled && state.mode !== "student");

  return (
    <div className="pmdt-tx-data">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <Panel title="Power">
        <table className="pmdt-tx-dual-table w-full text-left text-[11px]">
          <TxDualColumns />
          <thead><tr><th /><th>Tx #1</th><th /><th>Tx #2</th><th /></tr></thead>
          <tbody>{data.txPower.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]"><th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>{(["tx1", "tx2"] as const).map((tx, txIndex) => {
            const fieldId = `txPower.${index}.${tx}`;
            const value = resolveVorField(row[tx], fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            return (
              <Fragment key={tx}>
                <td
                  data-vor-field-id={fieldId}
                  data-vor-field-value={row[tx]}
                  data-vor-field-type="number"
                  data-vor-field-label={`${row.parameter} Tx ${tx === "tx1" ? "1" : "2"}`}
                  className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                >
                  <Readout>{Number(value).toFixed(index === 0 ? 1 : 3)}</Readout>
                </td>
                {txIndex === 0 ? <td className="pmdt-tx-spacer-cell" /> : null}
              </Fragment>
            );
          })}<td className="pmdt-tx-unit-cell">{row.unit}</td></tr>)}</tbody>
        </table>
      </Panel>

      <Panel title="Frequency">
        <table className="pmdt-tx-dual-table w-full text-left text-[11px]">
          <TxDualColumns />
          <thead><tr><th /><th>Tx #1</th><th /><th>Tx #2</th><th /></tr></thead>
          <tbody>{data.txFrequency.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]"><th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>{(["value1", "value2"] as const).map((key, valueIndex) => {
            const fieldId = `txFrequency.${index}.${key}`;
            const value = resolveVorField(row[key], fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            const digits = index < 3 ? 4 : index < 5 ? 2 : 0;
            return (
              <Fragment key={key}>
                <td
                  data-vor-field-id={fieldId}
                  data-vor-field-value={row[key] ?? ""}
                  data-vor-field-type="number"
                  data-vor-field-label={`${row.parameter} ${key === "value1" ? "Value 1" : "Value 2"}`}
                  className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                >
                  {value === null ? null : <Readout>{Number(value).toFixed(digits)}</Readout>}
                </td>
                {valueIndex === 0 ? <td className="pmdt-tx-spacer-cell" /> : null}
              </Fragment>
            );
          })}<td className="pmdt-tx-unit-cell">{row.unit}</td></tr>)}</tbody>
        </table>
      </Panel>

      <Panel title="VSWR">
        <table className="pmdt-tx-dual-table w-full text-left text-[11px]">
          <TxDualColumns />
          <tbody>{data.txVswr.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]">
            <th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
            {(["value1", "value2"] as const).map((key, valueIndex) => {
              const fieldId = `txVswr.${index}.${key}`;
              const value = resolveVorField(row[key], fieldId, overrides);
              const status = resolveVorStatus("green", fieldId, overrides);
              return (
                <Fragment key={key}>
                  <td
                    data-vor-field-id={fieldId}
                    data-vor-field-value={row[key] ?? ""}
                    data-vor-field-type="number"
                    data-vor-field-label={`${row.parameter} VSWR Tx ${valueIndex + 1}`}
                    className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                  >
                    {value === null ? null : <Readout>{Number(value).toFixed(2)}</Readout>}
                  </td>
                  {valueIndex === 0 ? <td className="pmdt-tx-spacer-cell" /> : null}
                </Fragment>
              );
            })}
            <td className="pmdt-tx-unit-cell">: 1</td>
          </tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Identification / Keyer">
        <table className="w-full text-left text-[11px]">
          <thead><tr><th>Digital state / request</th><th>TX1</th><th>TX2</th></tr></thead>
          <tbody>{([
            ["selectedIdentCode", "Selected self ident"], ["effectiveIdentCode", "Effective ident"],
            ["identStatus", "Ident status"], ["identSource", "Ident source"],
            ["externalSignalStatus", "Observed external signal"], ["inputAsserted", "Input asserted"],
            ["inputInterpretation", "Input interpretation"], ["selfKeyRequested", "Self-key requested"],
            ["shutdownRequested", "Shutdown requested"], ["restartRequested", "Restart requested (not RF restart)"],
            ["lossActionConflict", "Conflicting loss actions"],
          ] as const).map(([field, label]) => <tr key={field}>
            <th scope="row">{label}</th>{(["tx1", "tx2"] as const).map(id => <td key={id}
              data-vor-field-id={`keyerData.${id}.${field}`}>{String(keyers[id][field] ?? "unspecified")}</td>)}
          </tr>)}{(["mode", "available", "suppressed"] as const).map(field => <tr key={field}>
            <th scope="row">External output {field === "available" ? "permitted (not measured contact)" : field}</th>
            {(["tx1", "tx2"] as const).map(id => <td key={id} data-vor-field-id={`keyerData.${id}.externalOutput.${field}`}>
              {String(keyers[id].externalOutput[field])}</td>)}
          </tr>)}</tbody>
        </table>
        {instructor ? <details><summary>Instructor keyer stimulus</summary>
          {(["tx1", "tx2"] as const).map(id => <KeyerObservationControls key={`${scenarioRunId ?? "free"}:${id}`} id={id} />)}
        </details> : null}
      </Panel>
    </div>
  );
}
