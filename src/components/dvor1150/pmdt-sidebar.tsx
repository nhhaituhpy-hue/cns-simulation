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

function Lamp({ color, locked = false }: { color: Dvor1150IndicatorColor; locked?: boolean }) {
  const visible = locked ? "gray" : color;
  const label = visible === "green" ? "G" : visible === "yellow" ? "Y" : visible === "red" ? "R" : "";
  return <span className={`pmdt-state-lamp ${indicatorClasses[visible]}`} aria-hidden>{label}</span>;
}

const transmitterRows = [
  { key: "main", label: "Main", mode: "main" as const },
  { key: "antenna", label: "Antenna", mode: undefined },
  { key: "load", label: "Load", mode: "load" as const },
  { key: "off", label: "Off", mode: "off" as const },
] as const;

export function Dvor1150Sidebar() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const config = useDvor1150PmdtStore((state) => state.config);
  const loginOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const needBackup = useDvor1150PmdtStore((state) => state.needBackup);
  const setLocal = useDvor1150PmdtStore((state) => state.setLocalMode);
  const setBypass = useDvor1150PmdtStore((state) => state.setMonitorBypass);
  const setTransmitterMode = useDvor1150PmdtStore((state) => state.setTransmitterMode);
  const canMain = security >= 3;
  const canMaintenance = security >= 3 && config.simulation.local && config.simulation.integralMonitorBypass;
  const localColor: Dvor1150IndicatorColor = config.simulation.local ? "yellow" : "gray";
  const bypassColor: Dvor1150IndicatorColor = config.simulation.integralMonitorBypass ? "yellow" : "gray";

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
      title={commandAllowed ? `Đặt ${transmitter.toUpperCase()} ${row.label}` : row.mode === "main" ? "Yêu cầu SEC3/SEC4" : "Bật Local rồi Bypass"}
      aria-label={`${row.label} ${transmitter.toUpperCase()}`}
      onClick={() => setTransmitterMode(transmitter, row.mode as Dvor1150TransmitterMode)}
    >{content}</button>;
  }

  const connected = loginOpen ? "" : data.connected ? "Connected" : "Disconnected";
  return <aside className="pmdt-sidebar">
    <section aria-label="Connection" className="pmdt-sidebar-section">
      <span className={`pmdt-connection-badge ${loginOpen ? "pmdt-connection-badge--locked" : data.connected ? "" : "pmdt-connection-badge--offline"}`}>{connected}</span>
      <div className={`pmdt-sidebar-spacer ${!loginOpen && needBackup ? "pmdt-sidebar-spacer--backup" : !loginOpen && config.simulation.local ? "pmdt-sidebar-spacer--local" : ""}`}>
        {!loginOpen && needBackup ? <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--backup">Need Backup</span> : null}
        {!loginOpen && !needBackup && config.simulation.local ? <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--local">LOCAL</span> : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <span className="pmdt-sidebar-state"><Lamp color={data.alert ? "yellow" : "gray"} locked={loginOpen} /> Alert</span>
        <button type="button" className="pmdt-sidebar-state pmdt-sidebar-state--interactive" aria-pressed={config.simulation.local} disabled={security < 3} onClick={() => setLocal(!config.simulation.local)} title={security < 3 ? "GUEST chỉ được xem" : "Bật/tắt Local"}><Lamp color={localColor} locked={loginOpen} /> Local</button>
      </div>
    </section>
    <section aria-labelledby="dvor1150-transmitters" className="pmdt-sidebar-section">
      <h2 id="dvor1150-transmitters" className="pmdt-sidebar-heading">Transmitters</h2>
      <div className="pmdt-transmitter-grid">
        <span className="pmdt-sidebar-grid-blank" /><span className="pmdt-transmitter-column-heading">Tx1</span><span className="pmdt-transmitter-label" /><span className="pmdt-transmitter-column-heading">Tx2</span><span className="pmdt-sidebar-grid-blank" />
        {transmitterRows.map((row) => <div key={row.key} className="contents"><span className="pmdt-sidebar-grid-blank" />{renderTransmitterCell("tx1", row)}<span className="pmdt-transmitter-label">{row.label}</span>{renderTransmitterCell("tx2", row)}<span className="pmdt-sidebar-grid-blank" /></div>)}
      </div>
    </section>
    <section aria-labelledby="dvor1150-monitors" className="pmdt-sidebar-section">
      <h2 id="dvor1150-monitors" className="pmdt-sidebar-heading">Monitors</h2>
      <div className="dvor1150-monitor-sidebar">
        <span className="pmdt-monitor-integral-label">Integral</span>
        <span className="pmdt-sidebar-grid-blank" /><Indicator color={data.monitorIntegral.normal ? "green" : "gray"} locked={loginOpen} /><span className="pmdt-monitor-label">Normal</span>
        <span className="pmdt-sidebar-grid-blank" /><Indicator color={data.monitorIntegral.alarm ? "red" : "gray"} locked={loginOpen} /><span className="pmdt-monitor-label">Alarm</span>
        <span className="pmdt-sidebar-grid-blank" /><Indicator color={bypassColor} locked={loginOpen} /><button type="button" className="pmdt-monitor-label dvor1150-sidebar-command" disabled={security < 3 || (!config.simulation.local && !config.simulation.integralMonitorBypass)} onClick={() => setBypass("mon1", !config.simulation.integralMonitorBypass)} title={config.simulation.local ? "Bật/tắt Bypass" : "Bật Local trước khi chọn Bypass"}>Bypass</button>
      </div>
    </section>
    <section aria-labelledby="dvor1150-parameters" className="pmdt-sidebar-section">
      <h2 id="dvor1150-parameters" className="pmdt-sidebar-heading">Monitor 1</h2>
      <dl className="grid gap-1.5">
        {(["azimuth", "hz30Mod", "hz9960Mod", "deviation", "rfLevel"] as const).map((key) => {
          const labels = { azimuth: "Azimuth Angle", hz30Mod: "30 Hz Mod", hz9960Mod: "9960 Hz Mod", deviation: "Deviation", rfLevel: "RF Level" };
          const digits = { azimuth: 2, hz30Mod: 1, hz9960Mod: 1, deviation: 1, rfLevel: 1 };
          const parameter = data.sidebarParams[key];
          return <div key={key} className={`pmdt-parameter ${loginOpen ? "pmdt-parameter--locked" : `pmdt-parameter--${parameter.status}`}`}><dt>{labels[key]}</dt><dd>{loginOpen ? "" : parameter.value.toFixed(digits[key])}</dd></div>;
        })}
      </dl>
    </section>
  </aside>;
}
