import { describe, expect, it } from "vitest";
import { createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { parseDvorConfigurationFile, serializeDvorConfiguration } from "@/lib/dvor1150a/configuration-file";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createLowCarrierAnd9960Scenario } from "@/lib/dvor1150a";

function maintenance() {
  const store = createVorPmdtStore();
  store.getState().setMode("student");
  store.getState().login("SEC3", "THREE");
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  store.getState().setTransmitterMode("tx1", "off");
  store.getState().setTransmitterMode("tx2", "off");
  return store;
}

const saved = () => serializeDvorConfiguration(createDefaultDvor1150aConfig());

describe("G15 training configuration files", () => {
  it("round-trips a versioned applied configuration without credentials or live session state", () => {
    const config = createDefaultDvor1150aConfig();
    config.station.stationDescription = "Training station";
    config.simulation.local = true;
    config.sidebandTrims!["1a4a1"].R3 = 90;
    const text = serializeDvorConfiguration(config);
    expect(JSON.parse(text)).toMatchObject({ version: 1, format: "cns-dvor1150a-training-configuration" });
    expect(text).not.toMatch(/password|THREE|authenticatedUserId|actionHistory/);
    const parsed = parseDvorConfigurationFile(text);
    expect(parsed.station).toEqual(config.station);
    expect(parsed.sidebandTrims).toEqual(config.sidebandTrims);
    expect(parsed.simulation.local).toBe(false);
  });

  it.each(["", "  ", "{", "null", "[]", "{}", "x".repeat(1024 * 1024 + 1)])("rejects empty, corrupt or oversized files without changing state (%#)", text => {
    const store = maintenance();
    const before = store.getState();
    expect(store.getState().loadConfigurationFile(text)).toBe(false);
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().configurationBackup).toBe(before.configurationBackup);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({ controlId: "configuration-file-load", accepted: false });
  });

  it.each(["version", "format", "missing", "extra", "enum", "range", "cross-field", "credential"])("rejects incompatible/invalid configuration: %s", kind => {
    const value = JSON.parse(saved());
    if (kind === "version") value.version = 2;
    if (kind === "format") value.format = "dvor-220";
    if (kind === "missing") delete value.configuration.monitor;
    if (kind === "extra") value.extra = true;
    if (kind === "credential") value.configuration.password = "not-a-real-password";
    if (kind === "enum") value.configuration.station.transmitterConfig = "Triple";
    if (kind === "range") value.configuration.transmitters.tx1.nominal.outputPower = -100;
    if (kind === "cross-field") value.configuration.monitor.sidebandVswr.preAlarm = 4;
    expect(() => parseDvorConfigurationFile(JSON.stringify(value))).toThrow();
  });

  it("loads immediately with both TX Off, retaining Local/Bypass, authentication and backup until explicit Backup", () => {
    const store = maintenance();
    expect(store.getState().backupConfig()).toBe(true);
    const before = store.getState();
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.nominal.outputPower = 80;
    expect(store.getState().loadConfigurationFile(serializeDvorConfiguration(config))).toBe(true);
    const state = store.getState();
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(80);
    for (const tx of Object.values(state.config.transmitters)) expect([tx.onAir, tx.load]).toEqual([false, false]);
    expect(state.config.simulation).toEqual(before.config.simulation);
    expect(state.configDraft).toEqual(state.config);
    expect(state.authenticatedUserId).toBe("SEC3");
    expect(state.configurationBackup).toBe(before.configurationBackup);
    expect(state.needBackup).toBe(true);
    expect(state.parameterChangeLogs).toContainEqual(expect.objectContaining({ file: "RMS", parameter: "Configuration Load" }));
    expect(state.actionHistory.at(-1)).toMatchObject({ controlId: "configuration-file-load", accepted: true });
    expect(state.backupConfig()).toBe(true);
    expect(store.getState().configurationBackup.transmitters.tx1.nominal.outputPower).toBe(80);
    expect(store.getState().needBackup).toBe(false);
  });

  it.each(["guest", "remote", "no-bypass", "antenna", "load", "draft", "protection", "scenario"])("rechecks load guards: %s", guard => {
    const store = maintenance();
    if (guard === "guest") store.getState().login("GUEST", "");
    if (guard === "remote") store.getState().setConfigValue("simulation.local", false);
    if (guard === "no-bypass") store.getState().setConfigValue("simulation.integralMonitorBypass", false);
    if (guard === "antenna") store.getState().setTransmitterMode("tx1", "main");
    if (guard === "load") store.getState().setTransmitterMode("tx1", "load");
    if (guard === "draft") store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 90);
    if (guard === "protection") store.setState({ protectionState: { ...store.getState().protectionState, phase: "lockout" } });
    if (guard === "scenario") store.getState().startReviewScenario(createLowCarrierAnd9960Scenario());
    const before = store.getState();
    expect(store.getState().loadConfigurationFile(saved())).toBe(false);
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().configDraft).toBe(before.configDraft);
  });
});
