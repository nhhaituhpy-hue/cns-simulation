import { describe, expect, it } from "vitest";
import { parseDvor220Config } from "@/lib/simulator-config/dvor-220";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import {
  deriveDvor220Snapshot, dvor220TransmitterPhysicalValue, dvor220TransmitterSetpoint,
} from "@/modules/operations/dvor-220/domain/engine";
import {
  DVOR220_MONITOR_CHANNEL_IDS, DVOR220_RF_OUTPUT_IDS, DVOR220_TRANSMITTER_IDS,
  type Dvor220CalibrationCommand, type Dvor220Command, type Dvor220DeviceState,
} from "@/modules/operations/dvor-220/domain/types";
import { createAuthorizedDvor220State } from "./helpers";

function run(state: Dvor220DeviceState, command: Dvor220Command) {
  const result = reduceDvor220Command(state, command);
  expect(result.ok, result.error).toBe(true);
  return result.state;
}

function calibrate(state: Dvor220DeviceState, calibration: Dvor220CalibrationCommand) {
  return run(state, { type: "calibrate", calibration });
}

describe("DVOR 220 calibration", () => {
  const txCases = DVOR220_TRANSMITTER_IDS.flatMap((tx) => [...DVOR220_RF_OUTPUT_IDS, "am30Hz", "ident1020Hz"].map(
    (parameter) => [tx, parameter] as [typeof tx, (typeof DVOR220_RF_OUTPUT_IDS)[number] | "am30Hz" | "ident1020Hz"],
  ));
  it.each(txCases)("changes the %s %s display setpoint without a physical output jump", (transmitterId, parameter) => {
    let state = createAuthorizedDvor220State();
    state.transmitters[transmitterId].powerOn = true;
    const output = parameter === "am30Hz" || parameter === "ident1020Hz" ? "carrier" : parameter;
    state.transmitters[transmitterId].rfOutputs[output] = true;
    const before = dvor220TransmitterPhysicalValue(state, transmitterId, parameter);
    const referenceValue = before * 1.01;
    const target = { kind: "transmitter-setpoint", transmitterId, parameter } as const;
    const configuration = structuredClone(state.configuration);
    state = calibrate(state, { ...target, indicatedValue: before, referenceValue });
    expect(dvor220TransmitterPhysicalValue(state, transmitterId, parameter)).toBeCloseTo(before, 10);
    expect(dvor220TransmitterSetpoint(state, transmitterId, parameter)).toBeCloseTo(referenceValue, 10);
    expect(state.configuration).toEqual(configuration);
    expect(state.calibration.saved.transmitterSetpointFactors[transmitterId][parameter]).toBe(1);
    state = run(state, { type: "save-calibration", target });
    expect(state.calibration.saved.transmitterSetpointFactors[transmitterId][parameter]).toBeCloseTo(1 / 1.01, 10);
    expect(state.configuration).toEqual(configuration);
    expect(parseDvor220Config(state.configuration.running)).toEqual(configuration.running);
    expect(parseDvor220Config(state.configuration.flash)).toEqual(configuration.flash);
  });

  it("keeps the saved setpoint compensation through reset without saving unrelated settings", () => {
    const original = createAuthorizedDvor220State();
    const target = { kind: "transmitter-setpoint", transmitterId: "tx1", parameter: "carrier" } as const;
    let state = calibrate(original, { ...target, indicatedValue: 100, referenceValue: 98 });
    state.configuration.running.station.voiceModulationPercent = 12;
    state = run(state, { type: "save-calibration", target });
    expect(state.configuration.flash.station.voiceModulationPercent).toBe(original.configuration.flash.station.voiceModulationPercent);
    state = run(state, { type: "reset" });
    expect(dvor220TransmitterPhysicalValue(state, "tx1", "carrier")).toBe(100);
    expect(dvor220TransmitterSetpoint(state, "tx1", "carrier")).toBe(98);
  });

  it("keeps TX reading and all five PDC power paths independent", () => {
    let state = createAuthorizedDvor220State();
    const baseline = deriveDvor220Snapshot(state);
    const txTarget = { kind: "transmitter-reading", transmitterId: "tx1", output: "usbCos" } as const;
    const indicatedValue = baseline.transmitters.tx1.forwardPowerW.usbCos;
    state = calibrate(state, { ...txTarget, indicatedValue, referenceValue: indicatedValue * 1.2 });
    expect(deriveDvor220Snapshot(state).pdc.forwardPowerW).toEqual(baseline.pdc.forwardPowerW);
    for (const parameter of DVOR220_RF_OUTPUT_IDS) {
      const target = { kind: "pdc", parameter } as const;
      const before = baseline.pdc.forwardPowerW[parameter];
      const next = calibrate(state, { ...target, indicatedValue: before, referenceValue: before * 1.03 });
      const snapshot = deriveDvor220Snapshot(next);
      expect(snapshot.pdc.forwardPowerW).toEqual({ ...baseline.pdc.forwardPowerW, [parameter]: before * 1.03 });
      expect(snapshot.transmitters.tx1.forwardPowerW).toEqual({ ...baseline.transmitters.tx1.forwardPowerW, usbCos: indicatedValue * 1.2 });
      expect(snapshot.pdc.antennas).toEqual(baseline.pdc.antennas);
    }
  });

  it("saves only the open target, and Initialize and Close do not write flash", () => {
    let state = createAuthorizedDvor220State();
    const pdc = { kind: "pdc", parameter: "carrier" } as const;
    const tx = { kind: "transmitter-reading", transmitterId: "tx1", output: "carrier" } as const;
    state = calibrate(state, { ...tx, indicatedValue: 100, referenceValue: 103 });
    state = run(state, { type: "save-calibration", target: tx });
    state = calibrate(state, { ...tx, indicatedValue: 103, referenceValue: 106 });
    state = calibrate(state, { ...pdc, indicatedValue: 100, referenceValue: 102 });
    state = run(state, { type: "save-calibration", target: pdc });
    expect(state.calibration.saved.transmitterReadingFactors.tx1.carrier).toBe(1.03);
    state = run(state, { type: "close-calibration", target: tx });
    expect(state.calibration.transmitterReadingFactors.tx1.carrier).toBe(1);
    state = run(state, { type: "initialize-calibration", target: pdc });
    expect(state.calibration.pdcFactors.carrier).toBe(1);
    state = run(state, { type: "power-cycle" });
    expect(state.calibration.transmitterReadingFactors.tx1.carrier).toBe(1.03);
    expect(state.calibration.pdcFactors.carrier).toBe(1.02);
  });

  it("scopes MON RF offsets to the selected channel and applies frequency to both monitor receivers", () => {
    let state = createAuthorizedDvor220State();
    const target = { kind: "monitor", monitorId: "mon2", channelId: "cha", parameter: "rfLevel" } as const;
    state = calibrate(state, { ...target, indicatedValue: -0.06, referenceValue: 1 });
    expect(state.calibration.monitorRfLevelOffsets.mon2.cha).toBeCloseTo(1.06);
    expect(state.calibration.monitorRfLevelOffsets.mon2.chb1).toBe(0);
    expect(state.calibration.monitorRfLevelOffsets.mon1.cha).toBe(0);
    const frequency = { kind: "monitor-frequency" } as const;
    state = calibrate(state, { ...frequency, readings: { mon1: 113.0001, mon2: 112.9999 }, referenceValue: 113 });
    expect(state.calibration.saved.monitorFactors.mon1.cha.carrierFrequency).toBe(1);
    state = run(state, { type: "save-calibration", target: frequency });
    for (const channel of DVOR220_MONITOR_CHANNEL_IDS) {
      expect(state.calibration.saved.monitorFactors.mon1[channel].carrierFrequency).toBeCloseTo(113 / 113.0001, 10);
      expect(state.calibration.saved.monitorFactors.mon2[channel].carrierFrequency).toBeCloseTo(113 / 112.9999, 10);
    }
    expect(state.calibration.saved.monitorRfLevelOffsets.mon2.cha).toBe(0);
    expect(state.configuration.running.station.frequencyMHz).toBe(113);
  });

  it("rejects calibration writes for read-only users and invalid factors", () => {
    const target = { kind: "pdc", parameter: "carrierVswr" } as const;
    const invalid = { type: "calibrate", calibration: { ...target, indicatedValue: 1.38, referenceValue: 0 } } as const;
    const readOnly = createAuthorizedDvor220State({ level: 1 });
    expect(reduceDvor220Command(readOnly, { type: "initialize-calibration", target }).ok).toBe(false);
    expect(reduceDvor220Command(readOnly, { type: "save-calibration", target }).ok).toBe(false);
    expect(reduceDvor220Command(createAuthorizedDvor220State(), invalid)).toMatchObject({ ok: false, error: expect.stringContaining("VSWR") });
  });
});
