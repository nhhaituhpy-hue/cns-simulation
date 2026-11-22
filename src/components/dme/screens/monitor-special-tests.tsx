"use client";

import type { DmeSpecialTestParameters } from "@/lib/dme-types";
import { PmdtToolbar } from "../pmdt-toolbar";
import { formatDmeNumericDisplay, getDmeStationChannelAllocation } from "@/lib/dme1119a";
import { DME_SPECIAL_TEST_DURATION_SECONDS, useDmePmdtStore } from "@/stores/dme-pmdt-store";

function NumberField({
  monitorNumber,
  label,
  value,
  unit,
  min,
  max,
  step = "any",
  disabled,
  onChange,
}: {
  monitorNumber: 1 | 2;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const inputId = `dme-special-${monitorNumber}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="dme-pmdt-special-number">
      <span>{label}</span>
      <input
        id={inputId}
        name={inputId}
        type="number"
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        value={Number.isFinite(value) ? formatDmeNumericDisplay(value, step !== undefined && step !== "any" && Number.isFinite(Number(step)) ? Number(step) : undefined) : ""}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        aria-label={label}
      />
      <small>{unit}</small>
    </label>
  );
}

function MonitorTestColumn({
  monitorNumber,
  interrogationSpacing,
  interrogationFrequencyMHz,
  disabled,
}: {
  monitorNumber: 1 | 2;
  interrogationSpacing: number;
  interrogationFrequencyMHz: number | null;
  disabled: boolean;
}) {
  const parameters = useDmePmdtStore((state) => state.specialTestParameters[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const setParameter = useDmePmdtStore((state) => state.setSpecialTestParameter);
  const set = (key: keyof DmeSpecialTestParameters, value: number | boolean | string | null) => setParameter(monitorNumber, key, value);
  const checkId = (name: string) => `dme-special-${name}-${monitorNumber}`;

  return (
    <fieldset className="dme-pmdt-special-monitor">
      <legend>Monitor {monitorNumber}</legend>
      <h3>Interrogation Levels</h3>
      <NumberField monitorNumber={monitorNumber} label="Delay" value={parameters.delayLevelDbm} unit="dBm" min={-120} max={0} disabled={disabled} onChange={(value) => set("delayLevelDbm", value)} />
      <NumberField monitorNumber={monitorNumber} label="Efficiency" value={parameters.efficiencyLevelDbm} unit="dBm" min={-120} max={0} disabled={disabled} onChange={(value) => set("efficiencyLevelDbm", value)} />
      <h3>Interrogation Spacing</h3>
      <NumberField monitorNumber={monitorNumber} label="Spacing" value={interrogationSpacing} unit="us" min={0} max={100} disabled onChange={() => undefined} />
      <div className="dme-pmdt-special-choice">
        <label><input id={checkId("prf")} type="checkbox" checked={parameters.prfTestEnabled} disabled={disabled} onChange={(event) => set("prfTestEnabled", event.target.checked)} /> PRF Test</label>
        <NumberField monitorNumber={monitorNumber} label="PRF" value={parameters.prfPpps} unit="ppps" min={25} max={10000} step="1" disabled={disabled} onChange={(value) => set("prfPpps", value)} />
      </div>
      <h3>Echo Pulse Tests</h3>
      <div className="dme-pmdt-special-inline-options">
        <label><input id={checkId("echo-short")} type="radio" name={`echo-${monitorNumber}`} checked={parameters.echoMode === "short"} disabled={disabled} onChange={() => set("echoMode", "short")} /> Short Distance</label>
        <label><input id={checkId("echo-long")} type="radio" name={`echo-${monitorNumber}`} checked={parameters.echoMode === "long"} disabled={disabled} onChange={() => set("echoMode", "long")} /> Long Distance</label>
      </div>
      <NumberField monitorNumber={monitorNumber} label="Echo Delay" value={parameters.echoDelayUs} unit="us" min={0} max={350} disabled={disabled} onChange={(value) => set("echoDelayUs", value)} />
      <NumberField monitorNumber={monitorNumber} label="Echo Level" value={parameters.echoLevelDb} unit="dB" min={-10} max={0} disabled={disabled} onChange={(value) => set("echoLevelDb", value)} />
      <label className="dme-pmdt-special-checkbox"><input id={checkId("repeat-echo")} name={`repeat-echo-${monitorNumber}`} type="checkbox" checked={parameters.repeatEcho} disabled={disabled} onChange={(event) => set("repeatEcho", event.target.checked)} /> Repeat Echo Pulse</label>
      <h3>Recovery Time Pulse Test</h3>
      <label className="dme-pmdt-special-checkbox"><input id={checkId("pulse-level")} type="checkbox" checked={parameters.recoveryPulseEnabled} disabled={disabled} onChange={(event) => set("recoveryPulseEnabled", event.target.checked)} /> Pulse Level</label>
      <NumberField monitorNumber={monitorNumber} label="Pulse Level" value={parameters.recoveryPulseLevelDb} unit="dB" min={-30} max={0} disabled={disabled} onChange={(value) => set("recoveryPulseLevelDb", value)} />
      <label className="dme-pmdt-special-checkbox"><input id={checkId("cw-mode")} type="checkbox" checked={parameters.cwModeEnabled} disabled={disabled} onChange={(event) => set("cwModeEnabled", event.target.checked)} /> CW Mode</label>
      <h3>Sensitivity Test</h3>
      <label className="dme-pmdt-special-checkbox"><input id={checkId("cw-floor")} type="checkbox" checked={parameters.sensitivityTestEnabled} disabled={disabled} onChange={(event) => set("sensitivityTestEnabled", event.target.checked)} /> CW Floor</label>
      <NumberField monitorNumber={monitorNumber} label="CW Floor" value={parameters.cwFloorDb} unit="dB" min={-30} max={0} disabled={disabled} onChange={(value) => set("cwFloorDb", value)} />
      <label className="dme-pmdt-special-checkbox"><input id={checkId("decoder")} type="checkbox" checked={parameters.decoderTestsEnabled} disabled={disabled} onChange={(event) => set("decoderTestsEnabled", event.target.checked)} /> Decoder Tests</label>
      <label className="dme-pmdt-special-select">
        <span>Interrogation Frequency</span>
        <output id={`dme-special-interrogation-frequency-${monitorNumber}`}>
          {interrogationFrequencyMHz === null ? "—" : `${interrogationFrequencyMHz.toFixed(0)} MHz (Center)`}
        </output>
      </label>
    </fieldset>
  );
}

export function MonitorSpecialTests() {
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const station = useDmePmdtStore((state) => state.data.rmsConfigStation);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const selection = useDmePmdtStore((state) => state.specialTestSelection);
  const setSelection = useDmePmdtStore((state) => state.setSpecialTestSelection);
  const run = useDmePmdtStore((state) => state.specialTestRun);
  const startSpecialTests = useDmePmdtStore((state) => state.startSpecialTests);
  const stopSpecialTests = useDmePmdtStore((state) => state.stopSpecialTests);
  const resetParameters = useDmePmdtStore((state) => state.resetSpecialTestParameters);
  const delayControl = useDmePmdtStore((state) => state.data.delayControl);
  const allocation = getDmeStationChannelAllocation(station);
  const interrogationSpacing = allocation?.interrogatorPulseSpacingUs ?? 12;
  const interrogationFrequencyMHz = allocation?.monitorInterrogatorFrequencyMHz ?? null;
  const canOperate = securityLevel >= 3 && !loginDialogOpen && local;
  const running = run !== null;
  const progress = running ? Math.min(100, Math.round((run.elapsedSeconds / DME_SPECIAL_TEST_DURATION_SECONDS) * 100)) : 0;

  return (
    <section className="dme-screen dme-pmdt-special-tests flex min-h-full flex-col" aria-label="Special Tests">
      <PmdtToolbar title="Special Tests" />
      <div className="dme-pmdt-special-content">
        <time className="pmdt-monitor-date">{timestamp}</time>
        <p className="dme-pmdt-special-note">
          Lưu ý: trong Special Test Mode, monitor giữ các đường báo động ở trạng thái alarm và phải khởi động lại
          monitor để thoát; nên đặt DME trên tải (load) khi kiểm tra (manual §3.6.8.3). Khi test hoàn tất, kết quả
          Decoder được đo lại và hiển thị tại Monitor &gt;&gt; Test Results &gt;&gt; Decoder.
        </p>
        <div className="dme-pmdt-special-grid">
          <MonitorTestColumn monitorNumber={1} interrogationSpacing={interrogationSpacing} interrogationFrequencyMHz={interrogationFrequencyMHz} disabled={!canOperate || running} />
          <MonitorTestColumn monitorNumber={2} interrogationSpacing={interrogationSpacing} interrogationFrequencyMHz={interrogationFrequencyMHz} disabled={!canOperate || running} />
          <aside className="dme-pmdt-special-actions">
            <button type="button" disabled={!canOperate && !running} onClick={() => (running ? stopSpecialTests() : startSpecialTests())}>{running ? "Stop" : "Start"}</button>
            {running ? <p role="status">Special Tests running… {progress}%</p> : null}
            <label>
              <span>Monitor Selection</span>
              <select
                id="dme-special-monitor-selection"
                name="monitorSelection"
                value={selection}
                disabled={running}
                onChange={(event) => setSelection(event.target.value as "monitor1" | "monitor2" | "both")}
              >
                <option value="monitor1">Monitor 1</option>
                <option value="monitor2">Monitor 2</option>
                <option value="both">Both</option>
              </select>
            </label>
            <fieldset>
              <legend>Tx Maintenance Alerts</legend>
              <div>
                <span>RTC Delay Fixed</span>
                <strong>{delayControl.rtc1.fixed ? "Y" : "G"}</strong>
                <strong>{delayControl.rtc2.fixed ? "Y" : "G"}</strong>
              </div>
            </fieldset>
            <button type="button" disabled={running} onClick={resetParameters}>Restore Defaults</button>
          </aside>
        </div>
      </div>
    </section>
  );
}
