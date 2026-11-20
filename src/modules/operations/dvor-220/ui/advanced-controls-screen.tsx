"use client";

import { useState, type ReactNode } from "react";
import { MopiensBeveledButton, MopiensModal, MopiensPropertyGrid, type MopiensVisualTone } from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "../domain/permissions";
import { DVOR220_TRANSMITTER_IDS, type Dvor220MonitorParameter, type Dvor220StationConfiguration } from "../domain/types";
import type { Dvor220MaintenanceScreenProps } from "./maintenance-screens";
import { formatDvor220Status, toneForDvor220Status } from "./main-screens";
import styles from "../dvor220.module.css";

const certificationCommands: { label: string; parameter: Dvor220MonitorParameter; direction: "upper" | "lower" }[] = [
  { label: "Azimuth Course Shift Alarm CW", parameter: "bearingError", direction: "upper" },
  { label: "Azimuth Course Shift Alarm CCW", parameter: "bearingError", direction: "lower" },
  { label: "30 Hz AM High Alarm", parameter: "am30Hz", direction: "upper" },
  { label: "30 Hz AM Low Alarm", parameter: "am30Hz", direction: "lower" },
  { label: "9960 Hz Subcarrier AM High Alarm", parameter: "am9960Hz", direction: "upper" },
  { label: "9960 Hz Subcarrier AM Low Alarm", parameter: "am9960Hz", direction: "lower" },
  { label: "RF Level High Alarm", parameter: "rfLevel", direction: "upper" },
  { label: "RF Level Low Alarm", parameter: "rfLevel", direction: "lower" },
];

const identKeyers: { value: Dvor220StationConfiguration["identKeyer"]; label: string }[] = [
  { value: "independent", label: "Independent" },
  { value: "associated-master", label: "Associated Master" },
  { value: "associated-slave", label: "Associated Slave" },
  { value: "continuous", label: "Continuous" },
  { value: "none", label: "None" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <details open className={styles.advancedSection}>
    <summary>{title}</summary>
    <div className={styles.advancedSectionBody}>{children}</div>
  </details>;
}

function AntennaManual() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(1);
  const [swapped, setSwapped] = useState(false);
  const opposite = (selected + 23) % 48 + 1;
  const usb = swapped ? opposite : selected;
  const lsb = swapped ? selected : opposite;
  return <>
    <MopiensBeveledButton onClick={() => setOpen(true)}>Antenna Manual</MopiensBeveledButton>
    <MopiensModal open={open} title="Antenna Manual" size="large" onClose={() => setOpen(false)}
      actions={[{ id: "close", label: "Close", onClick: () => setOpen(false) }]}>
      <h3>Antenna Select</h3>
      <p role="status">Selected antenna #{selected} · USB #{usb} · LSB #{lsb}</p>
      <div className={styles.antennaCircle} role="group" aria-label="Sideband antennas">
        {Array.from({ length: 48 }, (_, index) => {
          const antenna = index + 1;
          const angle = index * Math.PI / 24;
          const paired = antenna === selected || antenna === opposite;
          return <button key={antenna} type="button" aria-label={`Antenna #${antenna}`} aria-pressed={paired}
            className={styles.manualAntenna}
            style={{ left: `${50 - 44 * Math.sin(angle)}%`, top: `${50 - 44 * Math.cos(angle)}%` }}
            onClick={() => {
              if (antenna === selected) setSwapped(!swapped);
              else { setSelected(antenna); setSwapped(false); }
            }}>
            <span>#{antenna}</span>
            {antenna === usb || antenna === lsb ? <strong>{antenna === usb ? "USB" : "LSB"}</strong> : null}
          </button>;
        })}
        <span className={styles.carrierAntenna}>Carrier</span>
      </div>
    </MopiensModal>
  </>;
}

export function AdvancedControlsScreen({ device, snapshot, dispatch, groundCheck }: Dvor220MaintenanceScreenProps & { groundCheck: ReactNode }) {
  const [identKeyer, setIdentKeyer] = useState(device.configuration.running.station.identKeyer);
  const configure = getDvor220PermissionDecision(device, "configure");
  function toggle(command: typeof certificationCommands[number]) {
    const prefix = `certification-${command.parameter}-`;
    const active = device.faults.some((fault) => fault.id === `${prefix}${command.direction}-mon1`);
    for (const fault of device.faults.filter((fault) => fault.id.startsWith(prefix))) {
      dispatch({ type: "clear-fault", faultId: fault.id });
    }
    if (active) return;
    const band = device.configuration.running.monitor.channels.cha.limits[command.parameter];
    const limit = command.direction === "upper" ? band.upperAlarm : band.lowerAlarm;
    if (limit === null) return;
    const value = limit + (command.direction === "upper" ? 0.01 : -0.01);
    for (const monitorId of ["mon1", "mon2"] as const) {
      dispatch({ type: "inject-fault", fault: {
        id: `${prefix}${command.direction}-${monitorId}`, kind: "monitor-parameter",
        monitorId, channelId: "cha", parameter: command.parameter, value,
      } });
    }
  }
  return <div className={styles.screenBody}>
    <header className={styles.screenTitle}><h2>Advanced Controls</h2></header>
    <Section title="Monitor Certification">
      <p>Bypass the monitor to prevent shutdown (TM 6.5.3).</p>
      <div className={styles.actionRow}>
        {certificationCommands.map((command) => <MopiensBeveledButton key={command.label}
          disabled={device.configuration.running.monitor.channels.cha.limits[command.parameter][command.direction === "upper" ? "upperAlarm" : "lowerAlarm"] === null}
          pressed={device.faults.some((fault) => fault.id === `certification-${command.parameter}-${command.direction}-mon1`)}
          onClick={() => toggle(command)}>{command.label}</MopiensBeveledButton>)}
      </div>
      <div className={styles.maintenanceToolbar}>
        <label className={styles.formField}><span>IDENT Keyer</span>
          <select value={identKeyer} onChange={(event) => setIdentKeyer(event.target.value as typeof identKeyer)}>
            {identKeyers.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <MopiensBeveledButton disabled={!configure.allowed} onClick={() => {
          const result = dispatch({ type: "patch-draft", patch: { station: { identKeyer } } });
          if (result.ok) dispatch({ type: "apply-draft" });
        }}>Apply</MopiensBeveledButton>
      </div>
      <MopiensPropertyGrid ariaLabel="Certification results" sections={[
        ...(["mon1", "mon2"] as const).map((monitorId) => ({
          id: monitorId, title: `${monitorId.toUpperCase()} CH.A`,
          rows: (["bearingError", "am30Hz", "am9960Hz", "rfLevel", "ident1020Hz"] as const).map((parameter) => {
            const reading = snapshot.monitors[monitorId].channels.cha.readings[parameter];
            const tone: MopiensVisualTone = reading.status === "disabled" ? "inactive" : reading.status === "stabilizing" ? "pending" : toneForDvor220Status(reading.status);
            return { id: parameter, label: parameter, value: `${reading.value.toFixed(2)} — ${formatDvor220Status(reading.status)}`, tone };
          }),
        })),
        { id: "executive", title: `Voting Logic: ${device.configuration.running.monitor.votingLogic}`, rows: [
          { id: "vote", label: "Executive Vote", value: snapshot.executiveAlarm ? "Active" : "Inactive" },
          { id: "phase", label: "Action Phase", value: formatDvor220Status(device.executive.phase) },
          ...DVOR220_TRANSMITTER_IDS.map((id) => ({ id, label: id.toUpperCase(), value: `${formatDvor220Status(snapshot.transmitters[id].status)} — ${snapshot.transmitters[id].path}` })),
        ] },
      ]} />
    </Section>
    <Section title="Antenna Manual"><AntennaManual /></Section>
    <Section title="Fault Clear">
      <p>Before executing the fault clear control, it should be checked if the cause of the reverse fault trip has been removed. Repetitive attempts to do the fault clear without eliminating the cause of the reverse protection trip may result in a damage with the LMA.</p>
      <div className={styles.actionRow}>{DVOR220_TRANSMITTER_IDS.map((transmitterId) => <div key={transmitterId}>
        <MopiensBeveledButton disabled={!getDvor220PermissionDecision(device, "control").allowed}
          onClick={() => dispatch({ type: "fault-clear", transmitterId })}>{transmitterId.toUpperCase()}</MopiensBeveledButton>
        <span> Reverse fault: {device.transmitters[transmitterId].reverseFaultLatched ? "Latched" : "Clear"}</span>
      </div>)}</div>
    </Section>
    <Section title="Automatic Ground Error Check">{groundCheck}</Section>
  </div>;
}
