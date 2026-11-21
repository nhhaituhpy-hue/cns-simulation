import { describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig, getDvorConfigValue } from "@/lib/dvor1150a";
import { dvorSidebandAssembly } from "@/lib/dvor1150a/sideband";
import { parseDvor1150aConfig, extractDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { projectSimulatorConfigResponse, preserveMissingDvor1150aExtensions, DVOR1150A_CONFIG_DTO_VERSION, DVOR1150A_CONFIG_DTO_V2, DVOR1150A_CONFIG_DTO_PREVIOUS_VERSION } from "@/lib/simulator-config/wire";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { readSidebandTransmitter } from "@/modules/devices/dvor-1150a/sideband-adjustment-model";

function station() {
  const store = createVorPmdtStore();
  const config = createDefaultDvor1150aConfig();
  config.simulation.local = true;
  config.simulation.integralMonitorBypass = true;
  for (const tx of Object.values(config.transmitters)) { tx.onAir = false; tx.load = true; }
  store.getState().replaceConfig(config);
  store.getState().setMode("student");
  return store;
}

describe("G07 native physical calibration", () => {
  it.each(["sideband-1a4a1", "sideband-1a4a2", "sideband-1a4a6", "sideband-1a4a7"])("isolates both channels of %s and keeps ADJ, CAL and software controls independent", occurrence => {
    const store = station();
    const { tx, first } = dvorSidebandAssembly(occurrence)!;
    const before = structuredClone(store.getState().derived.effectiveTransmitters);
    const offsets = structuredClone(store.getState().config.transmitters[tx].offsets);
    for (const [offset, adj, cal] of [[0, "R3", "R2"], [1, "R6", "R5"]] as const) {
      const channel = first + offset;
      expect(store.getState().turnSidebandTrim(occurrence, adj, 360)).toBe(true);
      const actual = before[tx].sidebandPower[channel] * 1.2;
      expect(store.getState().derived.effectiveTransmitters[tx].sidebandPower[channel]).toBeCloseTo(actual);
      expect(store.getState().turnSidebandTrim(occurrence, cal, 90)).toBe(true);
      expect(store.getState().derived.effectiveTransmitters[tx].sidebandPower[channel]).toBeCloseTo(actual);
      expect(store.getState().data.txPower[channel + 1][tx]).toBeCloseTo(actual * 1.1);
      expect(readSidebandTransmitter(store.getState().derived, occurrence)!.readings[channel]).toMatchObject({ sideband: channel + 1 });
      expect(readSidebandTransmitter(store.getState().derived, occurrence)!.readings[channel].indicatedPower).toBeCloseTo(actual * 1.1);
    }
    const peer = tx === "tx1" ? "tx2" : "tx1";
    expect(store.getState().derived.effectiveTransmitters[peer]).toEqual(before[peer]);
    expect(store.getState().config.transmitters[tx].offsets).toEqual(offsets);
    expect(store.getState().data.txOffsets.find(row => row.parameter === "Sideband 1 RF Level Scale")![tx]).toBe(offsets.sideband1RfLevelScale);
  });

  it("logs immediate applied angle changes in evidence and parameter history while preserving unrelated drafts", () => {
    const store = station();
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 360);
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(70);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(80);
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({ accepted: true, controlId: "sidebandTrims.1a4a1.R3",
      parameterChanges: [{ fieldId: "sidebandTrims.1a4a1.R3", before: 0, after: 360, phase: "apply" }] });
    expect(store.getState().parameterChangeLogs.some(row => row.parameter.includes("R3"))).toBe(true);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R2", 15);
    const logs = store.getState().parameterChangeLogs.filter(row => row.parameter === "Physical sideband trim");
    expect(logs).toHaveLength(2);
    expect(new Set(logs.map(row => row.id)).size).toBe(2);
    store.getState().discardConfigChanges();
    expect(getDvorConfigValue(store.getState().configDraft, "sidebandTrims.1a4a1.R3")).toBe(360);
  });

  it("backs up and restores all physical positions, physical power and indication without factory defaults", () => {
    const store = station();
    store.getState().login("SEC3", "THREE");
    for (const trim of ["R1", "R2", "R3", "R4", "R5", "R6"] as const) store.getState().turnSidebandTrim("sideband-1a4a1", trim, 90);
    expect(store.getState().backupConfig()).toBe(true);
    const saved = structuredClone(store.getState().config.sidebandTrims);
    const power = structuredClone(store.getState().data.txPower);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R2", -30);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 360);
    expect(store.getState().restoreBackupConfig()).toBe(true);
    expect(store.getState().config.sidebandTrims).toEqual(saved);
    expect(store.getState().data.txPower).toEqual(power);
    expect(parseDvor1150aConfig(extractDvor1150aConfig(store.getState().config))!.sidebandTrims).toEqual(saved);
  });

  it("does not turn physical phase pots into PMDT phase offsets or calibration into field RF", () => {
    const store = station();
    const config = structuredClone(store.getState().config);
    const physical = structuredClone(store.getState().derived.effectiveTransmitters);
    for (const trim of ["R1", "R4", "R2", "R5"] as const) store.getState().turnSidebandTrim("sideband-1a4a1", trim, 90);
    expect(store.getState().config.transmitters.tx1.offsets).toEqual(config.transmitters.tx1.offsets);
    expect(store.getState().derived.effectiveTransmitters.tx1.sidebandPower).toEqual(physical.tx1.sidebandPower);
  });

  it("leaves field detectors unchanged by CAL and combines physical power with independent PMDT voltage scales", () => {
    const store = station();
    const config = createDefaultDvor1150aConfig();
    config.simulation.local = true;
    store.getState().replaceConfig(config);
    const monitors = structuredClone(store.getState().derived.monitors);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R2", 90);
    expect(store.getState().derived.monitors).toEqual(monitors);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 360);
    const physical = store.getState().derived.effectiveTransmitters.tx1.sidebandPower[0];
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("transmitters.tx1.offsets.sideband1RfLevelScale", 70.7);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.effectiveTransmitters.tx1.sidebandPower[0]).toBeCloseTo(physical * 0.707 ** 2);
    expect(store.getState().data.txPower[1].tx1).toBeCloseTo(physical * 0.707 ** 2 * 1.1);
    expect(store.getState().config.sidebandTrims!["1a4a1"].R3).toBe(360);
  });

  it("clamps physical travel and never substitutes defaults for an unavailable backup", () => {
    const store = station();
    expect(store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 99999)).toBe(true);
    expect(store.getState().config.sidebandTrims!["1a4a1"].R3).toBe(1800);
    expect(store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 15)).toBe(false);
    store.getState().turnSidebandTrim("sideband-1a4a1", "R3", -99999);
    expect(store.getState().data.txPower[1].tx1).toBe(0);
    store.getState().login("SEC3", "THREE");
    expect(store.getState().restoreBackupConfig()).toBe(false);
    expect(store.getState().config.sidebandTrims!["1a4a1"].R3).toBe(-1800);
  });

  it("preserves physical settings when RF is Off and rejects absent, invalid and protected controls", () => {
    const store = station();
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.onAir = false;
    config.station.transmitterConfig = "Single Transmitter";
    store.getState().replaceConfig(config);
    expect(store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 360)).toBe(true);
    expect(store.getState().data.txPower[1].tx1).toBe(0);
    expect(store.getState().turnSidebandTrim("unknown", "R3", 15)).toBe(false);
    expect(store.getState().turnSidebandTrim("sideband-__proto__", "R3", 15)).toBe(false);
    expect(store.getState().turnSidebandTrim("sideband-1a4a6", "R3", 15)).toBe(false);
    expect(store.getState().turnSidebandTrim("sideband-1a4a1", "R3", NaN)).toBe(false);
    const definition = store.getState().scenarioDraft;
    store.setState({ scenario: { active: true, definition: { ...definition, editPolicy: { mode: "restricted", allowedFieldIds: [] }, studentEditableFieldIds: [] }, startedAt: null } });
    expect(store.getState().turnSidebandTrim("sideband-1a4a1", "R3", 15)).toBe(false);
    expect(store.getState().actionHistory.at(-1)?.accepted).toBe(false);
  });
});

describe("G07 additive profile compatibility", () => {
  it("backfills old profiles but rejects malformed or out-of-range physical angles", () => {
    const config = createDefaultDvor1150aConfig();
    delete config.sidebandTrims;
    expect(parseDvor1150aConfig(config)?.sidebandTrims?.["1a4a1"].R3).toBe(0);
    for (const angle of [NaN, Infinity, 1801]) {
      const bad = createDefaultDvor1150aConfig();
      bad.sidebandTrims!["1a4a1"].R3 = angle;
      expect(parseDvor1150aConfig(bad)).toBeNull();
    }
    expect(parseDvor1150aConfig({ ...config, sidebandTrims: {} })).toBeNull();
    expect(parseDvor1150aConfig(null)).toBeNull();
  });

  it.each([null, DVOR1150A_CONFIG_DTO_PREVIOUS_VERSION, DVOR1150A_CONFIG_DTO_V2])("preserves hidden calibration for older DTO %s", dto => {
    const config = extractDvor1150aConfig(createDefaultDvor1150aConfig());
    config.sidebandTrims!["1a4a1"].R3 = 360;
    const response = { simulatorId: "dvor-1150a" as const, appliedConfig: config, initialConfig: config, backupConfig: config,
      schemaVersion: 1, revision: 1, preferences: {}, history: [], persisted: true };
    const projected = projectSimulatorConfigResponse(response, dto);
    expect(projected.appliedConfig.sidebandTrims).toBeUndefined();
    const parsed = parseDvor1150aConfig(projected.appliedConfig)!;
    expect(preserveMissingDvor1150aExtensions(projected.appliedConfig, parsed, config).sidebandTrims!["1a4a1"].R3).toBe(360);
    expect(projectSimulatorConfigResponse(response, DVOR1150A_CONFIG_DTO_VERSION).appliedConfig.sidebandTrims!["1a4a1"].R3).toBe(360);
    expect(buildDvor1150aSnapshot(parsed).effectiveTransmitters.tx1.sidebandPower[0]).toBeGreaterThan(0);
  });
});
