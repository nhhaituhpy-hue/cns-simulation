"use client";

import { PmdtToolbar } from "../pmdt-toolbar";
import { getDmeStationChannelAllocation } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

function NumberField({ monitorNumber, label, value, unit }: { monitorNumber: 1 | 2; label: string; value: string; unit: string }) {
  const inputId = `dme-special-${monitorNumber}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="dme-pmdt-special-number">
      <span>{label}</span>
      <input id={inputId} name={inputId} type="number" step="any" readOnly value={value} aria-label={label} />
      <small>{unit}</small>
    </label>
  );
}

function MonitorTestColumn({ monitorNumber, interrogationSpacing }: { monitorNumber: 1 | 2; interrogationSpacing: number }) {
  return (
    <fieldset className="dme-pmdt-special-monitor">
      <legend>Monitor {monitorNumber}</legend>
      <h3>Interrogation Levels</h3>
      <NumberField monitorNumber={monitorNumber} label="Delay" value="-50.0" unit="dBm" />
      <NumberField monitorNumber={monitorNumber} label="Efficiency" value="-88.0" unit="dBm" />
      <h3>Interrogation Spacing</h3>
      <NumberField monitorNumber={monitorNumber} label="Spacing" value={interrogationSpacing.toFixed(2)} unit="us" />
      <div className="dme-pmdt-special-choice">
        <label><input id={`dme-special-prf-${monitorNumber}`} type="radio" name={`prf-${monitorNumber}`} /> PRF Test</label>
        <NumberField monitorNumber={monitorNumber} label="PRF" value="5400" unit="ppps" />
      </div>
      <h3>Echo Pulse Tests</h3>
      <div className="dme-pmdt-special-inline-options">
        <label><input id={`dme-special-echo-short-${monitorNumber}`} type="radio" name={`echo-${monitorNumber}`} /> Short Distance</label>
        <label><input id={`dme-special-echo-long-${monitorNumber}`} type="radio" name={`echo-${monitorNumber}`} /> Long Distance</label>
      </div>
      <NumberField monitorNumber={monitorNumber} label="Echo Delay" value="0.00" unit="us" />
      <NumberField monitorNumber={monitorNumber} label="Echo Level" value="0" unit="dB" />
      <label className="dme-pmdt-special-checkbox"><input id={`dme-special-repeat-echo-${monitorNumber}`} name={`repeat-echo-${monitorNumber}`} type="checkbox" /> Repeat Echo Pulse</label>
      <h3>Recovery Time Pulse Test</h3>
      <label className="dme-pmdt-special-checkbox"><input id={`dme-special-pulse-level-${monitorNumber}`} type="radio" name={`recovery-${monitorNumber}`} /> Pulse Level</label>
      <NumberField monitorNumber={monitorNumber} label="Pulse Level" value="0" unit="dB" />
      <label className="dme-pmdt-special-checkbox"><input id={`dme-special-cw-mode-${monitorNumber}`} type="radio" name={`cw-${monitorNumber}`} /> CW Mode</label>
      <h3>Sensitivity Test</h3>
      <label className="dme-pmdt-special-checkbox"><input id={`dme-special-cw-floor-${monitorNumber}`} type="radio" name={`sensitivity-${monitorNumber}`} /> CW Floor</label>
      <NumberField monitorNumber={monitorNumber} label="CW Floor" value="-10.0" unit="dB" />
      <label className="dme-pmdt-special-checkbox"><input id={`dme-special-decoder-${monitorNumber}`} type="radio" name={`decoder-${monitorNumber}`} /> Decoder Tests</label>
      <label className="dme-pmdt-special-select"><span>Interrogation Frequency</span><select id={`dme-special-interrogation-frequency-${monitorNumber}`} name={`interrogation-frequency-${monitorNumber}`} value="Center" onChange={() => undefined}><option>Center</option></select></label>
    </fieldset>
  );
}

export function MonitorSpecialTests() {
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const station = useDmePmdtStore((state) => state.data.rmsConfigStation);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const specialTestRunning = useDmePmdtStore((state) => state.specialTestRunning);
  const setSpecialTestRunning = useDmePmdtStore((state) => state.setSpecialTestRunning);
  const allocation = getDmeStationChannelAllocation(station);
  const interrogationSpacing = allocation?.interrogatorPulseSpacingUs ?? 12;
  const canOperate = securityLevel >= 3 && !loginDialogOpen && local;
  return (
    <section className="dme-screen dme-pmdt-special-tests flex min-h-full flex-col" aria-label="Special Tests">
      <PmdtToolbar title="Special Tests" />
      <div className="dme-pmdt-special-content">
        <time className="pmdt-monitor-date">{timestamp}</time>
        <div className="dme-pmdt-special-grid">
          <MonitorTestColumn monitorNumber={1} interrogationSpacing={interrogationSpacing} />
          <MonitorTestColumn monitorNumber={2} interrogationSpacing={interrogationSpacing} />
          <aside className="dme-pmdt-special-actions">
            <button type="button" disabled={!canOperate} onClick={() => setSpecialTestRunning(!specialTestRunning)}>{specialTestRunning ? "Stop" : "Start"}</button>
            <label><span>Monitor Selection</span><select id="dme-special-monitor-selection" name="monitorSelection" value="Normal" onChange={() => undefined}><option>Normal</option></select></label>
            <fieldset><legend>Tx Maintenance Alerts</legend><div><span>RTC Delay Fixed</span><strong>G</strong><strong>G</strong></div></fieldset>
            <button type="button" onClick={() => setSpecialTestRunning(false)}>Restore Defaults</button>
          </aside>
        </div>
      </div>
    </section>
  );
}
