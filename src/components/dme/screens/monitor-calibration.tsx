"use client";

import { useEffect, useState } from "react";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import {
  canEditDmeScenarioField,
  dmeParameterFieldCatalog,
  DME_SELF_CALIBRATION_DURATION_SECONDS,
  getDmeParameterValue,
  parseDmeParameterInput,
} from "@/lib/dme1119a";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeIndicator, ScreenTabs } from "./screen-primitives";

/**
 * Draft-bound numeric input for the calibration settings. Unlike the
 * generic text-based config control this renders a real spinbutton, as
 * the calibration screen always did; edits stage into configDraft and
 * commit through the normal F7 Apply flow.
 */
function CalibrationDraftNumber({ fieldId, label }: { fieldId: string; label: string }) {
  const configDraft = useDmePmdtStore((state) => state.configDraft);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const local = useDmePmdtStore((state) => state.data.local);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const field = dmeParameterFieldCatalog.find((item) => item.id === fieldId);
  const value = getDmeParameterValue(configDraft, fieldId);
  const [draftValue, setDraftValue] = useState(() => (typeof value === "number" ? value.toFixed(1) : ""));
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = Boolean(field) && canEditDmeScenarioField({
    active: scenario.active,
    editableFieldIds: scenario.definition?.studentEditableFieldIds ?? [],
    editPolicy: scenario.definition?.editPolicy,
    fieldId,
    readOnly: field?.readOnly,
    securityLevel,
    local,
    loginDialogOpen,
  });

  useEffect(() => {
    if (!isEditing) setDraftValue(typeof value === "number" ? value.toFixed(1) : "");
  }, [value, isEditing]);

  return (
    <input
      id={`dme-calibration-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}`}
      name={fieldId}
      type="number"
      aria-label={label}
      data-dme-field-id={fieldId}
      data-dme-config-field-id={fieldId}
      step={field?.step ?? 0.1}
      min={field?.min}
      max={field?.max}
      value={draftValue}
      disabled={!canEdit}
      readOnly={!canEdit}
      onChange={(event) => {
        setDraftValue(event.currentTarget.value);
        if (!field) return;
        const parsed = parseDmeParameterInput(field, event.currentTarget.value);
        if (parsed !== null) setParameterValue(fieldId, parsed);
      }}
      onFocus={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
    />
  );
}

const selfCalibratedRows = [
  ["amplifier32Db", "+32 dB Amplifier", "dB"],
  ["attenuator32Db", "-32 dB Attenuator", "dB"],
  ["attenuator16Db", "-16 dB Attenuator", "dB"],
  ["attenuator8Db", "-8 dB Attenuator", "dB"],
  ["attenuator4Db", "-4 dB Attenuator", "dB"],
  ["attenuator2Db", "-2 dB Attenuator", "dB"],
  ["attenuator1Db", "-1 dB Attenuator", "dB"],
  ["signalGeneratorReferenceDb", "Signal Generator Reference", "dB"],
  ["integralTxPowerScalePercent", "Integral Tx Power Scale", "%"],
] as const;

export function MonitorCalibration({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const openView = useDmePmdtStore((state) => state.openView);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const calibrationRows = useDmePmdtStore((state) => state.data.monitorCalibrationData[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const settings = useDmePmdtStore((state) => state.data.monitorCalibrationSettings[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const runState = useDmePmdtStore((state) => state.selfCalibrationRuns[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const lastRunAt = useDmePmdtStore((state) => state.lastSelfCalibrationAt[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const savedSnapshot = useDmePmdtStore((state) => state.savedCalibrationSnapshot);
  const startSelfCalibration = useDmePmdtStore((state) => state.startSelfCalibration);
  const stopSelfCalibration = useDmePmdtStore((state) => state.stopSelfCalibration);
  const saveCalibrationSnapshot = useDmePmdtStore((state) => state.saveCalibrationSnapshot);
  const loadCalibrationSnapshot = useDmePmdtStore((state) => state.loadCalibrationSnapshot);
  const prefix = `monitorCalibrationSettings.monitor${monitorNumber}`;
  const canOperate = securityLevel >= 3 && !loginDialogOpen && local;
  const progress = Math.min(100, Math.round((runState.elapsedSeconds / DME_SELF_CALIBRATION_DURATION_SECONDS) * 100));

  function saveCalibration() {
    saveCalibrationSnapshot();
    if (typeof window === "undefined") return;
    const payload = {
      device: "DME 1119A",
      monitor: monitorNumber,
      timestamp,
      interrogatorNominalPowerDbm: settings.interrogatorNominalPowerDbm,
      integralTxPowerOffsetDb: settings.integralTxPowerOffsetDb,
      selfCalibrated: { ...settings.selfCalibrated },
      calibrationData: calibrationRows,
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
              <label>
                <span>Interrogator Nominal Power</span>
                <CalibrationDraftNumber fieldId={`${prefix}.interrogatorNominalPowerDbm`} label="Interrogator Nominal Power" />
                <small>dBm</small>
              </label>
              <label>
                <span>Integral Tx Power Offset</span>
                <CalibrationDraftNumber fieldId={`${prefix}.integralTxPowerOffsetDb`} label="Integral Tx Power Offset" />
                <small>dB</small>
              </label>
            </fieldset>
            <fieldset className="dme-pmdt-calibration-data">
              <legend>Calibration Data</legend>
              <table className="dme-pmdt-calibration-table">
                <thead><tr><th>Parameter</th><th>Baseline</th><th>Actual</th><th>Offset</th><th>Scale</th><th /></tr></thead>
                <tbody>
                  {calibrationRows.map((row) => (
                    <tr key={row.parameter}>
                      <th scope="row">{row.parameter}</th>
                      <td>{row.baseline}</td>
                      <td>{row.actual}</td>
                      <td>{row.offset}</td>
                      <td>{row.scale}</td>
                      <td>{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
            <fieldset className="dme-pmdt-self-calibration">
              <legend>Self-Calibrated Parameters</legend>
              <button
                type="button"
                disabled={!canOperate && !runState.running}
                onClick={() => (runState.running ? stopSelfCalibration(monitorNumber) : startSelfCalibration(monitorNumber))}
              >
                {runState.running ? "Stop Self Calibration" : "Run Self Calibration"}
              </button>
              {runState.running ? (
                <p role="status">Self calibration running… {progress}%</p>
              ) : lastRunAt ? (
                <p role="status">Last self calibration: {lastRunAt}</p>
              ) : null}
              {selfCalibratedRows.map(([key, label, unit]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    id={`dme-calibration-self-${monitorNumber}-${key}`}
                    name={`${prefix}.selfCalibrated.${key}`}
                    type="number"
                    value={settings.selfCalibrated[key].toFixed(1)}
                    readOnly
                    aria-label={label}
                  />
                  <small>{unit}</small>
                </label>
              ))}
            </fieldset>
          </div>
          <fieldset className="dme-pmdt-calibration-status">
            <legend>Status</legend>
            <DmeIndicator color={runState.running ? "yellow" : "green"} />
            <span>{runState.running ? "Self calibration in progress" : "Calibration parameters applied"}</span>
          </fieldset>
          <div className="dme-pmdt-calibration-file-actions">
            <button type="button" disabled={!savedSnapshot || !canOperate} onClick={() => loadCalibrationSnapshot()}>Load...</button>
            <button type="button" onClick={saveCalibration}>Save...</button>
            {!savedSnapshot ? <p>Chưa có bản lưu hiệu chuẩn trong phiên này — hãy bấm Save... trước khi Load...</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
