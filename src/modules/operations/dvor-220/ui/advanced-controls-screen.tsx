"use client";

import { useState, type ReactNode } from "react";
import { MopiensModal } from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "../domain/permissions";
import { DVOR220_TRANSMITTER_IDS, type Dvor220AdvancedControls, type Dvor220TransmitterId } from "../domain/types";
import type { Dvor220MaintenanceScreenProps } from "./maintenance-screens";
import styles from "../dvor220.module.css";

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
    <button type="button" className={styles.advancedAction} onClick={() => setOpen(true)}>Manual Control...</button>
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
          </button>;
        })}
        {([["USB", usb], ["LSB", lsb]] as const).map(([sideband, antenna]) => {
          const angle = (antenna - 1) * Math.PI / 24;
          return <strong key={sideband} className={styles.antennaMarker} aria-label={`${sideband} antenna #${antenna}`}
            style={{ left: `${50 - 30 * Math.sin(angle)}%`, top: `${50 - 30 * Math.cos(angle)}%` }}>
            {sideband}
          </strong>;
        })}
        <span className={styles.carrierAntenna}>Carrier</span>
      </div>
    </MopiensModal>
  </>;
}


function AppliedControl({ title, control, applied, disabled, dispatch, transmitterId }: {
  title: string;
  control: keyof Dvor220AdvancedControls;
  applied: Dvor220AdvancedControls[keyof Dvor220AdvancedControls];
  disabled: boolean;
  dispatch: Dvor220MaintenanceScreenProps["dispatch"];
  transmitterId: Dvor220TransmitterId;
}) {
  const [selection, setSelection] = useState(applied);
  return <Section title={title}>
    <fieldset className={styles.advancedRadioRow} disabled={disabled} aria-label={title}>
      <div className={styles.advancedRadios}>
        {(["normal", "off", ...(control === "identKeying" ? ["continuous"] as const : [])] as const).map((value) =>
          <label key={value}><input type="radio" name={`${transmitterId}-${control}`} checked={selection === value}
            onChange={() => setSelection(value)} />{value === "normal" ? "Normal" : value === "off" ? "Off" : "Continuous"}</label>)}
      </div>
      <button type="button" className={styles.advancedApply} disabled={disabled || selection === applied} onClick={() =>
        dispatch({ type: "set-advanced-control", transmitterId, control, value: selection })}>
        <span className={styles.advancedCheck} aria-hidden="true">✓</span>Apply
      </button>
    </fieldset>
  </Section>;
}

type AdvancedProps = Dvor220MaintenanceScreenProps & { groundCheck: (transmitterId: Dvor220TransmitterId) => ReactNode };

function TransmitterControls({ transmitterId, device, dispatch, groundCheck }: AdvancedProps & { transmitterId: Dvor220TransmitterId }) {
  const [groundOpen, setGroundOpen] = useState(false);
  const controls = device.transmitters[transmitterId].advancedControls;
  const allowed = getDvor220PermissionDecision(device, "control").allowed;
  const main = device.transmitters[transmitterId].designation === "main";
  return <div className={styles.advancedControlsForm}>
    <AppliedControl title="IDENT Keying" control="identKeying" applied={controls.identKeying} disabled={!allowed} dispatch={dispatch} transmitterId={transmitterId} />
    <AppliedControl title="Sideband Blending" control="sidebandBlending" applied={controls.sidebandBlending} disabled={!allowed} dispatch={dispatch} transmitterId={transmitterId} />
    <Section title="Sideband Antenna Switching"><AntennaManual /></Section>
    <Section title="Automated Ground Error Curve Check">
      <button type="button" className={styles.advancedAction} onClick={() => {
        setGroundOpen(true);
        if (getDvor220PermissionDecision(device, "calibrate").allowed
          && device.connection.profile?.location === "local" && device.keylock === "MAINT"
          && device.groundCheck.status !== "running") {
          dispatch({ type: "start-ground-check", transmitterId });
        }
      }}>Run...</button>
      <MopiensModal open={groundOpen} title="Automated Ground Error Curve Check" size="large" onClose={() => setGroundOpen(false)}
        actions={[{ id: "close", label: "Close", onClick: () => setGroundOpen(false) }]}>
        {groundCheck(transmitterId)}
      </MopiensModal>
    </Section>
    <div className={main ? styles.advancedDisabled : undefined}>
      <AppliedControl title="Standby Transmitter Azimuth Emulation" control="standbyAzimuthEmulation" applied={controls.standbyAzimuthEmulation} disabled={!allowed || main} dispatch={dispatch} transmitterId={transmitterId} />
    </div>
  </div>;
}

export function AdvancedControlsScreen(props: AdvancedProps) {
  const [transmitterId, setTransmitterId] = useState<Dvor220TransmitterId>("tx1");
  return <div className={styles.advancedScreen}>
    <header className={styles.advancedTitle}>Advanced Control</header>
    <div className={styles.advancedPane}>
    <div className={styles.advancedWarning}>
      <p><strong>*** WARNING ***</strong></p>
      <p><strong><u>HAZARDOUSLY MISLEADING INFORMATION</u> (HMI)</strong></p>
      <p>Use of the controls on this page may produce Hazardously Misleading Information (HMI).<br />
        Therefore, these controls must not be used during normal operations,<br />
        <strong>particularly when supporting live aircraft traffic.</strong></p>
      <p>Use of the controls on this page may also result in an abrupt system shutdown.<br />
        To prevent such an event, all monitors <strong>must be</strong> bypassed before proceeding.</p>
      <p>Before closing this page, ensure that all controls are returned to their normal states.</p>
    </div>
    <div role="tablist" aria-label="Advanced Control transmitter" className={styles.advancedTabs}>
      {DVOR220_TRANSMITTER_IDS.map((id) => <button key={id} type="button" role="tab"
        id={`advanced-tab-${id}`} aria-controls={`advanced-panel-${id}`} aria-selected={transmitterId === id}
        onClick={() => setTransmitterId(id)}>{id.toUpperCase()}</button>)}
    </div>
    <div role="tabpanel" id={`advanced-panel-${transmitterId}`} aria-labelledby={`advanced-tab-${transmitterId}`}>
      <TransmitterControls key={transmitterId} {...props} transmitterId={transmitterId} />
    </div>
    </div>
  </div>;
}
