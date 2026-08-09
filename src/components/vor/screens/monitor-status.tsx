"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function StatusMark({ active, color = "green" }: { active: boolean; color?: "green" | "yellow" | "red" }) {
  const letter = active ? (color === "green" ? "G" : color === "yellow" ? "Y" : "R") : "";
  return <span aria-hidden className={`pmdt-monitor-status-mark pmdt-monitor-status-mark--${active ? color : "empty"}`}>{letter}</span>;
}

export function MonitorStatus({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const data = useVorPmdtStore((state) => state.data);
  const derived = useVorPmdtStore((state) => state.derived);
  const monitor = derived.monitors[monitorNumber === 1 ? "mon1" : "mon2"];
  const preAlarm = Object.values(monitor.parameters).some((parameter) => parameter.status === "warning");
  const primaryAlarm = !derived.voting.primaryHealthy;
  const secondaryAlarm = !derived.voting.secondaryHealthy;

  return (
    <section className="pmdt-monitor-status" aria-label={`Monitor ${monitorNumber} status`}>
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <div className="pmdt-monitor-status-grid">
        <div className="pmdt-monitor-status-column">
          <fieldset>
            <legend>Alarm / Alerts</legend>
            <div className="pmdt-monitor-status-row"><StatusMark active={primaryAlarm} color="red" /><span>Primary Alarm</span></div>
            <div className="pmdt-monitor-status-row"><StatusMark active={secondaryAlarm} color="red" /><span>Secondary Alarm</span></div>
            <div className="pmdt-monitor-status-row"><StatusMark active={preAlarm} color="yellow" /><span>Pre-Alarm</span></div>
            <div className="pmdt-monitor-status-row"><StatusMark active={false} /><span>Maintenance Alert</span></div>
          </fieldset>
          <fieldset>
            <legend>Status</legend>
            <div className="pmdt-monitor-status-row pmdt-monitor-status-row--split"><StatusMark active={!data.local} /><span>Remote Mode</span><StatusMark active={data.local} color="yellow" /><span>Local Mode</span></div>
            <div className="pmdt-monitor-status-row"><StatusMark active={false} /><span>Hot Standby Present</span></div>
            <div className="pmdt-monitor-status-row pmdt-monitor-status-row--value"><span /> <span>CPU Shutdown</span><span>Normal</span></div>
          </fieldset>
        </div>
        <fieldset className="pmdt-monitor-maintenance">
          <legend>Maintenance Alerts</legend>
          {[
            "ROM Fault",
            "RAM Fault",
            "Functional Fault",
            "EEPROM Fault",
            "Monitor Synch Unlock",
            "IF DSP Boot Fault",
            "IF DSP Heartbeat Fault",
            "Commutator Sync Fault",
            `Antenna #${monitorNumber} Az Fault - RF Level`,
            `Antenna #${monitorNumber} Az Fault - Mod %`,
          ].map((label) => (
            <div key={label} className="pmdt-monitor-status-row pmdt-monitor-status-row--maintenance"><span>{label}</span><StatusMark active={false} /></div>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
