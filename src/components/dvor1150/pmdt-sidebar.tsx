"use client";

import type { Dvor1150IndicatorColor, Dvor1150TransmitterId, Dvor1150TransmitterMode } from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

const indicatorClasses: Record<Dvor1150IndicatorColor, string> = {
  green: "pmdt-indicator--green",
  yellow: "pmdt-indicator--yellow",
  red: "pmdt-indicator--red",
  gray: "pmdt-indicator--gray",
};

function Indicator({ color, locked = false }: { color: Dvor1150IndicatorColor; locked?: boolean }) {
  const visible = locked ? "gray" : color;
  const label = visible === "green" ? "G" : visible === "yellow" ? "Y" : visible === "red" ? "R" : "";
  return <span className={`pmdt-indicator ${indicatorClasses[visible]}`} aria-hidden>{label}</span>;
}

const transmitterRows = [
  { key: "main", label: "Main", mode: "main" as const },
  { key: "antenna", label: "Antenna", mode: undefined },
  { key: "load", label: "Load", mode: "load" as const },
  { key: "off", label: "Off", mode: "off" as const },
] as const;

export function Dvor1150Sidebar() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const monitors = useDvor1150PmdtStore((state) => state.derived.monitors);
  const activeTransmitter = useDvor1150PmdtStore((state) => state.derived.activeTransmitter);
  const config = useDvor1150PmdtStore((state) => state.config);
  const needBackup = useDvor1150PmdtStore((state) => state.needBackup);
  const loginOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const setBypass = useDvor1150PmdtStore((state) => state.setMonitorBypass);
  const setTransmitterMode = useDvor1150PmdtStore((state) => state.setTransmitterMode);
  const canMain = security >= 3;
  const canMaintenance = security >= 3 && local;
  const bypassColor: Dvor1150IndicatorColor = config.simulation.integralMonitorBypass ? "yellow" : "gray";
  const activeMonitor = activeTransmitter === "tx2" ? monitors.mon2 : monitors.mon1;
  const dualTransmitters = config.station.transmitterConfig === "Dual Transmitters";
  const sidebarParameterRows = [
    { key: "azimuth", id: "azimuth", label: "Azimuth Angle", digits: 2 },
    { key: "hz30Mod", id: "hz30Modulation", label: "30 Hz Mod", digits: 1 },
    { key: "hz9960Mod", id: "hz9960Modulation", label: "9960 Hz Mod", digits: 1 },
    { key: "deviation", id: "deviation", label: "Deviation", digits: 1 },
    { key: "rfLevel", id: "rfLevel", label: "RF Level", digits: 1 },
  ] as const;

  function renderTransmitterCell(transmitter: Dvor1150TransmitterId, row: (typeof transmitterRows)[number]) {
    const color = data.transmitters[transmitter][row.key as keyof typeof data.transmitters["tx1"]];
    const commandAllowed = row.mode === "main" ? canMain : canMaintenance;
    const content = <Indicator color={color} locked={loginOpen} />;
    if (!row.mode) return <span key={transmitter} className="pmdt-transmitter-status-cell">{content}</span>;
    return <button
      key={transmitter}
      type="button"
      className={`pmdt-transmitter-status-cell ${commandAllowed ? "pmdt-transmitter-status-cell--selectable" : ""}`}
      disabled={!commandAllowed}
      title={commandAllowed ? `Đặt ${transmitter.toUpperCase()} ${row.label}` : "Yêu cầu SEC3/SEC4"}
      aria-label={`${row.label} ${transmitter.toUpperCase()}`}
      onClick={() => setTransmitterMode(transmitter, row.mode as Dvor1150TransmitterMode)}
    >{content}</button>;
  }

  const connected = loginOpen ? "" : data.connected ? "Connected" : "Disconnected";
  return <aside className="pmdt-sidebar">
    <section aria-label="Connection" className="pmdt-sidebar-section">
      <span className={`pmdt-connection-badge ${loginOpen ? "pmdt-connection-badge--locked" : data.connected ? "" : "pmdt-connection-badge--offline"}`}>{connected}</span>
      <div className={`dvor1150-backup-alert ${needBackup ? "dvor1150-backup-alert--active" : ""}`} aria-hidden={loginOpen || undefined}>{needBackup ? "Need Backup" : ""}</div>
      <div className={`dvor1150-maintenance-alert ${data.alert ? "dvor1150-maintenance-alert--active" : ""}`} aria-hidden={loginOpen || undefined}>
        {loginOpen ? null : <><Indicator color={data.alert ? "yellow" : "gray"} /><span>Maintenance Alert</span></>}
      </div>
    </section>
    <section aria-labelledby="dvor1150-transmitters" className="pmdt-sidebar-section">
      <h2 id="dvor1150-transmitters" className="pmdt-sidebar-heading">Transmitters</h2>
      <div className={`pmdt-transmitter-grid ${dualTransmitters ? "" : "pmdt-transmitter-grid--single"}`}>
        {dualTransmitters ? <>
          <span className="pmdt-sidebar-grid-blank" /><span className="pmdt-transmitter-column-heading">Tx1</span><span className="pmdt-transmitter-label" /><span className="pmdt-transmitter-column-heading">Tx2</span><span className="pmdt-sidebar-grid-blank" />
          {transmitterRows.map((row) => <div key={row.key} className="contents"><span className="pmdt-sidebar-grid-blank" />{renderTransmitterCell("tx1", row)}<span className="pmdt-transmitter-label">{row.label}</span>{renderTransmitterCell("tx2", row)}<span className="pmdt-sidebar-grid-blank" /></div>)}
        </> : <>
          <span className="pmdt-sidebar-grid-blank" /><span className="pmdt-transmitter-column-heading">Tx1</span><span className="pmdt-transmitter-label" /><span className="pmdt-sidebar-grid-blank" />
          {transmitterRows.map((row) => <div key={row.key} className="contents"><span className="pmdt-sidebar-grid-blank" />{renderTransmitterCell("tx1", row)}<span className="pmdt-transmitter-label">{row.label}</span><span className="pmdt-sidebar-grid-blank" /></div>)}
        </>}
      </div>
    </section>
    <section aria-labelledby="dvor1150-monitors" className="pmdt-sidebar-section">
      <h2 id="dvor1150-monitors" className="pmdt-sidebar-heading">Monitors</h2>
      <div className="dvor1150-monitor-sidebar">
        <span className="dvor1150-monitor-sidebar-corner" aria-hidden="true" />
        <span className="dvor1150-monitor-column-heading">Mon1</span>
        <span className="dvor1150-monitor-column-heading">Mon2</span>
        <span className="dvor1150-monitor-status-cell"><Indicator color={monitors.mon1.healthy ? "green" : "gray"} locked={loginOpen} /></span>
        <span className="pmdt-monitor-label">Normal</span>
        <span className="dvor1150-monitor-status-cell"><Indicator color={monitors.mon2.healthy ? "green" : "gray"} locked={loginOpen} /></span>
        <span className="dvor1150-monitor-status-cell"><Indicator color={monitors.mon1.healthy ? "gray" : "red"} locked={loginOpen} /></span>
        <span className="pmdt-monitor-label">Alarm</span>
        <span className="dvor1150-monitor-status-cell"><Indicator color={monitors.mon2.healthy ? "gray" : "red"} locked={loginOpen} /></span>
        <button type="button" className="dvor1150-monitor-status-cell dvor1150-monitor-status-cell--command" aria-label="Bypass Monitor 1" aria-pressed={config.simulation.integralMonitorBypass} disabled={security < 3 || !local} onClick={() => setBypass("mon1", !config.simulation.integralMonitorBypass)} title={security < 3 ? "Yêu cầu Security Level 3" : !local ? "Bật Local trước khi chọn Bypass" : "Bật/tắt Bypass cho cả hai monitor"}><Indicator color={bypassColor} locked={loginOpen} /></button>
        <span className="pmdt-monitor-label">Bypass</span>
        <button type="button" className="dvor1150-monitor-status-cell dvor1150-monitor-status-cell--command" aria-label="Bypass Monitor 2" aria-pressed={config.simulation.integralMonitorBypass} disabled={security < 3 || !local} onClick={() => setBypass("mon2", !config.simulation.integralMonitorBypass)} title={security < 3 ? "Yêu cầu Security Level 3" : !local ? "Bật Local trước khi chọn Bypass" : "Bật/tắt Bypass cho cả hai monitor"}><Indicator color={bypassColor} locked={loginOpen} /></button>
      </div>
    </section>
    <section aria-labelledby="dvor1150-parameters" className="pmdt-sidebar-section">
      <h2 id="dvor1150-parameters" className="sr-only">Active Monitor Parameters</h2>
      <dl className="dvor1150-sidebar-parameters">
        {sidebarParameterRows.map(({ key, id, label, digits }) => {
          const parameter = activeMonitor.parameters[id];
          return <div key={key} className={`pmdt-parameter ${loginOpen ? "pmdt-parameter--locked" : `pmdt-parameter--${parameter.status}`}`}><dt>{label}</dt><dd>{loginOpen ? "" : parameter.value.toFixed(digits)}</dd></div>;
        })}
      </dl>
    </section>
  </aside>;
}
