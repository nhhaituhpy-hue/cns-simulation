import { describe, expect, it } from "vitest";
import {
  applyDme1119aScenarioFaults,
  type Dme1119aScenarioFault,
} from "@/lib/dme1119a";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

const powerLoss: Dme1119aScenarioFault = {
  id: "fault-power-loss",
  kind: "tx-power-loss",
  transmitter: "tx1",
  lossDb: 30,
};

const identMissing: Dme1119aScenarioFault = {
  id: "fault-ident-missing",
  kind: "ident-signal",
  state: "missing",
};

function makeStore() {
  let current = new Date("2026-11-22T08:00:00Z");
  const store = createDmePmdtStore({ now: () => new Date(current) });
  store.getState().refreshClock();
  const tick = (seconds: number) => {
    current = new Date(current.getTime() + seconds * 1000);
    store.getState().refreshClock();
  };
  return { store, tick };
}

function loginLocal(store: ReturnType<typeof createDmePmdtStore>) {
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setLocalMode(true);
}

function injectFault(store: ReturnType<typeof createDmePmdtStore>, faults: Dme1119aScenarioFault[]) {
  const state = store.getState();
  store.setState({ data: applyDme1119aScenarioFaults(state.data, faults) });
}

describe("DME 1119A Stage 2 maintenance workflows (G03/G04/G05/G17)", () => {
  it("G03: self calibration reproduces the station capture at the −13.2 dBm baseline", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    expect(store.getState().startSelfCalibration(1)).toBe(true);
    tick(3);
    expect(store.getState().selfCalibrationRuns.monitor1.running).toBe(true);
    tick(3);
    const state = store.getState();
    expect(state.selfCalibrationRuns.monitor1.running).toBe(false);
    expect(state.lastSelfCalibrationAt.monitor1).not.toBeNull();
    const calibrated = state.data.monitorCalibrationSettings.monitor1.selfCalibrated;
    expect(calibrated.amplifier32Db).toBe(34.2);
    expect(calibrated.attenuator32Db).toBe(-32);
    expect(calibrated.signalGeneratorReferenceDb).toBe(-28.4);
    expect(calibrated.integralTxPowerScalePercent).toBe(114);
  });

  it("G03: changing Interrogator Nominal Power and re-running moves the self-calibrated values", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    store.getState().setParameterValue("monitorCalibrationSettings.monitor1.interrogatorNominalPowerDbm", -11.3);
    store.getState().applyConfigChanges();
    expect(store.getState().data.monitorCalibrationSettings.monitor1.interrogatorNominalPowerDbm).toBe(-11.3);
    expect(store.getState().startSelfCalibration(1)).toBe(true);
    tick(6);
    const calibrated = store.getState().data.monitorCalibrationSettings.monitor1.selfCalibrated;
    // HD-TTDMA §1 dual-monitor worked example: −11.3 dBm nominal power.
    expect(calibrated.amplifier32Db).toBe(32.3);
    expect(calibrated.signalGeneratorReferenceDb).toBe(-26.5);
    // The other monitor is untouched.
    expect(store.getState().data.monitorCalibrationSettings.monitor2.selfCalibrated.amplifier32Db).toBe(34.2);
  });

  it("G03: stop cancels a running self calibration without changing values", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    expect(store.getState().startSelfCalibration(2)).toBe(true);
    tick(2);
    store.getState().stopSelfCalibration(2);
    tick(10);
    const state = store.getState();
    expect(state.selfCalibrationRuns.monitor2.running).toBe(false);
    expect(state.lastSelfCalibrationAt.monitor2).toBeNull();
  });

  it("G04: a completed Special Test refreshes the measured decoder snapshot; config alone does not", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    const measuredSensitivity = () => store.getState().measuredDecoderResults.monitor1.rows[0].data;
    expect(measuredSensitivity()).toBe(-94.1);

    // Adjust the TX1 Rx Sensitivity Offset: the live derivation moves, the
    // measured snapshot must not (HDCV workflow: adjust, then re-measure).
    store.getState().setParameterValue("txOffsets.1.tx1", 2);
    store.getState().applyConfigChanges();
    expect(store.getState().data.decoderResults.monitor1[0].data).toBe(-92.1);
    expect(measuredSensitivity()).toBe(-94.1);

    store.getState().setSpecialTestParameter(1, "decoderTestsEnabled", true);
    expect(store.getState().startSpecialTests()).toBe(true);
    expect(store.getState().specialTestRunning).toBe(true);
    tick(20);
    const state = store.getState();
    expect(state.specialTestRunning).toBe(false);
    expect(measuredSensitivity()).toBe(-92.1);
    // Monitor 2 was not selected, so its snapshot keeps the baseline reading.
    expect(state.measuredDecoderResults.monitor2.rows[0].data).toBe(-94.1);
  });

  it("G05: free-run Full Diagnostics completes with NO FAULT FOUND when healthy", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    expect(store.getState().runDiagnostics("full")).toBe(true);
    tick(59);
    expect(store.getState().diagnosticsOutcome).toBeNull();
    tick(1);
    const state = store.getState();
    expect(state.diagnosticsRunning).toBe(false);
    expect(state.diagnosticsOutcome?.result).toBe("NO FAULT FOUND");
    expect(state.diagnosticsOutcome?.faultedSubsystems).toEqual([]);
  });

  it("G05: free-run diagnostics isolates the faulted subsystem when a fault is active", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    injectFault(store, [powerLoss]);
    expect(store.getState().runDiagnostics("on-air")).toBe(true);
    tick(30);
    const outcome = store.getState().diagnosticsOutcome;
    expect(outcome?.faultedSubsystems).toContain("Power Amplifiers");
    expect(outcome?.result).toContain("Power Amplifiers");
    injectFault(store, []);
  });

  it("G05: Full Diagnostics aborts when Local mode is lost mid-run", () => {
    const { store, tick } = makeStore();
    loginLocal(store);
    expect(store.getState().runDiagnostics("full")).toBe(true);
    tick(10);
    store.getState().setLocalMode(false);
    tick(1);
    const state = store.getState();
    expect(state.diagnosticsRunState).toBeNull();
    expect(state.diagnosticsRunning).toBe(false);
    expect(state.diagnosticsOutcome).toBeNull();
  });

  it("G17: the ident keyer options toggle through the draft/Apply flow", () => {
    const { store } = makeStore();
    loginLocal(store);
    store.getState().setParameterValue("txConfigNominal.ident.selfKeyOnLoss", true);
    expect(store.getState().data.txConfigNominal.ident.selfKeyOnLoss).toBe(false);
    store.getState().applyConfigChanges();
    expect(store.getState().data.txConfigNominal.ident.selfKeyOnLoss).toBe(true);
  });

  it("G17: Shutdown on Loss takes the on-air transmitter off air and Restart on Resume restores it", () => {
    const { store } = makeStore();
    loginLocal(store);
    store.getState().setParameterValue("txConfigNominal.ident.shutdownOnLoss", true);
    store.getState().setParameterValue("txConfigNominal.ident.restartWhenSignalResumes", true);
    store.getState().applyConfigChanges();
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn.tx1).toBe(true);
    injectFault(store, [identMissing]);
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn.tx1).toBe(false);
    expect(store.getState().identShutdownLatched).toBe(true);
    injectFault(store, []);
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn.tx1).toBe(true);
    expect(store.getState().identShutdownLatched).toBe(false);
  });

  it("G17: Self-Key on Loss keeps the ident status green while the keyed signal is missing", () => {
    const { store } = makeStore();
    loginLocal(store);
    store.getState().setParameterValue("txConfigNominal.ident.selfKeyOnLoss", true);
    store.getState().applyConfigChanges();
    injectFault(store, [identMissing]);
    const row = store.getState().data.integralData.find((item) => item.label === "Ident Status");
    expect(row?.mon1Status).toBe("green");
    // Self-key supersedes shutdown: the transmitter stays on air.
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn.tx1).toBe(true);
    injectFault(store, []);
  });
});
