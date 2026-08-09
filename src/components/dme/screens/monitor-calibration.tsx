"use client";

import { useState } from "react";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeIndicator, ScreenTabs, dmeFieldMetadata } from "./screen-primitives";

const selfCalibratedParameters = [
  ["+32 dB Amplifier", 34.2],
  ["-32 dB Attenuator", -32.0],
  ["-16 dB Attenuator", -16.0],
  ["-8 dB Attenuator", -8.0],
  ["-4 dB Attenuator", -4.0],
  ["-2 dB Attenuator", -2.0],
  ["-1 dB Attenuator", -1.0],
  ["Signal Generator Reference", -28.4],
  ["Integral Tx Power Scale", 114.0],
] as const;

function CalibrationInput({ fieldId, label, value }: { fieldId: string; label: string; value: number }) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const resolved = resolveDmeField(value, fieldId, overrides);
  const formattedValue = Number(resolved).toFixed(1);
  return (
    <input
      id={`dme-calibration-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}`}
      name={fieldId}
      {...dmeFieldMetadata(fieldId, label, resolved, "gray")}
      type="number"
      value={formattedValue}
      readOnly
      aria-label={label}
    />
  );
}

export function MonitorCalibration({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const openView = useDmePmdtStore((state) => state.openView);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const [selfCalibrationRunning, setSelfCalibrationRunning] = useState(false);
  const [calibrationParametersEnabled, setCalibrationParametersEnabled] = useState(true);
  const prefix = `monitorCalibrationData.monitor${monitorNumber}`;
  const canOperate = securityLevel >= 3 && !loginDialogOpen && local;

  function saveCalibration() {
    if (typeof window === "undefined") return;
    const payload = {
      device: "DME 1119A",
      monitor: monitorNumber,
      timestamp,
      calibrationParameters: selfCalibratedParameters.map(([label, value]) => ({ label, value })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dme-1119a-monitor-${monitorNumber}-calibration.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="dme-pmdt-calibration-screen flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Calibration`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Offsets and Scale Factors`} />
      <ScreenTabs tabs={[
        {
          id: "offsets",
          label: "Offsets and Scale Factors",
          active: false,
          onSelect: () => openView(
            `monitor-${monitorNumber}-offsets`,
            `monitor-${monitorNumber}-offsets`,
            [`Monitor ${monitorNumber}`, "Offsets and Scale Factors"],
            "Offsets and Scale Factors",
          ),
        },
        { id: "calibration", label: "Calibration", active: true },
      ]} />
      <div className="dme-pmdt-calibration-content">
        <time>{timestamp}</time>
        <div className="dme-pmdt-calibration-grid">
          <div>
            <fieldset>
              <legend>Calibration</legend>
              <label><span>Interrogator Nominal Power</span><CalibrationInput fieldId={`${prefix}.interrogatorNominalPower`} label="Interrogator Nominal Power" value={-13.2} /><small>dBm</small></label>
              <label><span>Integral Tx Power Offset</span><CalibrationInput fieldId={`${prefix}.integralTxPowerOffset`} label="Integral Tx Power Offset" value={-3.0} /><small>dB</small></label>
            </fieldset>
            <fieldset className="dme-pmdt-self-calibration">
              <legend>Self-Calibrated Parameters</legend>
              <button type="button" disabled={!canOperate} onClick={() => setSelfCalibrationRunning((running) => !running)}>
                {selfCalibrationRunning ? "Stop Self Calibration" : "Run Self Calibration"}
              </button>
              {selfCalibratedParameters.map(([label, value], index) => (
                <label key={label}>
                  <span>{label}</span>
                  <CalibrationInput fieldId={`${prefix}.selfCalibrated.${index}`} label={label} value={value} />
                  <small>{label === "Integral Tx Power Scale" ? "%" : "dB"}</small>
                </label>
              ))}
            </fieldset>
          </div>
          <fieldset className="dme-pmdt-calibration-status">
            <legend>Status</legend>
            <DmeIndicator color={calibrationParametersEnabled ? "green" : "yellow"} />
            <button type="button" disabled={!canOperate} onClick={() => setCalibrationParametersEnabled((enabled) => !enabled)}>
              {calibrationParametersEnabled ? "Disable Calibration Parameters" : "Enable Calibration Parameters"}
            </button>
          </fieldset>
          <div className="dme-pmdt-calibration-file-actions">
            <button type="button" disabled title="File loading is not available in the PMDT simulator">Load...</button>
            <button type="button" onClick={saveCalibration}>Save...</button>
          </div>
        </div>
      </div>
    </section>
  );
}
