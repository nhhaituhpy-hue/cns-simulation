"use client";

import { useState } from "react";
import { resolveDmeField, resolveDmeStatus, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import type { DmeAccountSecurityLevel, DmeIndicatorColor } from "@/lib/dme-types";
import { dmeParameterFieldCatalog, formatDmeFrequency, getDmeParameterValue, getDmeStationChannelAllocation } from "@/lib/dme1119a";
import { PmdtToolbar } from "../pmdt-toolbar";

const accentClasses: Record<DmeIndicatorColor, string> = {
  green: "accent-[#22c55e]",
  yellow: "accent-[#eab308]",
  red: "accent-[#ef4444]",
  gray: "accent-[#475569]",
};

function configInputId(fieldId: string): string {
  return `dme-rms-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

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
  const overrides = useDmePmdtStore((state) => state.overrides);
  const configDraft = useDmePmdtStore((state) => state.configDraft);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const draftValue = getDmeParameterValue(configDraft, fieldId);
  const resolved = resolveDmeField((draftValue ?? value) as typeof value, fieldId, overrides);
  const fieldDefinition = dmeParameterFieldCatalog.find((field) => field.id === fieldId);
  const canEdit = securityLevel >= 3 && !loginDialogOpen && local && !fieldDefinition?.readOnly && !fieldId.startsWith("channelAllocation.");
  const inputId = configInputId(fieldId);

  function update(rawValue: string | boolean) {
    if (!canEdit) return;
    const nextValue = type === "checkbox" ? Boolean(rawValue) : type === "number" ? Number(rawValue) : String(rawValue);
    if (type === "number" && !Number.isFinite(nextValue as number)) return;
    setParameterValue(fieldId, nextValue);
  }

  if (type === "checkbox") {
    const status = resolveDmeStatus(resolved ? "green" : "gray", fieldId, overrides);
    return (
      <input
        id={inputId}
        name={fieldId}
        type="checkbox"
        data-dme-field-id={fieldId}
        data-dme-field-value={Boolean(resolved)}
        data-dme-field-type="boolean"
        data-dme-field-label={fieldId}
        disabled={!canEdit}
        checked={Boolean(resolved)}
        onChange={(event) => update(event.currentTarget.checked)}
        className={`size-3.5 ${accentClasses[status]}`}
      />
    );
  }

  if (fieldDefinition?.type === "select") {
    return (
      <select
        id={inputId}
        name={fieldId}
        data-dme-field-id={fieldId}
        data-dme-field-value={String(resolved)}
        data-dme-field-type="string"
        data-dme-field-label={fieldId}
        disabled={!canEdit}
        value={String(resolved)}
        onChange={(event) => update(event.currentTarget.value)}
        className={`h-7 border border-[#475569] bg-[#0f172a] px-2 font-mono text-[11px] text-[#e2e8f0] outline-none ${className}`}
      >
        {fieldDefinition.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <input
      id={inputId}
      name={fieldId}
      type={type === "number" && canEdit ? "number" : "text"}
      data-dme-field-id={fieldId}
      readOnly={!canEdit}
      value={String(resolved)}
      onChange={(event) => update(event.currentTarget.value)}
      className={`h-7 border border-[#475569] bg-[#0f172a] px-2 font-mono text-[11px] text-[#e2e8f0] outline-none ${className}`}
    />
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dme-pmdt-rms-section-box border border-[#334155] bg-[#111827] p-2.5">
      <h4 className="dme-pmdt-rms-section-title mb-2 text-[11px] font-semibold text-[#e2e8f0] border-b border-[#2d3a4f] pb-1">{title}</h4>
      {children}
    </div>
  );
}

function DmeConfigGeneralTab() {
  const data = useDmePmdtStore((state) => state.configDraft.rmsConfigGeneral);

  return (
    <div className="dme-pmdt-rms-config-general text-[11px]">
      <div className="flex flex-col gap-3">
        <SectionBox title="Monitor/LCU Configuration">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <ConfigInput fieldId="rmsConfigGeneral.monitorIntegrityTestsEnabled" value={data.monitorIntegrityTestsEnabled} type="checkbox" />
              Monitor Integrity Tests Enabled
            </label>
            <div className="flex items-center gap-4">
              <span>Voting Logic:</span>
              <ConfigInput fieldId="rmsConfigGeneral.votingLogic" value={data.votingLogic} className="min-w-20" />
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
            <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
              <span>Interlock Control</span>
              <ConfigInput fieldId="rmsConfigGeneral.interlockControl" value={data.interlockControl} />
            </div>
          </div>
        </SectionBox>
      </div>

      <div className="flex flex-col gap-3">
        <SectionBox title="Digital I/O Configuration">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1.5fr_1fr] gap-2">
              <label className="flex items-center gap-1.5">
                <ConfigInput fieldId="rmsConfigGeneral.smokeAlarmInstalled" value={data.smokeAlarmInstalled} type="checkbox" />
                Smoke Alarm Installed
              </label>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr] gap-2">
              <label className="flex items-center gap-1.5">
                <ConfigInput fieldId="rmsConfigGeneral.intrusionAlarmInstalled" value={data.intrusionAlarmInstalled} type="checkbox" />
                Intrusion Alarm Installed
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

function DmeConfigStationTab() {
  const station = useDmePmdtStore((state) => state.configDraft.rmsConfigStation);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const canEdit = securityLevel >= 3 && !loginDialogOpen && local;
  const [dipSwitchOpen, setDipSwitchOpen] = useState(false);
  const allocation = getDmeStationChannelAllocation(station);
  const powerReference = station.powerLevel === "High Power" ? "High" : "Low";
  const paReference = station.powerLevel === "High Power" ? "LPA + HPA" : "LPA";
  const transmitterReference = station.transmitterConfig === "Dual Transmitters" ? "Dual" : "Single";
  const monitorReference = station.monitorConfig === "Dual Monitors" ? "Dual" : "Single";
  const referenceColumns = ["RMS", "Monitor 1", "Monitor 2", "RTC 1", "RTC 2"];
  const referenceRows = [
    Array(5).fill(powerReference),
    [paReference, "", "", paReference, paReference],
    Array(5).fill(transmitterReference),
    Array(5).fill(monitorReference),
    [station.hotStandby ? "Hot Standby" : "Cold Standby", "", "", "", ""],
    Array(5).fill(`${station.channelType} Channel`),
    Array(5).fill(String(station.channelNumber)),
  ];

  return (
    <div className="dme-pmdt-rms-config-station grid gap-4 p-3 text-[11px]">
      <div className="dme-pmdt-station-dates" aria-label="Configuration timestamps">
        {referenceColumns.slice(1, 4).map((component) => <time key={component} dateTime={timestamp}>{timestamp}</time>)}
      </div>

      <div className="dme-pmdt-station-columns grid gap-4 md:grid-cols-2">
        <SectionBox title="User Configuration">
          <div className="dme-pmdt-station-user-config flex flex-col gap-3">
            <div className="dme-pmdt-station-choice-row flex items-center gap-6">
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-power-low" name="rmsConfigStation.powerLevel" type="radio" disabled={!canEdit} checked={station.powerLevel === "Low Power"} onChange={() => setParameterValue("rmsConfigStation.powerLevel", "Low Power")} className="accent-[#22c55e]" /> Low Power
              </label>
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-power-high" name="rmsConfigStation.powerLevel" type="radio" disabled={!canEdit} checked={station.powerLevel === "High Power"} onChange={() => setParameterValue("rmsConfigStation.powerLevel", "High Power")} className="accent-[#22c55e]" /> High Power
              </label>
            </div>
            <label className="dme-pmdt-station-integrated-pa flex items-center gap-1.5">
              <input id="dme-rms-integrated-pa" name="rmsConfigStation.integratedPa" type="checkbox" disabled />
              Integrated PA
            </label>
            <div className="dme-pmdt-station-choice-row flex items-center gap-6 border-t border-[#2d3a4f] pt-2">
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-transmitters-dual" name="rmsConfigStation.transmitterConfig" type="radio" disabled={!canEdit} checked={station.transmitterConfig === "Dual Transmitters"} onChange={() => setParameterValue("rmsConfigStation.transmitterConfig", "Dual Transmitters")} className="accent-[#22c55e]" /> Dual Transmitters
              </label>
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-transmitters-single" name="rmsConfigStation.transmitterConfig" type="radio" disabled={!canEdit} checked={station.transmitterConfig === "Single Transmitter"} onChange={() => setParameterValue("rmsConfigStation.transmitterConfig", "Single Transmitter")} className="accent-[#22c55e]" /> Single Transmitter
              </label>
            </div>
            <div className="dme-pmdt-station-choice-row flex items-center gap-6 border-t border-[#2d3a4f] pt-2">
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-monitors-dual" name="rmsConfigStation.monitorConfig" type="radio" disabled={!canEdit} checked={station.monitorConfig === "Dual Monitors"} onChange={() => setParameterValue("rmsConfigStation.monitorConfig", "Dual Monitors")} className="accent-[#22c55e]" /> Dual Monitors
              </label>
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-monitors-single" name="rmsConfigStation.monitorConfig" type="radio" disabled={!canEdit} checked={station.monitorConfig === "Single Monitor"} onChange={() => setParameterValue("rmsConfigStation.monitorConfig", "Single Monitor")} className="accent-[#22c55e]" /> Single Monitor
              </label>
            </div>
            <label className="dme-pmdt-station-hot-standby flex items-center gap-1.5">
              <ConfigInput fieldId="rmsConfigStation.hotStandby" value={station.hotStandby} type="checkbox" />
              Hot Standby
            </label>
            <div className="dme-pmdt-station-channel-choice flex items-center gap-6 border-t border-[#2d3a4f] pt-2">
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-channel-x" name="rmsConfigStation.channelType" type="radio" disabled={!canEdit} checked={station.channelType === "X"} onChange={() => setParameterValue("rmsConfigStation.channelType", "X")} className="accent-[#22c55e]" /> X Channel
              </label>
              <label className="flex items-center gap-1.5">
                <input id="dme-rms-channel-y" name="rmsConfigStation.channelType" type="radio" disabled={!canEdit} checked={station.channelType === "Y"} onChange={() => setParameterValue("rmsConfigStation.channelType", "Y")} className="accent-[#22c55e]" /> Y Channel
              </label>
            </div>
            <div className="dme-pmdt-station-channel-number grid grid-cols-[10rem_1fr] items-center gap-2">
              <span>Channel Number</span>
              <ConfigInput fieldId="rmsConfigStation.channelNumber" value={station.channelNumber} type="number" />
            </div>
            <div className="dme-pmdt-station-frequency grid grid-cols-[10rem_1fr] items-center gap-2 border-t border-[#2d3a4f] pt-2">
              <span>Transmitter Frequency:</span>
              <ConfigInput
                fieldId="channelAllocation.transmitterReplyFrequencyMHz"
                value={allocation ? `${formatDmeFrequency(allocation.transmitterReplyFrequencyMHz)} MHz` : "Invalid channel"}
              />
            </div>
            <button type="button" onClick={() => setDipSwitchOpen(true)} className="mt-2 h-7 border border-[#475569] bg-[#1e293b] text-[#cbd5e1] hover:text-white cursor-pointer transition-colors">
              Display DIP Switch Settings
            </button>
          </div>
        </SectionBox>

        <SectionBox title="System Components Reference">
          <table className="dme-pmdt-station-reference">
            <thead>
              <tr>{referenceColumns.map((component) => <th key={component} scope="col">{component}</th>)}</tr>
            </thead>
            <tbody>
              {referenceRows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((value, columnIndex) => <td key={referenceColumns[columnIndex]}><span>{value}</span></td>)}</tr>
              ))}
            </tbody>
          </table>
        </SectionBox>
      </div>

      <div className="dme-pmdt-station-description flex items-center gap-3 border border-[#334155] bg-[#111827] p-2.5">
        <span>Station Description:</span>
        <ConfigInput fieldId="rmsConfigStation.stationDescription" value={station.stationDescription} className="flex-1 max-w-md" />
      </div>

      {dipSwitchOpen ? (
        <div className="pmdt-about-overlay" role="presentation">
          <section className="pmdt-about-dialog" role="dialog" aria-modal="true" aria-label="DIP Switch Settings">
            <header className="pmdt-about-titlebar">
              <strong>DIP Switch Settings</strong>
              <button type="button" aria-label="Close DIP Switch Settings" onClick={() => setDipSwitchOpen(false)}>×</button>
            </header>
            <div className="pmdt-about-body text-left text-[11px]">
              <p className="mb-2 text-[#94a3b8]">Set the station backplane switches to match the user configuration before applying the change.</p>
              <table className="w-full border-collapse border border-[#334155]">
                <tbody>
                  <tr><th className="border border-[#334155] px-2 py-1 text-left">S1</th><td className="border border-[#334155] px-2 py-1">{station.powerLevel}; {station.transmitterConfig}</td></tr>
                  <tr><th className="border border-[#334155] px-2 py-1 text-left">S2</th><td className="border border-[#334155] px-2 py-1">{station.monitorConfig}; {station.hotStandby ? "Hot Standby" : "Cold Standby"}</td></tr>
                  <tr><th className="border border-[#334155] px-2 py-1 text-left">S3</th><td className="border border-[#334155] px-2 py-1">Channel {station.channelNumber}{station.channelType}</td></tr>
                </tbody>
              </table>
              <button type="button" className="pmdt-about-ok mt-3" autoFocus onClick={() => setDipSwitchOpen(false)}>OK</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type LimitRow = { parameter: string; enabled: boolean; low: number; preLow: number; preHigh: number; high: number };

function ConfigLimitTable({
  title,
  rows,
  prefix,
  startIndex = 0,
}: {
  title?: string;
  rows: readonly LimitRow[];
  prefix: "rmsVoltageData" | "rmsCurrentData";
  startIndex?: number;
}) {
  return (
    <section className="dme-pmdt-limit-table-wrap">
      {title ? <h3>{title}</h3> : null}
      <table>
        <caption className="sr-only">{title ?? "RMS limits"}</caption>
        <thead>
          <tr><th>Parameter</th><th>Low</th><th>Pre-Low</th><th>Pre-High</th><th>High</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowIndex = startIndex + index;
            const rowPrefix = `${prefix}.${rowIndex}`;
            return (
              <tr key={`${prefix}-${row.parameter}`}>
                <th scope="row">
                  <label><ConfigInput fieldId={`${rowPrefix}.enabled`} value={row.enabled} type="checkbox" />{row.parameter}</label>
                </th>
                <td><ConfigInput fieldId={`${rowPrefix}.low`} value={row.low} type="number" /></td>
                <td><ConfigInput fieldId={`${rowPrefix}.preLow`} value={row.preLow} type="number" /></td>
                <td><ConfigInput fieldId={`${rowPrefix}.preHigh`} value={row.preHigh} type="number" /></td>
                <td><ConfigInput fieldId={`${rowPrefix}.high`} value={row.high} type="number" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function DmeConfigPowerLimitsTab() {
  const data = useDmePmdtStore((state) => state.configDraft);

  return (
    <div className="dme-pmdt-rms-power-limits">
      <ConfigLimitTable title="Volts" rows={data.rmsVoltageData.slice(0, 9)} prefix="rmsVoltageData" />
      <div className="dme-pmdt-rms-power-bottom-grid">
        <ConfigLimitTable title="Volts" rows={data.rmsVoltageData.slice(9)} prefix="rmsVoltageData" startIndex={9} />
        <ConfigLimitTable title="Amps" rows={data.rmsCurrentData} prefix="rmsCurrentData" />
      </div>
    </div>
  );
}

function DmeConfigAdLimitsTab() {
  const data = useDmePmdtStore((state) => state.configDraft);
  const temperatureRows = [
    data.rmsTemperatureData[0],
    data.rmsTemperatureData[1],
    { ...data.rmsTemperatureData[2], parameter: "LPA Disable Temperature" },
    { ...data.rmsTemperatureData[4], parameter: "HPA Disable Temperature" },
    { parameter: "Fan On Temperature", enabled: false, low: null, preLow: null, value: null, preHigh: null, high: 40 },
  ] as const;

  return (
    <div className="dme-pmdt-rms-ad-limits">
      <div className="dme-pmdt-rms-ad-headings" aria-hidden="true">
        <span />
        <span>Low</span>
        <span>Pre-Low</span>
        <span>Pre-High</span>
        <span>High</span>
        <span />
      </div>
      <table>
        <caption className="sr-only">RMS A/D and temperature limits</caption>
        <colgroup>
          <col style={{ width: "151px" }} />
          <col style={{ width: "69px" }} />
          <col style={{ width: "72px" }} />
          <col style={{ width: "72px" }} />
          <col style={{ width: "72px" }} />
          <col style={{ width: "56px" }} />
        </colgroup>
        <tbody>
          {data.rmsAdData.map((row, index) => {
            const prefix = `rmsAdData.${index}`;
            return (
              <tr key={row.parameter}>
                <th scope="row"><label><ConfigInput fieldId={`${prefix}.enabled`} value={row.enabled} type="checkbox" />{row.parameter}</label></th>
                <td><ConfigInput fieldId={`${prefix}.low`} value={row.low} type="number" /></td>
                <td><ConfigInput fieldId={`${prefix}.preLow`} value={row.preLow} type="number" /></td>
                <td><ConfigInput fieldId={`${prefix}.preHigh`} value={row.preHigh ?? ""} type="number" /></td>
                <td><ConfigInput fieldId={`${prefix}.high`} value={row.high} type="number" /></td>
                <td>Volts</td>
              </tr>
            );
          })}
          {temperatureRows.map((row, index) => {
            const sourceIndex = index === 0 ? 0 : index === 1 ? 1 : index === 2 ? 2 : index === 3 ? 4 : null;
            const prefix = sourceIndex === null ? "rmsTemperatureData.fanOn" : `rmsTemperatureData.${sourceIndex}`;
            return (
              <tr key={row.parameter}>
                <th scope="row"><label>{sourceIndex === null ? <input id="dme-rms-temperature-fan-on-enabled" name="rmsTemperatureData.fanOn.enabled" type="checkbox" disabled /> : <ConfigInput fieldId={`${prefix}.enabled`} value={row.enabled} type="checkbox" />}{row.parameter}</label></th>
                <td><ConfigInput fieldId={`${prefix}.low`} value={row.low ?? ""} type="number" /></td>
                <td><ConfigInput fieldId={`${prefix}.preLow`} value={row.preLow ?? ""} type="number" /></td>
                <td><ConfigInput fieldId={`${prefix}.preHigh`} value={row.preHigh ?? ""} type="number" /></td>
                <td><ConfigInput fieldId={`${prefix}.high`} value={row.high} type="number" /></td>
                <td>°C</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DmeSecurityCodesTab() {
  const accounts = useDmePmdtStore((state) => state.configDraft.securityAccounts);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const updateSecurityAccount = useDmePmdtStore((state) => state.updateSecurityAccount);
  const addSecurityAccount = useDmePmdtStore((state) => state.addSecurityAccount);
  const removeSecurityAccount = useDmePmdtStore((state) => state.removeSecurityAccount);
  const canEdit = securityLevel >= 4 && !loginDialogOpen && local;

  return (
    <div className="dme-pmdt-rms-security-codes p-3 text-[11px]">
      <div className="mb-3 border border-[#334155] bg-[#111827] p-2 text-[#94a3b8]">
        Security Codes is available only to Security Level 4 in Local mode. Passwords are staged with Apply (F7) and retained after RMS Config Backup.
      </div>
      <table className="w-full border-collapse border border-[#334155]">
        <caption className="sr-only">RMS security user accounts</caption>
        <thead className="bg-[#1e293b] text-left text-[#e2e8f0]">
          <tr>
            <th scope="col" className="border border-[#334155] px-2 py-1">User ID</th>
            <th scope="col" className="border border-[#334155] px-2 py-1">Password</th>
            <th scope="col" className="border border-[#334155] px-2 py-1">Security Level</th>
            <th scope="col" className="border border-[#334155] px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, index) => (
            <tr key={`${account.userId}-${index}`}>
              <td className="border border-[#334155] p-1">
                <input
                  id={`dme-security-user-${index + 1}`}
                  name={`securityAccounts.${index}.userId`}
                  aria-label={`User ID ${index + 1}`}
                  type="text"
                  value={account.userId}
                  disabled={!canEdit}
                  onChange={(event) => updateSecurityAccount(index, { userId: event.currentTarget.value })}
                  className="h-7 w-full border border-[#475569] bg-[#0f172a] px-2 font-mono text-[#e2e8f0]"
                />
              </td>
              <td className="border border-[#334155] p-1">
                <input
                  id={`dme-security-password-${index + 1}`}
                  name={`securityAccounts.${index}.password`}
                  aria-label={`Password ${index + 1}`}
                  type="password"
                  value={account.password}
                  disabled={!canEdit}
                  onChange={(event) => updateSecurityAccount(index, { password: event.currentTarget.value })}
                  className="h-7 w-full border border-[#475569] bg-[#0f172a] px-2 font-mono text-[#e2e8f0]"
                />
              </td>
              <td className="border border-[#334155] p-1">
                <select
                  id={`dme-security-level-${index + 1}`}
                  name={`securityAccounts.${index}.securityLevel`}
                  aria-label={`Security Level ${index + 1}`}
                  value={account.securityLevel}
                  disabled={!canEdit}
                  onChange={(event) => updateSecurityAccount(index, { securityLevel: Number(event.currentTarget.value) as DmeAccountSecurityLevel })}
                  className="h-7 border border-[#475569] bg-[#0f172a] px-2 text-[#e2e8f0]"
                >
                  {[1, 2, 3, 4].map((level) => <option key={level} value={level}>Level {level}</option>)}
                </select>
              </td>
              <td className="border border-[#334155] p-1">
                <button type="button" disabled={!canEdit} onClick={() => removeSecurityAccount(index)} className="h-7 border border-[#475569] px-2 text-[#cbd5e1] disabled:opacity-50">Clear</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" disabled={!canEdit} onClick={addSecurityAccount} className="mt-3 h-7 border border-[#475569] bg-[#1e293b] px-3 text-[#cbd5e1] disabled:opacity-50">Add User</button>
    </div>
  );
}

export function RmsConfigLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);

  const tabs = [
    { id: "general", label: "General", viewId: "rms-config-general", menuLabel: "General" },
    { id: "station", label: "Station", viewId: "rms-config-station", menuLabel: "Station" },
    { id: "power", label: "Power Supply Limits", viewId: "rms-config-power-limits", menuLabel: "Power Supply Limits" },
    { id: "ad", label: "A/D Limits", viewId: "rms-config-ad-limits", menuLabel: "A/D Limits" },
    ...(securityLevel >= 4 ? [{ id: "security", label: "Security Codes", viewId: "rms-config-security-codes" as const, menuLabel: "Security Codes" }] : []),
  ] as const;

  return (
    <section className="flex min-h-full flex-col" aria-label="RMS Configuration">
      <PmdtToolbar title="RMS Configuration" />
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="RMS Configuration tabs">
        {tabs.map((tab) => {
          const active = tab.viewId === activeView;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
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
      <div className={`dme-pmdt-rms-config-content min-h-0 flex-1 overflow-auto bg-[#0a0e1a] ${activeView === "rms-config-station" ? "dme-pmdt-rms-config-content--station" : ""}`}>
        <time className="dme-pmdt-screen-time">{timestamp}</time>
        {activeView === "rms-config-station" && <DmeConfigStationTab />}
        {activeView === "rms-config-power-limits" && <DmeConfigPowerLimitsTab />}
        {activeView === "rms-config-ad-limits" && <DmeConfigAdLimitsTab />}
        {activeView === "rms-config-security-codes" && securityLevel >= 4 && <DmeSecurityCodesTab />}
        {activeView === "rms-config-general" && <DmeConfigGeneralTab />}
      </div>
    </section>
  );
}
