import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { dvorLcuScreens, projectDvorHardware } from "@/lib/dvor1150a/hardware";

function station() {
  const store = createVorPmdtStore();
  store.getState().login("SEC3", "THREE");
  store.getState().lcuCommand("local");
  return store;
}

describe("G03 physical LCU on the native PMDT store", () => {
  it("gates RF commands on Local, not PMDT authentication, and keeps Main distinct from Antenna", () => {
    const store = createVorPmdtStore();
    expect(store.getState().lcuCommand("antenna", "tx2")).toBe(false);
    expect(store.getState().lcuCommand("local")).toBe(true);
    expect(store.getState().securityLevel).toBe(0);
    expect(store.getState().lcuCommand("antenna", "tx2")).toBe(true);
    expect(store.getState().derived.mainTransmitter).toBe("tx1");
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().data.rmsMonitorTransmitterStatus).toMatchObject({ mainSelect: 1, antennaSelect: 2 });
    expect(store.getState().lcuCommand("main", "tx2")).toBe(true);
    expect(store.getState().derived.mainTransmitter).toBe("tx2");
    expect(store.getState().lcuCommand("off", "tx2")).toBe(true);
    expect(store.getState().derived.mainTransmitter).toBe("tx2");
    expect(store.getState().lcu.relayRoutes.tx2).toBe("antenna");
    expect(store.getState().data.rmsMonitorTransmitterStatus.antennaSelect).toBe(2);
    expect(store.getState().lcuCommand("load", "tx2")).toBe(true);
    expect(store.getState().config.transmitters.tx2.load).toBe(true);
    expect(store.getState().lcuCommand("off", "tx2")).toBe(true);
    expect(store.getState().lcu.relayRoutes.tx2).toBe("load");
  });

  it("mirrors PMDT routing, preserves drafts and backup, and clears bypass when leaving Local", () => {
    const store = station();
    store.getState().backupConfig();
    const backup = store.getState().configurationBackup;
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    store.getState().setTransmitterMode("tx2", "main");
    expect(store.getState().lcu.relayRoutes).toEqual({ tx1: "load", tx2: "antenna" });
    store.getState().lcuCommand("bypass");
    expect(store.getState().config.simulation.integralMonitorBypass).toBe(true);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(80);
    store.getState().lcuCommand("local");
    expect(store.getState().config.simulation).toMatchObject({ local: false, integralMonitorBypass: false });
    expect(store.getState().configurationBackup).toBe(backup);
    expect(store.getState().configDirty).toBe(true);
  });

  it("resets processors/runtime without factory-resetting calibration or backup, including a 20 s initialization", () => {
    const store = station();
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    store.getState().applyConfigChanges();
    store.getState().backupConfig();
    const backup = store.getState().configurationBackup;
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 90);
    store.getState().lcuCommand("bypass");
    store.getState().lcuCommand("lamp-test");
    expect(store.getState().lcuCommand("reset")).toBe(true);
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(80);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(80);
    expect(store.getState().configurationBackup).toBe(backup);
    expect(store.getState().lcu.lampTest).toBe(false);
    expect(store.getState().config.simulation).toMatchObject({ local: false, integralMonitorBypass: false });
    expect(store.getState().securityLevel).toBe(0);
    expect(store.getState().protectionState).toMatchObject({ phase: "cold-transfer", remaining: 20 });
    expect(store.getState().lcu.initializing).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    store.getState().advanceMonitorTime(20);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    expect(store.getState().lcu.initializing).toBe(false);
    expect(store.getState().lastCommand).toBe("LCU/RMS/MON initialization complete");
    store.getState().login("SEC3", "THREE");
    store.getState().lcuCommand("local");
    store.getState().setConfigValue("station.standbyMode", "Hot Standby");
    store.getState().applyConfigChanges();
    store.getState().lcuCommand("reset");
    store.getState().advanceMonitorTime(25);
    expect(store.getState().config.transmitters.tx2.load).toBe(true);
    expect(store.getState().lastCommand).toBe("LCU/RMS/MON initialization complete");
  });

  it("rejects absent/disabled targets, power loss and protected RF starts", () => {
    const store = station();
    expect(store.getState().lcuCommand("main")).toBe(false);
    store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");
    store.getState().applyConfigChanges();
    expect(store.getState().lcuCommand("antenna", "tx2")).toBe(false);
    store.getState().setConfigValue("transmitters.tx1.faults.disabled", true);
    store.getState().applyConfigChanges();
    expect(store.getState().lcuCommand("main", "tx1")).toBe(false);
    store.getState().setOverride("rmsVoltageData.1.volts", 0);
    expect(store.getState().lcuCommand("local")).toBe(false);
    const normal = station();
    normal.getState().lcuCommand("reset");
    normal.getState().lcuCommand("local");
    expect(normal.getState().lcuCommand("antenna", "tx2")).toBe(false);
  });

  it("honors interlocked-off for both physical and PMDT commands without changing relays or auto-restarting", () => {
    const store = station();
    const routes = store.getState().lcu.relayRoutes;
    store.getState().setLcuInterlockedOff(true);
    expect(store.getState().lcu.relayRoutes).toEqual(routes);
    expect(store.getState().lcuCommand("antenna", "tx1")).toBe(false);
    expect(store.getState().setTransmitterMode("tx1", "main")).toBe(false);
    store.getState().advanceMonitorTime(1000);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    store.getState().setLcuInterlockedOff(false);
    expect(store.getState().lcuCommand("main", "tx1")).toBe(true);
  });

  it("qualifies each monitor independently under AND and Bypass, and silences only existing alarm conditions", () => {
    const store = station();
    store.getState().lcuCommand("bypass");
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    store.getState().applyConfigChanges();
    expect(projectDvorHardware(store.getState()).monitors[0].primary).toBe(true);
    expect(projectDvorHardware(store.getState()).monitors[0].qualifiedPrimary).toBe(false);
    store.getState().advanceMonitorTime(5);
    expect(projectDvorHardware(store.getState()).monitors[0].qualifiedPrimary).toBe(true);
    expect(projectDvorHardware(store.getState()).monitors[1].qualifiedPrimary).toBe(false);
    store.getState().lcuCommand("silence");
    expect(projectDvorHardware(store.getState()).audible).toBe(false);
    store.getState().setOverride("rmsStatus.rcsuCommunicationError", true);
    expect(projectDvorHardware(store.getState()).audible).toBe(true);
    store.getState().lcuCommand("silence");
    store.getState().removeOverride("rmsStatus.rcsuCommunicationError");
    store.getState().setOverride("rmsStatus.rcsuCommunicationError", true);
    expect(projectDvorHardware(store.getState()).audible).toBe(true);
  });

  it("does not carry a cleared detector timer into a new fault", () => {
    const store = station();
    store.getState().lcuCommand("bypass");
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    store.getState().applyConfigChanges();
    store.getState().advanceMonitorTime(4);
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 100);
    store.getState().applyConfigChanges();
    expect(store.getState().lcu.alarmElapsed).toEqual({});
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    store.getState().applyConfigChanges();
    store.getState().advanceMonitorTime(1);
    expect(projectDvorHardware(store.getState()).monitors[0].qualifiedPrimary).toBe(false);
  });

  it("clamps physical volume, ignores invalid time/volume and records distinct physical actions", () => {
    const store = createVorPmdtStore();
    store.getState().setMode("student");
    store.getState().lcuCommand("local");
    store.getState().lcuCommand("antenna", "tx2");
    expect(store.getState().actionHistory.map(event => event.controlId)).toEqual(["lcu-local", "lcu-antenna-tx2"]);
    store.getState().setLcuVolume(120);
    expect(store.getState().lcu.volume).toBe(100);
    store.getState().setLcuVolume(-2);
    expect(store.getState().lcu.volume).toBe(0);
    const state = store.getState();
    store.getState().setLcuVolume(NaN);
    for (const value of [NaN, Infinity, -1, 0]) store.getState().advanceMonitorTime(value);
    expect(store.getState()).toBe(state);
  });
});

describe("G04 live power and documented LCD readings", () => {
  it("honors the RMS LCU supply status independently of powered monitor cards", () => {
    const store = station();
    store.getState().setOverride("systemPowerStatus.6.tx1", "red");
    expect(projectDvorHardware(store.getState())).toMatchObject({ logicPower: true, lcuPower: false, audible: false });
    expect(projectDvorHardware(store.getState()).monitors[0].enabled).toBe(true);
    expect(store.getState().lcuCommand("antenna", "tx2")).toBe(false);
  });

  it("derives AC/battery/charge states, including the documented >1.5 A fast-charge boundary", () => {
    const store = createVorPmdtStore();
    expect(projectDvorHardware(store.getState()).supplies[0]).toMatchObject({ ac: true, dc: true, onBattery: false, batteryFault: false });
    store.getState().setOverride("rmsCurrentData.6.amps", 1.5);
    expect(projectDvorHardware(store.getState()).supplies[0]).toMatchObject({ fastCharge: false, trickleCharge: true });
    store.getState().setOverride("rmsCurrentData.6.amps", 1.51);
    expect(projectDvorHardware(store.getState()).supplies[0]).toMatchObject({ fastCharge: true, trickleCharge: false });
    store.getState().setOverride("rmsVoltageData.9.volts", 0);
    expect(projectDvorHardware(store.getState()).supplies[0]).toMatchObject({ ac: false, onBattery: true, fastCharge: false, trickleCharge: false });
    store.getState().setOverride("rmsVoltageData.15.volts", 0);
    expect(projectDvorHardware(store.getState()).supplies[0].batteryFault).toBe(true);
  });

  it("has all five manual LCD pages with live RMS values and graceful empty/missing readings", () => {
    const store = createVorPmdtStore();
    const pages = dvorLcuScreens(store.getState());
    expect(pages.map(page => page.title)).toEqual(["Integral Monitor 1", "Integral Monitor 2", "RMS/Facilities Power", "VOR Temps", "VOR PA Temps"]);
    expect(pages.map(page => page.rows.length)).toEqual([5, 5, 6, 5, 6]);
    store.getState().setOverride("rmsVoltageData.9.volts", 220);
    expect(dvorLcuScreens(store.getState())[2].rows[0]).toBe("AC Power 220.00");
    const empty = { ...store.getState(), data: { ...store.getState().data, rmsVoltageData: [], rmsCurrentData: [], rmsTemperatureData: [], systemPowerStatus: [], digitalOutputs: [] } };
    expect(dvorLcuScreens(empty)[2].rows[0]).toBe("AC Power —");
    expect(projectDvorHardware(empty).logicPower).toBe(false);
  });
});
