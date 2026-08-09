"use client";

import type { DmeIndicatorColor, DmeViewId } from "@/lib/dme-types";
import type { DmeDualValueRow } from "@/lib/dme-types";
import { formatDmeFrequency, getDmeStationChannelAllocation } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeIndicator, DmeValueCell, ScreenTabs } from "./screen-primitives";

type DetailTab = "integral" | "standby" | "maintenance" | "status";

const detailProfiles: Record<1 | 2, Record<"integral" | "standby", DmeDualValueRow[]>> = {
  1: {
    integral: [
      ["Delay", "49.99", "normal", "us"], ["Spacing", "11.98", "normal", "us"], ["Tx Power", "1014", "normal", "Watts"], ["ERP", "0.0", "normal", "dB"], ["Efficiency", "100.0", "normal", "%"], ["PRF", "804", "normal", "ppps"], ["Tx Frequency", "1203.996", "gray", "MHz"], ["Tx Frequency Error", "-2", "normal", "ppm"], ["Rx LO Frequency", "1015.988", "gray", "MHz"], ["Rx LO Frequency Error", "-1", "normal", "ppm"], ["Rx Frequency", "1140.988", "gray", "MHz"], ["VSWR", "1.3", "normal", ":1"], ["Ident Status", "Normal", "green", ""], ["Ident Code", "TUH", "green", ""],
    ].map(([label, value, status, unit]) => ({ label, mon1Value: value, mon1Status: status as DmeDualValueRow["mon1Status"], mon2Value: value, mon2Status: status as DmeDualValueRow["mon2Status"], unit })),
    standby: [
      ["Delay", "49.99", "normal", "us"], ["Spacing", "11.99", "normal", "us"], ["Tx Power", "968", "normal", "Watts"], ["Efficiency", "99.5", "normal", "%"], ["PRF", "786", "normal", "ppps"], ["Tx Frequency", "1203.996", "gray", "MHz"], ["Tx Frequency Error", "-2", "normal", "ppm"], ["Rx LO Frequency", "1015.978", "gray", "MHz"], ["Rx LO Frequency Error", "-10", "normal", "ppm"], ["Rx Frequency", "1140.978", "gray", "MHz"], ["Ident Status", "Normal", "green", ""], ["Ident Code", "TUH", "green", ""],
    ].map(([label, value, status, unit]) => ({ label, mon1Value: value, mon1Status: status as DmeDualValueRow["mon1Status"], mon2Value: value, mon2Status: status as DmeDualValueRow["mon2Status"], unit })),
  },
  2: {
    integral: [
      ["Delay", "50.00", "normal", "us"], ["Spacing", "11.98", "normal", "us"], ["Tx Power", "1033", "normal", "Watts"], ["ERP", "0.0", "normal", "dB"], ["Efficiency", "99.5", "normal", "%"], ["PRF", "798", "normal", "ppps"], ["Tx Frequency", "1203.996", "gray", "MHz"], ["Tx Frequency Error", "-2", "normal", "ppm"], ["Rx LO Frequency", "1015.991", "gray", "MHz"], ["Rx LO Frequency Error", "2", "normal", "ppm"], ["Rx Frequency", "1140.991", "gray", "MHz"], ["VSWR", "1.3", "normal", ":1"], ["Ident Status", "Normal", "green", ""], ["Ident Code", "TUH", "green", ""],
    ].map(([label, value, status, unit]) => ({ label, mon1Value: value, mon1Status: status as DmeDualValueRow["mon1Status"], mon2Value: value, mon2Status: status as DmeDualValueRow["mon2Status"], unit })),
    standby: [
      ["Delay", "50.01", "normal", "us"], ["Spacing", "11.99", "normal", "us"], ["Tx Power", "963", "normal", "Watts"], ["Efficiency", "100.0", "normal", "%"], ["PRF", "810", "normal", "ppps"], ["Tx Frequency", "1204.001", "gray", "MHz"], ["Tx Frequency Error", "1", "normal", "ppm"], ["Rx LO Frequency", "1015.982", "gray", "MHz"], ["Rx LO Frequency Error", "-7", "normal", "ppm"], ["Rx Frequency", "1140.982", "gray", "MHz"], ["Ident Status", "Normal", "green", ""], ["Ident Code", "TUH", "green", ""],
    ].map(([label, value, status, unit]) => ({ label, mon1Value: value, mon1Status: status as DmeDualValueRow["mon1Status"], mon2Value: value, mon2Status: status as DmeDualValueRow["mon2Status"], unit })),
  },
};

const detailLimits: Record<string, [string, string, string, string, string]> = {
  Delay: ["49.60", "49.68", "", "50.32", "50.40"],
  Spacing: ["11.60", "11.68", "", "12.32", "12.40"],
  "Tx Power": ["500", "550", "", "1225", "1250"],
  ERP: ["-3.0", "-2.7", "", "0.9", "1.0"],
  Efficiency: ["60.0", "73.0", "", "", ""],
  PRF: ["720", "730", "", "6000", "6000"],
  "Tx Frequency Error": ["-20", "-18", "", "18", "20"],
  "Rx LO Frequency Error": ["-20", "-18", "", "18", "20"],
  VSWR: ["", "", "", "3.0", "4.0"],
};

const maintenanceAlerts = [
  "Monitor ROM Fault",
  "Monitor RAM Fault",
  "Monitor Functional Fault",
  "Monitor EEPROM Fault",
  "RTC Comm Fault",
  "Power Supply Fault",
  "Interrogator Synth Unlock",
  "Interrogator Synth Frequency Error",
  "Special Test Mode Enabled",
  "Monitor Calibration Offsets Disabled",
  "Monitor Reply Attenuator Fault",
  "Monitor Interrogation Level Attenuator Fault",
] as const;

function formatLimit(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatAlarmLimitRow(limit: {
  alarmLow: number | null;
  preAlarmLow: number | null;
  nominal: number;
  preAlarmHigh: number | null;
  alarmHigh: number | null;
}, offsetBased: boolean): [string, string, string, string, string] {
  const nominal = offsetBased ? limit.nominal : 0;
  return [
    formatLimit(limit.alarmLow === null ? null : nominal + limit.alarmLow),
    formatLimit(limit.preAlarmLow === null ? null : nominal + limit.preAlarmLow),
    formatLimit(limit.nominal),
    formatLimit(limit.preAlarmHigh === null ? null : nominal + limit.preAlarmHigh),
    formatLimit(limit.alarmHigh === null ? null : nominal + limit.alarmHigh),
  ];
}

function MonitorMeasurements({
  monitorNumber,
  kind,
}: {
  monitorNumber: 1 | 2;
  kind: "integral" | "standby";
}) {
  const data = useDmePmdtStore((state) => state.data);
  const rows = kind === "integral" ? data.integralData : data.standbyData;
  const prefix = `monitorDetailData.monitor${monitorNumber}.${kind}`;
  const valueKey = monitorNumber === 1 ? "mon1Value" : "mon2Value";
  const statusKey = monitorNumber === 1 ? "mon1Status" : "mon2Status";

  return (
    <div className="dme-pmdt-detail-data">
      <time>{data.timestamp}</time>
      <table>
        <caption className="sr-only">Monitor {monitorNumber} {kind} measurements</caption>
        <thead>
          <tr>
            <th />
            <th>Alarm Low</th>
            <th aria-hidden />
            <th>PreAlarm Low</th>
            <th aria-hidden />
            <th>Data</th>
            <th aria-hidden />
            <th>PreAlarm High</th>
            <th aria-hidden />
            <th>Alarm High</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const limit = detailLimits[row.label] ?? ["", "", "", "", ""];
            const channel = getDmeStationChannelAllocation(data.rmsConfigStation);
            const channelNominal = row.label === "Delay"
              ? channel?.nominalReplyDelayUs
              : row.label === "Spacing"
                ? channel?.transmitterReplyPulseSpacingUs
                : undefined;
            const channelLimits = channelNominal === undefined
              ? limit
              : [
                  (channelNominal - 0.4).toFixed(2),
                  (channelNominal - 0.32).toFixed(2),
                  "",
                  (channelNominal + 0.32).toFixed(2),
                  (channelNominal + 0.4).toFixed(2),
                ];
            const configuredLimit = data.alarmLimits.find((item) => (
              item.parameter === row.label
              || (row.label === "Rx LO Frequency Error" && item.parameter === "Rx Frequency Error")
            ));
            const displayLimits = configuredLimit
              ? formatAlarmLimitRow(configuredLimit, row.label === "Delay" || row.label === "Spacing")
              : channelLimits;
            return (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{displayLimits[0]}</td>
                <td>{displayLimits[1]}</td>
                <td aria-hidden />
                <td>
                  <DmeValueCell
                    fieldId={`${prefix}.${index}.${valueKey}`}
                    label={`${kind} ${row.label} Monitor ${monitorNumber}`}
                    value={row[valueKey]}
                    status={row[statusKey]}
                  />
                </td>
                <td aria-hidden />
                <td>{displayLimits[3]}</td>
                <td aria-hidden />
                <td>{displayLimits[4]}</td>
                <td>{row.unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonitorMaintenanceAlerts({ timestamp }: { timestamp: string }) {
  return (
    <div className="dme-pmdt-detail-alerts">
      <time>{timestamp}</time>
      <div>
        {maintenanceAlerts.map((label) => (
          <div key={label}><DmeIndicator color="gray" /><span>{label}</span></div>
        ))}
      </div>
    </div>
  );
}

function IndicatorRow({
  label,
  active = false,
  activeColor = "green",
}: {
  label: string;
  active?: boolean;
  activeColor?: Exclude<DmeIndicatorColor, "gray">;
}) {
  return <div className="dme-pmdt-detail-status-row"><DmeIndicator color={active ? activeColor : "gray"} /><span>{label}</span></div>;
}

function MonitorStatus({ monitorNumber, timestamp }: { monitorNumber: 1 | 2; timestamp: string }) {
  const data = useDmePmdtStore((state) => state.data);
  const specialTestRunning = useDmePmdtStore((state) => state.specialTestRunning);
  const channel = getDmeStationChannelAllocation(data.rmsConfigStation);
  const transmitter = monitorNumber === 1 ? "tx1" : "tx2";
  const statusKey = monitorNumber === 1 ? "mon1Status" : "mon2Status";
  const monitorRows = [...data.integralData, ...data.standbyData];
  const hasConfiguredStatus = (target: "alarm" | "warning", role: "primary" | "secondary") => {
    const configured = new Set(data.monitorConfigGeneral.filter((item) => item[role]).map((item) => item.parameter));
    return monitorRows.some((row) => configured.has(row.label) && row[statusKey] === target);
  };
  const primaryAlarm = hasConfiguredStatus("alarm", "primary");
  const secondaryAlarm = hasConfiguredStatus("alarm", "secondary");
  const preAlarm = monitorRows.some((row) => row[statusKey] === "warning" || row[statusKey] === "yellow");
  const identTimeoutIntegral = data.integralData.some((row) => row.label === "Ident Status" && row[statusKey] === "red");
  const identTimeoutStandby = data.standbyData.some((row) => row.label === "Ident Status" && row[statusKey] === "red");
  const synthUnlock = data.rtcMaintenanceAlerts.find((row) => row.label === "RTC Rx Synth Unlock")?.[transmitter] === "red";
  const rxError = data.integralData.find((row) => row.label === "Rx LO Frequency Error");
  const rxErrorValue = rxError?.[monitorNumber === 1 ? "mon1Value" : "mon2Value"] ?? "0";
  return (
    <div className="dme-pmdt-detail-status">
      <time>{timestamp}</time>
      <div className="dme-pmdt-detail-status-grid">
        <fieldset>
          <legend>Alarm / Alerts</legend>
          <IndicatorRow label="Primary Alarm" active={primaryAlarm} activeColor="red" />
          <IndicatorRow label="Secondary Alarm" active={secondaryAlarm} activeColor="red" />
          <IndicatorRow label="Pre-Alarm" active={preAlarm} activeColor="yellow" />
          <IndicatorRow label="Maintenance Alert" active={data.rmsStatus.maintenanceAlert} activeColor="yellow" />
        </fieldset>
        <fieldset>
          <legend>Diagnostics</legend>
          <IndicatorRow label="Diagnostics Test in Progress" active={specialTestRunning} activeColor="yellow" />
          <div className="dme-pmdt-detail-readout"><span>CPU Shutdown</span><output>{data.rtcStatus.cpuShutdown[transmitter]}</output></div>
        </fieldset>
        <fieldset>
          <legend>Status</legend>
          <div className="dme-pmdt-detail-status-pair">
            <IndicatorRow
              label="Remote Mode"
              active={!data.local && data.rmsStatus.remoteControlEnabled}
            />
            <IndicatorRow label="Local Mode" active={data.local} />
          </div>
          <IndicatorRow label="Hot Standby Present" active={data.rmsConfigStation.hotStandby} />
          <IndicatorRow label="Overload" active={data.rtcStatus.overload[transmitter]} activeColor="red" />
          <IndicatorRow label="Efficiency Alarm Suppressed" active={!data.rmsConfigGeneral.monitorIntegrityTestsEnabled} activeColor="yellow" />
          <IndicatorRow label="Integral Monitor Detector Clipped" />
          <IndicatorRow label="Standby Monitor Detector Clipped" />
          <IndicatorRow label="Integral Monitor Ident Gate Timeout" active={identTimeoutIntegral} activeColor="red" />
          <IndicatorRow label="Standby Monitor Ident Gate Timeout" active={identTimeoutStandby} activeColor="red" />
          <div className="dme-pmdt-detail-readout dme-pmdt-detail-trigger"><span>Trigger Source</span><output>{data.monitorTrigger[monitorNumber === 1 ? "monitor1" : "monitor2"]}</output></div>
        </fieldset>
        <fieldset>
          <legend>Interrogator Synthesizer</legend>
          <IndicatorRow label="Unlock" active={synthUnlock} activeColor="red" />
          <div className="dme-pmdt-detail-readout"><span>Frequency</span><output>{channel ? formatDmeFrequency(channel.monitorInterrogatorFrequencyMHz) : "—"}</output><small>MHz</small></div>
          <div className="dme-pmdt-detail-readout"><span>Frequency Error</span><output>{rxErrorValue}</output><small>ppm</small></div>
        </fieldset>
      </div>
    </div>
  );
}

export function MonitorDetailData({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const openView = useDmePmdtStore((state) => state.openView);
  const screenId = monitorNumber === 1 ? "monitor-1-data" : "monitor-2-data";
  const viewIds: Record<DetailTab, DmeViewId> = monitorNumber === 1
    ? {
        integral: "monitor-1-data-detail-integral",
        standby: "monitor-1-data-detail-standby",
        maintenance: "monitor-1-data-detail-maintenance",
        status: "monitor-1-data-detail-status",
      }
    : {
        integral: "monitor-2-data-detail-integral",
        standby: "monitor-2-data-detail-standby",
        maintenance: "monitor-2-data-detail-maintenance",
        status: "monitor-2-data-detail-status",
      };
  const activeTab = (Object.entries(viewIds).find(([, viewId]) => viewId === activeView)?.[0] ?? "integral") as DetailTab;
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "integral", label: "Integral" },
    { id: "standby", label: "Standby" },
    { id: "maintenance", label: "Maintenance Alerts" },
    { id: "status", label: "Status" },
  ];

  return (
    <section className="dme-pmdt-monitor-detail flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Data`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Data`} />
      <ScreenTabs
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          active: tab.id === activeTab,
          onSelect: () => openView(
            screenId,
            viewIds[tab.id],
            [`Monitor ${monitorNumber}`, "Data", tab.label],
            tab.label,
          ),
        }))}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {activeTab === "integral" ? <MonitorMeasurements monitorNumber={monitorNumber} kind="integral" /> : null}
        {activeTab === "standby" ? <MonitorMeasurements monitorNumber={monitorNumber} kind="standby" /> : null}
        {activeTab === "maintenance" ? <MonitorMaintenanceAlerts timestamp={timestamp} /> : null}
        {activeTab === "status" ? <MonitorStatus monitorNumber={monitorNumber} timestamp={timestamp} /> : null}
      </div>
    </section>
  );
}
