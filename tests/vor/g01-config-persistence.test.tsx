import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SimulatorConfigPersistence } from "@/components/simulator/simulator-config-persistence";
import { createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { serializeDvorConfiguration } from "@/lib/dvor1150a/configuration-file";

const client = vi.hoisted(() => ({ load: vi.fn(), initialize: vi.fn(), apply: vi.fn() }));
vi.mock("@/lib/simulator-config/client", () => ({
  loadSimulatorConfig: client.load,
  initializeSimulatorConfig: client.initialize,
  applySimulatorConfig: client.apply,
}));

beforeEach(() => {
  vi.clearAllMocks();
  useVorPmdtStore.getState().reset();
});

it("persists an unchanged first explicit backup but never persists draft cancellation", async () => {
  const config = createDefaultDvor1150aConfig();
  client.load.mockResolvedValue({ appliedConfig: config, backupConfig: config, preferences: {}, persisted: true, revision: 1, history: [] });
  client.apply.mockResolvedValue({ revision: 2 });
  render(<SimulatorConfigPersistence simulatorId="dvor-1150a" />);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  act(() => {
    const store = useVorPmdtStore.getState();
    expect(store.hasConfigurationBackup).toBe(false);
    store.login("SEC3", "THREE");
    expect(useVorPmdtStore.getState().backupConfig()).toBe(true);
  });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(1));
  expect(client.apply.mock.calls[0][0]).toMatchObject({ action: "backup", simulatorId: "dvor-1150a" });
  act(() => {
    const store = useVorPmdtStore.getState();
    store.setConfigValue("simulation.local", true);
    store.setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    store.discardConfigChanges();
  });
  expect(client.apply).toHaveBeenCalledTimes(1);
});

it("hydrates the saved backup only when the profile records an explicit backup", async () => {
  const config = createDefaultDvor1150aConfig();
  config.transmitters.tx1.nominal.outputPower = 90;
  const backup = structuredClone(config);
  backup.transmitters.tx1.nominal.outputPower = 80;
  client.load.mockResolvedValue({ appliedConfig: config, backupConfig: backup,
    preferences: { dvor1150aHasBackup: true }, persisted: true, revision: 202, history: [] });
  render(<SimulatorConfigPersistence simulatorId="dvor-1150a" />);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  act(() => {
    const store = useVorPmdtStore.getState();
    store.login("SEC3", "THREE");
    store.setConfigValue("simulation.local", true);
    expect(store.restoreBackupConfig()).toBe(true);
  });
  expect(useVorPmdtStore.getState().config.transmitters.tx1.nominal.outputPower).toBe(80);
  await waitFor(() => expect(client.apply).toHaveBeenCalledWith(expect.objectContaining({ action: "restore" })));
});

it("persists immediate physical sideband calibration without F7, including its explicit backup and restore", async () => {
  const config = createDefaultDvor1150aConfig();
  client.load.mockResolvedValue({ appliedConfig: config, backupConfig: config, preferences: {}, persisted: true, revision: 1, history: [] });
  client.apply.mockResolvedValue({ revision: 2 });
  render(<SimulatorConfigPersistence simulatorId="dvor-1150a" />);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  act(() => { useVorPmdtStore.getState().turnSidebandTrim("sideband-1a4a1", "R3", 360); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(1));
  expect(client.apply.mock.calls[0][0]).toMatchObject({ action: "apply", changedFields: ["sidebandTrims.1a4a1.R3"], config: { sidebandTrims: { "1a4a1": { R3: 360 } } } });
  act(() => { const store = useVorPmdtStore.getState(); store.login("SEC3", "THREE"); store.setConfigValue("simulation.local", true); store.backupConfig(); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(2));
  expect(client.apply.mock.calls[1][0]).toMatchObject({ action: "backup", backupConfig: { sidebandTrims: { "1a4a1": { R3: 360 } } } });
  act(() => { useVorPmdtStore.getState().turnSidebandTrim("sideband-1a4a1", "R3", 360); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(3));
  act(() => { useVorPmdtStore.getState().restoreBackupConfig(); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(4));
  expect(client.apply.mock.calls[3][0]).toMatchObject({ action: "restore", config: { sidebandTrims: { "1a4a1": { R3: 360 } } } });
});

it("persists a loaded training file as applied state without replacing the explicit backup", async () => {
  const config = createDefaultDvor1150aConfig();
  client.load.mockResolvedValue({ appliedConfig: config, backupConfig: config, preferences: {}, persisted: true, revision: 1, history: [] });
  client.apply.mockResolvedValue({ revision: 2 });
  render(<SimulatorConfigPersistence simulatorId="dvor-1150a" />);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  const fileConfig = structuredClone(config);
  fileConfig.transmitters.tx1.nominal.outputPower = 80;
  act(() => {
    const state = useVorPmdtStore.getState();
    state.login("SEC3", "THREE");
    state.setConfigValue("simulation.local", true);
    state.setConfigValue("simulation.integralMonitorBypass", true);
    state.setTransmitterMode("tx1", "off");
    state.setTransmitterMode("tx2", "off");
    expect(useVorPmdtStore.getState().loadConfigurationFile(serializeDvorConfiguration(fileConfig))).toBe(true);
  });
  await waitFor(() => expect(client.apply).toHaveBeenCalledOnce());
  expect(client.apply.mock.calls[0][0]).toMatchObject({ action: "apply", config: { transmitters: { tx1: { nominal: { outputPower: 80 } } } }, backupConfig: undefined });
  expect(useVorPmdtStore.getState().configurationBackup.transmitters.tx1.nominal.outputPower).toBe(70);
  expect(useVorPmdtStore.getState().hasConfigurationBackup).toBe(false);
});

it("persists G14 detector calibration without F7 and includes it in explicit backup and restore", async () => {
  const config = createDefaultDvor1150aConfig();
  client.load.mockResolvedValue({ appliedConfig: config, backupConfig: config, preferences: {}, persisted: true, revision: 1, history: [] });
  client.apply.mockResolvedValue({ revision: 2 });
  render(<SimulatorConfigPersistence simulatorId="dvor-1150a" />);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
  act(() => {
    const store = useVorPmdtStore.getState();
    store.login("SEC3", "THREE");
    store.setConfigValue("simulation.local", true);
    store.setConfigValue("simulation.integralMonitorBypass", true);
    expect(store.turnHardwareTrim("bcps1", "R30", 15)).toBe(true);
  });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(1));
  expect(client.apply.mock.calls[0][0]).toMatchObject({ action: "apply", changedFields: ["hardwareCalibration.bcps1.R30"], config: { hardwareCalibration: { bcps1: { R30: 15 } } } });
  act(() => { expect(useVorPmdtStore.getState().backupConfig()).toBe(true); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(2));
  expect(client.apply.mock.calls[1][0]).toMatchObject({ action: "backup", backupConfig: { hardwareCalibration: { bcps1: { R30: 15 } } } });
  act(() => { useVorPmdtStore.getState().turnHardwareTrim("bcps1", "R30", 15); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(3));
  act(() => { expect(useVorPmdtStore.getState().restoreBackupConfig()).toBe(true); });
  await waitFor(() => expect(client.apply).toHaveBeenCalledTimes(4));
  expect(client.apply.mock.calls[3][0]).toMatchObject({ action: "restore", config: { hardwareCalibration: { bcps1: { R30: 15 } } } });
});
