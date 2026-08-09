"use client";

import { Fragment } from "react";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { DmeIndicator, dmeFieldMetadata } from "./screen-primitives";

function formatVoltage(value: number, rowIndex: number) {
  return Number(value).toFixed(rowIndex < 8 ? 2 : 1);
}

function PowerSpacerRow({ columns }: { columns: number }) {
  return (
    <tr className="dme-pmdt-power-spacer" aria-hidden>
      <td colSpan={columns} />
    </tr>
  );
}

export function RmsPowerSupply() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const bcps1Fault = resolveDmeField(data.bcpsCommFaults.bcps1, "bcpsCommFaults.bcps1", overrides);
  const bcps2Fault = resolveDmeField(data.bcpsCommFaults.bcps2, "bcpsCommFaults.bcps2", overrides);

  return (
    <div className="dme-pmdt-power-supply">
      <div className="dme-pmdt-power-tables">
        <table className="dme-pmdt-voltage-table">
          <caption className="sr-only">RMS power supply voltages</caption>
          <thead>
            <tr><th /><th>Low</th><th>Pre-Low</th><th>Volts</th><th>Pre-High</th><th>High</th></tr>
          </thead>
          <tbody>
            {data.rmsVoltageData.map((voltage, voltageIndex) => {
              const voltagePrefix = `rmsVoltageData.${voltageIndex}`;
              const volts = resolveDmeField(voltage.volts, `${voltagePrefix}.volts`, overrides);
              const row = (
                <tr key={voltage.parameter}>
                  <th scope="row">{voltage.parameter}</th>
                  <td>{formatVoltage(resolveDmeField(voltage.low, `${voltagePrefix}.low`, overrides), voltageIndex)}</td>
                  <td>{formatVoltage(resolveDmeField(voltage.preLow, `${voltagePrefix}.preLow`, overrides), voltageIndex)}</td>
                  <td {...dmeFieldMetadata(`${voltagePrefix}.volts`, `${voltage.parameter} Volts`, volts)}><span className="dme-pmdt-data-readout">{formatVoltage(volts, voltageIndex)}</span></td>
                  <td>{formatVoltage(resolveDmeField(voltage.preHigh, `${voltagePrefix}.preHigh`, overrides), voltageIndex)}</td>
                  <td>{formatVoltage(resolveDmeField(voltage.high, `${voltagePrefix}.high`, overrides), voltageIndex)}</td>
                </tr>
              );
              return voltage.parameter === "Tx 1 48 V PS" || voltage.parameter === "Tx 2 48 V PS" ? (
                <Fragment key={voltage.parameter}>
                  {row}
                  <PowerSpacerRow columns={6} />
                </Fragment>
              ) : row;
            })}
          </tbody>
        </table>

        <table className="dme-pmdt-current-table">
          <caption className="sr-only">RMS power supply currents</caption>
          <thead>
            <tr><th>Low</th><th>Pre-Low</th><th>Amps</th><th>Pre-High</th><th>High</th></tr>
          </thead>
          <tbody>
            {data.rmsCurrentData.map((current, currentIndex) => {
              const currentPrefix = `rmsCurrentData.${currentIndex}`;
              const amps = resolveDmeField(current.amps, `${currentPrefix}.amps`, overrides);
              const row = (
                <tr key={current.parameter}>
                  <td>{Number(resolveDmeField(current.low, `${currentPrefix}.low`, overrides)).toFixed(1)}</td>
                  <td>{Number(resolveDmeField(current.preLow, `${currentPrefix}.preLow`, overrides)).toFixed(1)}</td>
                  <td {...dmeFieldMetadata(`${currentPrefix}.amps`, `${current.parameter} Amps`, amps)}><span className="dme-pmdt-data-readout">{Number(amps).toFixed(1)}</span></td>
                  <td>{Number(resolveDmeField(current.preHigh, `${currentPrefix}.preHigh`, overrides)).toFixed(1)}</td>
                  <td>{Number(resolveDmeField(current.high, `${currentPrefix}.high`, overrides)).toFixed(1)}</td>
                </tr>
              );
              return current.parameter === "Tx 1 48 V PS" || current.parameter === "Tx 2 48 V PS" ? (
                <Fragment key={current.parameter}>
                  {row}
                  <PowerSpacerRow columns={5} />
                </Fragment>
              ) : row;
            })}
          </tbody>
        </table>
      </div>
      <div className="dme-pmdt-bcps-status">
        <div><span>BCPS 1 Comm Fault</span><DmeIndicator color={resolveDmeStatus(bcps1Fault ? "red" : "green", "bcpsCommFaults.bcps1", overrides)} /></div>
        <div><span>BCPS 2 Comm Fault</span><DmeIndicator color={resolveDmeStatus(bcps2Fault ? "red" : "green", "bcpsCommFaults.bcps2", overrides)} /></div>
        <div><span>BCPS 1 Charger</span><DmeIndicator color={data.bcpsChargerEnabled.bcps1 ? "green" : "gray"} /></div>
        <div><span>BCPS 2 Charger</span><DmeIndicator color={data.bcpsChargerEnabled.bcps2 ? "green" : "gray"} /></div>
      </div>
    </div>
  );
}
