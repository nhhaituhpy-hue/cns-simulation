"use client";

import { resolveVorField, resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { VorIndicatorColor } from "@/lib/vor-types";
import { PmdtToolbar } from "../pmdt-toolbar";
import { useState } from "react";

const accentClasses: Record<VorIndicatorColor, string> = {
  green: "accent-[#22c55e]",
  yellow: "accent-[#eab308]",
  red: "accent-[#ef4444]",
  gray: "accent-[#475569]",
};

// ReadOnly or editable input helper
function ConfigInput({
  fieldId,
  value,
  type = "text",
  className = "",
}: {
  fieldId: string;
  value: string | number | boolean;
  type?: string;
  className?: string;
}) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  const resolved = resolveVorField(value, fieldId, overrides);

  if (type === "checkbox") {
    const status = resolveVorStatus(resolved ? "green" : "gray", fieldId, overrides);
    return (
      <input
        type="checkbox"
        data-vor-field-id={fieldId}
        data-vor-field-value={Boolean(value)}
        data-vor-field-type="boolean"
        data-vor-field-label={fieldId}
        readOnly
        checked={Boolean(resolved)}
        className={`size-3.5 pointer-events-none ${accentClasses[status]}`}
      />
    );
  }

  return (
    <input
      type={type}
      data-vor-field-id={fieldId}
      readOnly
      value={String(resolved)}
      className={`h-7 border border-[#475569] bg-[#0f172a] px-2 font-mono text-[11px] text-[#e2e8f0] outline-none ${className}`}
    />
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#334155] bg-[#111827] p-2.5">
      <h4 className="mb-2 text-[11px] font-semibold text-[#e2e8f0] border-b border-[#2d3a4f] pb-1">{title}</h4>
      {children}
    </div>
  );
}

function RmsConfigGeneralTab() {
  const data = useVorPmdtStore((state) => state.data.rmsConfigGeneral);

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-2 text-[11px]">
      <div className="flex flex-col gap-3">
        <SectionBox title="Monitor/LCU Configuration">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <ConfigInput fieldId="rmsConfigGeneral.monitorIntegrityTestsEnabled" value={data.monitorIntegrityTestsEnabled} type="checkbox" />
              Monitor Integrity Tests Enabled
            </label>
            <div className="flex items-center gap-4">
              <span>Voting Logic:</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.votingLogic === "OR"} className="accent-[#22c55e]" /> OR
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.votingLogic === "AND"} className="accent-[#22c55e]" /> AND
              </label>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span>Transfer:</span>
              <ConfigInput fieldId="rmsConfigGeneral.transfer" value={data.transfer} className="w-40" />
            </div>
          </div>
        </SectionBox>

        <SectionBox title="Automatic Restarts">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <ConfigInput fieldId="rmsConfigGeneral.automaticRestartsEnabled" value={data.automaticRestartsEnabled} type="checkbox" />
              Automatic Restarts Enabled
            </label>
            <div className="grid grid-cols-[1fr_5rem] items-center gap-2">
              <span>First Restart Delay (seconds)</span>
              <ConfigInput fieldId="rmsConfigGeneral.firstRestartDelay" value={data.firstRestartDelay} type="number" className="text-right" />
            </div>
            <div className="grid grid-cols-[1fr_5rem] items-center gap-2">
              <span>Number of Automatic Restarts</span>
              <ConfigInput fieldId="rmsConfigGeneral.numberOfAutomaticRestarts" value={data.numberOfAutomaticRestarts} type="number" className="text-right" />
            </div>
          </div>
        </SectionBox>

        <SectionBox title="RCSU Configuration">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <ConfigInput fieldId="rmsConfigGeneral.rcsuPresent" value={data.rcsuPresent} type="checkbox" />
              RCSU Present
            </label>
            <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
              <span>Connection Type</span>
              <ConfigInput fieldId="rmsConfigGeneral.rcsuConnectionType" value={data.rcsuConnectionType} />
            </div>
          </div>
        </SectionBox>

        <div className="grid grid-cols-2 gap-3">
          <SectionBox title="SPI Filter">
            <div className="grid grid-cols-[3rem_1fr] items-center gap-1.5">
              <span>Type</span>
              <ConfigInput fieldId="rmsConfigGeneral.spiFilterType" value={data.spiFilterType} />
            </div>
          </SectionBox>
          <SectionBox title="Co-located DME/TACAN">
            <div className="grid grid-cols-[3rem_1fr] items-center gap-1.5">
              <span>Type</span>
              <ConfigInput fieldId="rmsConfigGeneral.coLocatedType" value={data.coLocatedType} />
            </div>
          </SectionBox>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionBox title="Digital I/O Configuration">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1.5fr_1fr] gap-2">
              <label className="flex items-center gap-1.5">
                <ConfigInput fieldId="rmsConfigGeneral.smokeAlarmInstalled" value={data.smokeAlarmInstalled} type="checkbox" />
                Smoke Alarm Installed
              </label>
              <label className="flex items-center gap-1.5 opacity-80">
                <ConfigInput fieldId="rmsConfigGeneral.remoteResetEnabledSmoke" value={data.remoteResetEnabledSmoke} type="checkbox" />
                Remote Reset
              </label>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr] gap-2">
              <label className="flex items-center gap-1.5">
                <ConfigInput fieldId="rmsConfigGeneral.intrusionAlarmInstalled" value={data.intrusionAlarmInstalled} type="checkbox" />
                Intrusion Alarm Installed
              </label>
              <label className="flex items-center gap-1.5 opacity-80">
                <ConfigInput fieldId="rmsConfigGeneral.remoteResetEnabledIntrusion" value={data.remoteResetEnabledIntrusion} type="checkbox" />
                Remote Reset
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="grid grid-cols-[1fr_3.5rem] items-center gap-1">
                <span>Exit Delay</span>
                <ConfigInput fieldId="rmsConfigGeneral.exitDelay" value={data.exitDelay} type="number" className="text-right" />
              </div>
              <div className="grid grid-cols-[1fr_3.5rem] items-center gap-1">
                <span>Entry Delay</span>
                <ConfigInput fieldId="rmsConfigGeneral.entryDelay" value={data.entryDelay} type="number" className="text-right" />
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1 border-t border-[#2d3a4f] pt-2">
              {data.spareInputs.map((val, idx) => (
                <div key={idx} className="grid grid-cols-[7rem_1fr] items-center gap-2">
                  <span>Spare Input #{idx + 1}</span>
                  <ConfigInput fieldId={`rmsConfigGeneral.spareInputs.${idx}`} value={val} />
                </div>
              ))}
            </div>
          </div>
        </SectionBox>

        <SectionBox title="RMM Configuration">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
              <span>Connection Type</span>
              <ConfigInput fieldId="rmsConfigGeneral.rmmConnectionType" value={data.rmmConnectionType} />
            </div>
            <div className="grid grid-cols-[7rem_4rem] items-center gap-2">
              <span>Dial In # Rings</span>
              <ConfigInput fieldId="rmsConfigGeneral.dialInRings" value={data.dialInRings} type="number" className="text-right" />
            </div>
            <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
              <span>Dial Out Status</span>
              <ConfigInput fieldId="rmsConfigGeneral.dialOutOnStatusChange" value={data.dialOutOnStatusChange} />
            </div>
            <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
              <span>Dial Out Phone</span>
              <ConfigInput fieldId="rmsConfigGeneral.dialOutPhoneNumber" value={data.dialOutPhoneNumber} />
            </div>
            <label className="flex items-center gap-2 mt-1">
              <ConfigInput fieldId="rmsConfigGeneral.toneDialOut" value={data.toneDialOut} type="checkbox" />
              Tone Dial Out
            </label>
          </div>
        </SectionBox>
      </div>
    </div>
  );
}

function RmsConfigStationTab() {
  const data = useVorPmdtStore((state) => state.data.rmsConfigStation);

  return (
    <div className="grid gap-4 p-3 text-[11px]">
      <div className="grid gap-4 md:grid-cols-2">
        <SectionBox title="User Configuration">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.stationType === "CVOR"} className="accent-[#22c55e]" /> CVOR
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.stationType === "DVOR"} className="accent-[#22c55e]" /> DVOR
              </label>
            </div>
            <div className="flex items-center gap-6 border-t border-[#2d3a4f] pt-2">
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.transmitterConfig === "Dual Transmitters"} className="accent-[#22c55e]" /> Dual Transmitters
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.transmitterConfig === "Single Transmitter"} className="accent-[#22c55e]" /> Single Transmitter
              </label>
            </div>
            <div className="flex items-center gap-6 border-t border-[#2d3a4f] pt-2">
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.monitorConfig === "Dual Monitors"} className="accent-[#22c55e]" /> Dual Monitors
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" disabled checked={data.monitorConfig === "Single Monitor"} className="accent-[#22c55e]" /> Single Monitor
              </label>
            </div>
            <div className="grid grid-cols-[10rem_1fr] items-center gap-2 border-t border-[#2d3a4f] pt-2">
              <span>Transmitter Frequency:</span>
              <ConfigInput fieldId="rmsConfigStation.transmitterFrequency" value={data.transmitterFrequency} />
            </div>
            <button type="button" className="mt-2 h-7 border border-[#475569] bg-[#1e293b] text-[#cbd5e1] hover:text-white cursor-pointer transition-colors">
              Display DIP Switch Settings
            </button>
          </div>
        </SectionBox>

        <SectionBox title="System Components Reference">
          <div className="grid grid-cols-[5rem_1fr_1fr_1fr] gap-x-2 gap-y-1.5 text-center text-[10px]">
            <span />
            <span className="font-semibold text-gray-400">Equip Type</span>
            <span className="font-semibold text-gray-400">Mode</span>
            <span className="font-semibold text-gray-400">Frequency</span>

            <span className="text-left font-medium">RMS</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">DVOR</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">Dual Equip</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">117.0 MHz</span>

            <span className="text-left font-medium">Monitor 1</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">DVOR</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">Dual Equip</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">117.0 MHz</span>

            <span className="text-left font-medium">Monitor 2</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">DVOR</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">Dual Equip</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">117.0 MHz</span>

            <span className="text-left font-medium">AGen 1</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">DVOR</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">Dual Equip</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">117.0 MHz</span>

            <span className="text-left font-medium">AGen 2</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">DVOR</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">Dual Equip</span>
            <span className="bg-[#0f172a] py-1 border border-[#273449]">117.0 MHz</span>
          </div>
        </SectionBox>
      </div>

      <div className="flex items-center gap-3 border border-[#334155] bg-[#111827] p-2.5">
        <span>Station Description:</span>
        <ConfigInput fieldId="rmsConfigStation.stationDescription" value={data.stationDescription} className="flex-1 max-w-md" />
      </div>
    </div>
  );
}

function RmsConfigPowerLimitsTab() {
  const data = useVorPmdtStore((state) => state.data);

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-2 text-[11px]">
      <section className="border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Voltages Limits Configuration</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-1.5">Parameter</th>
                <th className="px-2 py-1.5 text-center">Low</th>
                <th className="px-2 py-1.5 text-center">Pre-Low</th>
                <th className="px-2 py-1.5 text-center">Pre-High</th>
                <th className="px-2 py-1.5 text-center">High</th>
              </tr>
            </thead>
            <tbody>
              {data.rmsVoltageData.map((row, index) => {
                const prefix = `rmsVoltageData.${index}`;
                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-1.5 font-medium">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" disabled checked className="accent-[#22c55e] disabled:opacity-80" />
                        {row.parameter}
                      </label>
                    </th>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.low`} value={row.low} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preLow`} value={row.preLow} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preHigh`} value={row.preHigh} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.high`} value={row.high} className="w-full text-right" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Currents Limits Configuration</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-1.5">Parameter</th>
                <th className="px-2 py-1.5 text-center">Low</th>
                <th className="px-2 py-1.5 text-center">Pre-Low</th>
                <th className="px-2 py-1.5 text-center">Pre-High</th>
                <th className="px-2 py-1.5 text-center">High</th>
              </tr>
            </thead>
            <tbody>
              {data.rmsCurrentData.map((row, index) => {
                const prefix = `rmsCurrentData.${index}`;
                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-1.5 font-medium">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" disabled checked className="accent-[#22c55e] disabled:opacity-80" />
                        {row.parameter}
                      </label>
                    </th>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.low`} value={row.low} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preLow`} value={row.preLow} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preHigh`} value={row.preHigh} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.high`} value={row.high} className="w-full text-right" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RmsConfigAdLimitsTab() {
  const data = useVorPmdtStore((state) => state.data);

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-2 text-[11px]">
      <section className="border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Spare A/D Limits Configuration</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-1.5">Parameter</th>
                <th className="px-2 py-1.5 text-center">Low</th>
                <th className="px-2 py-1.5 text-center">Pre-Low</th>
                <th className="px-2 py-1.5 text-center">Pre-High</th>
                <th className="px-2 py-1.5 text-center">High</th>
              </tr>
            </thead>
            <tbody>
              {data.rmsAdData.map((row, index) => {
                const prefix = `rmsAdData.${index}`;
                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-1.5 font-medium">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" disabled checked className="accent-[#22c55e] disabled:opacity-80" />
                        {row.parameter}
                      </label>
                    </th>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.low`} value={row.low} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preLow`} value={row.preLow} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preHigh`} value={row.preHigh} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.high`} value={row.high} className="w-full text-right" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Temperature Limits Configuration</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-1.5">Parameter</th>
                <th className="px-2 py-1.5 text-center">Low</th>
                <th className="px-2 py-1.5 text-center">Pre-Low</th>
                <th className="px-2 py-1.5 text-center">Pre-High</th>
                <th className="px-2 py-1.5 text-center">High</th>
              </tr>
            </thead>
            <tbody>
              {data.rmsTemperatureData.map((row, index) => {
                const prefix = `rmsTemperatureData.${index}`;
                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-1.5 font-medium">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" disabled checked={row.low !== null} className="accent-[#22c55e] disabled:opacity-80" />
                        {row.parameter}
                      </label>
                    </th>
                    <td className="p-0.5">
                      <ConfigInput
                        fieldId={`${prefix}.low`}
                        value={row.low === null ? "" : row.low}
                        className="w-full text-right disabled:opacity-30"
                      />
                    </td>
                    <td className="p-0.5">
                      <ConfigInput
                        fieldId={`${prefix}.preLow`}
                        value={row.preLow === null ? "" : row.preLow}
                        className="w-full text-right disabled:opacity-30"
                      />
                    </td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.preHigh`} value={row.preHigh} className="w-full text-right" /></td>
                    <td className="p-0.5"><ConfigInput fieldId={`${prefix}.high`} value={row.high} className="w-full text-right" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function RmsConfigLayout() {
  const [activeTab, setActiveTab] = useState<"general" | "station" | "power" | "ad">("general");
  const openView = useVorPmdtStore((state) => state.openView);

  const tabs = [
    { id: "general", label: "General", viewId: "rms-config-general", menuLabel: "General" },
    { id: "station", label: "Station", viewId: "rms-config-station", menuLabel: "Station" },
    { id: "power", label: "Power Supply Limits", viewId: "rms-config-power-limits", menuLabel: "Power Supply Limits" },
    { id: "ad", label: "A/D Limits", viewId: "rms-config-ad-limits", menuLabel: "A/D Limits" },
  ] as const;

  return (
    <section className="flex min-h-full flex-col" aria-label="RMS Configuration">
      <PmdtToolbar title="RMS Configuration" />
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="RMS Configuration tabs">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveTab(tab.id);
                openView("rms-config", tab.viewId, ["RMS", "Configuration", tab.menuLabel], tab.menuLabel);
              }}
              className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium transition-colors ${
                active
                  ? "border-[#475569] bg-[#1e293b] text-white"
                  : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#0a0e1a]">
        {activeTab === "station" && <RmsConfigStationTab />}
        {activeTab === "power" && <RmsConfigPowerLimitsTab />}
        {activeTab === "ad" && <RmsConfigAdLimitsTab />}
        {activeTab === "general" && <RmsConfigGeneralTab />}
      </div>
    </section>
  );
}
