import { describe, expect, it } from "vitest";
import { defaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import { dmeMenuStructure } from "@/lib/dme-menu-structure";
import {
  createDmePmdtStore,
  resolveDmeField,
  resolveDmeStatus,
} from "@/stores/dme-pmdt-store";

describe("DME PMDT defaults", () => {
  it("contains the documented screen data without sharing mutable clones", () => {
    expect(defaultDmePmdtData.integralData).toHaveLength(14);
    expect(defaultDmePmdtData.standbyData).toHaveLength(12);
    expect(defaultDmePmdtData.alarmLimits).toHaveLength(9);
    expect(defaultDmePmdtData.paStatus).toHaveLength(4);
    expect(defaultDmePmdtData.rtcMaintenanceAlerts).toHaveLength(10);
    expect(defaultDmePmdtData.delayControl.rtc1.fixed).toBe(false);
    expect(defaultDmePmdtData.delayControl.rtc2.fixed).toBe(false);
    expect(dmeMenuStructure.map((group) => group.label)).toEqual([
      "System", "RMS", "Monitors", "Monitor 1", "Monitor 2", "Transmitters", "Diagnostics", "Info",
    ]);
  });
});

describe("DME PMDT store", () => {
  it("applies a typed alarm overlay without changing the baseline", () => {
    const store = createDmePmdtStore();
    store.getState().setOverride("integralData.2.mon1Value", "0", "alarm");
    expect(resolveDmeField(defaultDmePmdtData.integralData[2].mon1Value, "integralData.2.mon1Value", store.getState().overrides)).toBe("0");
    expect(resolveDmeStatus("normal", "integralData.2.mon1Value", store.getState().overrides)).toBe("alarm");
    expect(defaultDmePmdtData.integralData[2].mon1Value).toBe("1011");
  });

  it("records DME view visits, annotations, and checkpoints", () => {
    let id = 0;
    const store = createDmePmdtStore({
      now: () => new Date("2026-07-17T03:00:00.000Z"),
      generateId: () => `dme-id-${++id}`,
    });
    store.getState().initializeSession({ mode: "student" });
    store.getState().openView("tx-data", "tx-rtc-data", ["Transmitters", "Data", "RTC Data"], "RTC Data");
    store.getState().updateEventAnnotation("dme-id-1", "Kiểm tra propagation delay.");
    expect(store.getState().attemptEvents[0]).toMatchObject({
      viewId: "tx-rtc-data",
      annotation: "Kiểm tra propagation delay.",
      visitedAt: "2026-07-17T03:00:00.000Z",
    });

    store.getState().initializeSession({ mode: "author" });
    store.getState().openView("monitor-config", "monitor-alarm-limits", ["Monitors", "Configuration", "Alarm Limits"], "Alarm Limits");
    store.getState().addCurrentViewAsCheckpoint("Kiểm tra giới hạn delay.", 20);
    expect(store.getState().expectedCheckpoints[0]).toMatchObject({ viewId: "monitor-alarm-limits", points: 20 });
  });

  it("records separate integral and standby bypass interactions", () => {
    const store = createDmePmdtStore({ generateId: () => "sidebar-event" });
    store.getState().initializeSession({ mode: "student" });
    store.getState().interactWithSidebar("monitors.standby.bypass", "Standby Bypass", true, "yellow");
    expect(store.getState().studentFieldStates).toEqual([
      { fieldId: "monitors.standby.bypass", value: true, status: "yellow" },
    ]);
    expect(store.getState().attemptEvents[0]).toMatchObject({ eventType: "sidebar", resultValue: true, resultStatus: "yellow" });
  });

  it("keeps an official exam attempt separate from practice on the same scenario", () => {
    const store = createDmePmdtStore();
    store.getState().initializeSession({
      mode: "student",
      scenarioId: "dme-low-power",
      sessionKey: "exam-item-dme-1",
      userId: "student-user",
    });

    expect(store.getState()).toMatchObject({
      scenarioId: "dme-low-power",
      sessionKey: "exam-item-dme-1",
      userId: "student-user",
    });
  });

  it("enforces the documented security levels and the three-attempt lockout", () => {
    let currentTime = new Date(2026, 7, 9, 9, 10, 5);
    const store = createDmePmdtStore({ now: () => currentTime });
    expect(store.getState().login("SEC2", "TWO")).toBe(true);
    expect(store.getState().securityLevel).toBe(2);
    store.getState().logout();

    expect(store.getState().login("bad", "bad")).toBe(false);
    expect(store.getState().login("bad", "bad")).toBe(false);
    expect(store.getState().login("bad", "bad")).toBe(false);
    expect(store.getState().loginError).toMatch(/blocked/i);
    expect(store.getState().login("SEC3", "THREE")).toBe(false);

    currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000 + 1);
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().securityLevel).toBe(3);
  });

  it("logs out remote sessions after inactivity but keeps Local sessions active", () => {
    let currentTime = new Date(2026, 7, 9, 9, 10, 5);
    const remoteStore = createDmePmdtStore({ now: () => currentTime });
    expect(remoteStore.getState().login("SEC3", "THREE")).toBe(true);
    currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    remoteStore.getState().checkActivity();
    expect(remoteStore.getState().loginDialogOpen).toBe(true);

    currentTime = new Date(2026, 7, 9, 9, 10, 5);
    const localStore = createDmePmdtStore({ now: () => currentTime });
    expect(localStore.getState().login("SEC3", "THREE")).toBe(true);
    expect(localStore.getState().setLocalMode(true)).toBe(true);
    currentTime = new Date(currentTime.getTime() + 20 * 60 * 1000);
    localStore.getState().checkActivity();
    expect(localStore.getState().loginDialogOpen).toBe(false);
  });

  it("refreshes the realtime clock without creating a configuration change", () => {
    let currentTime = new Date(2026, 7, 9, 9, 10, 5);
    const store = createDmePmdtStore({ now: () => currentTime });
    expect(store.getState().data.timestamp).toBe("08/09/26 09:10:05");

    currentTime = new Date(2026, 7, 9, 9, 10, 6);
    store.getState().refreshClock();
    expect(store.getState().data.timestamp).toBe("09/08/26 09:10:06");
    expect(store.getState().configDraft.timestamp).toBe("09/08/26 09:10:06");
    expect(store.getState().configDirty).toBe(false);
  });

  it("supports Local password changes and Level 4 security-code staging", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC4", "FOUR")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);

    expect(store.getState().updateSecurityAccount(1, { userId: "OPS2", password: "LONGER2", securityLevel: 2 })).toBe(true);
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);

    expect(store.getState().changePassword("FOUR", "FOURNEW", "FOURNEW")).toBe(true);
    expect(store.getState().needBackup).toBe(true);
    store.getState().logout();
    expect(store.getState().login("SEC4", "FOUR")).toBe(false);
    expect(store.getState().login("SEC4", "FOURNEW")).toBe(true);
    expect(store.getState().login("OPS2", "LONGER2")).toBe(true);
  });

  it("leaves the security-code tab when a lower-level user logs in", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC4", "FOUR")).toBe(true);
    store.getState().openView(
      "rms-config",
      "rms-config-security-codes",
      ["RMS", "Configuration", "Security Codes"],
      "Security Codes",
    );
    store.getState().logout();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().activeView).toBe("rms-config-general");
  });

  it("recomputes monitor data when the transmitter ident command changes", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().executeRmsCommand("tx-command-ident-continuous")).toBe(true);
    expect(store.getState().data.identMode).toBe("continuous");
    expect(store.getState().data.integralData.find((row) => row.label === "Ident Status")?.mon1Value).toBe("Continuous");
  });

  it("keeps a staged configuration draft visible across Local mode changes", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(store.getState().configDirty).toBe(true);

    expect(store.getState().setLocalMode(false)).toBe(true);
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().configDraft.rmsConfigStation.channelType).toBe("Y");
    expect(store.getState().data.rmsConfigStation.channelType).toBe("X");

    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().configDirty).toBe(true);
  });

  it("applies DME channel and operation changes to monitor, decoder, VSWR, and traffic data", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    const before = store.getState().configDraft;

    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    store.getState().setParameterValue("txConfigNominal.operation.timing", "2nd Pulse");
    store.getState().setParameterValue("txConfigNominal.rtcParameters.minimumSquitter", 400);
    store.getState().setParameterValue("monitorOffsets.monitor1.9.integral", -5);

    const draft = store.getState().configDraft;
    expect(draft.integralData.find((row) => row.label === "Delay")?.mon1Value).toBe("56.04");
    expect(draft.integralData.find((row) => row.label === "Spacing")?.mon1Value).toBe("29.98");
    expect(draft.decoderResults.monitor1[0].parameter).toBe("Receiver Sensitivity @ 36.0 us (R)");
    expect(Number(draft.integralData.find((row) => row.label === "VSWR")?.mon1Value)).toBeGreaterThan(1.3);
    expect(draft.trafficLoad.find((row) => row.band === "Total Replies")?.tx1 ?? 0).toBeLessThan(
      before.trafficLoad.find((row) => row.band === "Total Replies")?.tx1 ?? 0,
    );

    expect(store.getState().data.rmsConfigStation.channelType).toBe("X");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.rmsConfigStation.channelType).toBe("Y");
    expect(store.getState().needBackup).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().needBackup).toBe(false);
  });

  it("keeps System file load separate from RMS EEPROM restore", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);

    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().saveConfig()).toBe(true);

    store.getState().setParameterValue("rmsConfigStation.channelType", "X");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);

    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().restoreConfig()).toBe(true);
    expect(store.getState().data.rmsConfigStation.channelType).toBe("X");
    expect(store.getState().needBackup).toBe(false);

    expect(store.getState().loadConfig()).toBe(true);
    expect(store.getState().data.rmsConfigStation.channelType).toBe("Y");
    expect(store.getState().needBackup).toBe(true);
  });

  it("reflects Monitor Trigger commands in the selected monitor status", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);

    expect(store.getState().executeRmsCommand("monitor-1-integral-first-pulse-delay")).toBe(true);
    expect(store.getState().data.monitorTrigger).toEqual({ monitor1: "Integral Delay - 1st Pulse Delay", monitor2: "Integral Delay" });
    expect(store.getState().executeRmsCommand("monitor-2-trigger-forward-power")).toBe(true);
    expect(store.getState().data.monitorTrigger).toEqual({ monitor1: "Integral Delay - 1st Pulse Delay", monitor2: "Forward Power" });
    expect(store.getState().executeRmsCommand("rms-command-reset-rms")).toBe(true);
    expect(store.getState().data.monitorTrigger).toEqual({ monitor1: "Integral Delay", monitor2: "Integral Delay" });
  });

  it("removes both reply and monitor traffic from an explicitly Off transmitter", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().setTransmitterMode("tx1", "off")).toBe(true);
    expect(store.getState().data.trafficLoad.find((row) => row.band === "Total Replies")?.tx1).toBe(0);
    expect(store.getState().data.trafficLoad.find((row) => row.band === "Monitor Replies")?.tx1).toBe(0);
    expect(store.getState().data.trafficLoad.find((row) => row.band === "Total Replies")?.tx2 ?? 0).toBeGreaterThan(0);
  });

  it("allows TX1 to TX2 transfer in Remote without Local or monitor Bypass", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().data.local).toBe(false);
    expect(store.getState().data.monitors.integral.bypass).toBe(false);
    expect(store.getState().data.monitors.standby.bypass).toBe(false);

    expect(store.getState().executeRmsCommand("tx-command-transfer")).toBe(true);
    const state = store.getState().data;
    expect(state.monitorTransmitterStatus.mainSelect).toBe(2);
    expect(state.monitorTransmitterStatus.antennaSelect).toBe(2);
    expect(state.monitorTransmitterStatus.transmitterOn).toEqual({ tx1: true, tx2: true });
    expect(store.getState().lastCommand).toBe("TX Transfer -> TX2");
  });

  it("performs one automatic transfer at Apply and keeps Main on TX1", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setParameterValue("txOffsets.0.tx1", 0);

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.monitorTransmitterStatus.mainSelect).toBe(1);
    expect(store.getState().data.monitorTransmitterStatus.antennaSelect).toBe(2);
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn).toEqual({ tx1: false, tx2: true });
    expect(store.getState().data.transmitters.tx1).toMatchObject({ main: "green", off: "red" });
    expect(store.getState().data.transmitters.tx2.antenna).toBe("green");
    expect(store.getState().lastCommand).toBe("Automatic monitor transfer to TX2");
  });

  it("turns both DME transmitters Off when the standby path alarms too", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setParameterValue("txOffsets.0.tx1", 0);
    store.getState().setParameterValue("txOffsets.0.tx2", 0);

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.monitorTransmitterStatus.transmitterOn).toEqual({ tx1: false, tx2: false });
    expect(store.getState().data.transmitters.tx1.off).toBe("red");
    expect(store.getState().data.transmitters.tx2.off).toBe("red");
    expect(store.getState().lastCommand).toBe("Automatic monitor shutdown: both transmitters off");
  });

  it("applies independent TX1/TX2 power scales and remaps monitor/ERP/sidebar data after transfer", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);

    const baseTx2Power = store.getState().data.standbyData.find((row) => row.label === "Tx Power")?.mon1Value;
    store.getState().setParameterValue("txOffsets.0.tx1", 60);
    const draft = store.getState().configDraft;
    expect(Number(draft.integralData.find((row) => row.label === "Tx Power")?.mon1Value)).toBeGreaterThan(1011);
    expect(draft.standbyData.find((row) => row.label === "Tx Power")?.mon1Value).toBe(baseTx2Power);
    expect(draft.integralData.find((row) => row.label === "ERP")?.mon1Value).toBe("0.7");

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().needBackup).toBe(true);
    expect(store.getState().data.monitorTransmitterStatus.antennaSelect).toBe(1);
    expect(store.getState().data.paStatus.find((row) => row.name === "HPA #2")?.outputPower).toBe("green");

    expect(store.getState().executeRmsCommand("tx-command-transfer")).toBe(true);
    const transferred = store.getState().data;
    expect(transferred.monitorTransmitterStatus.antennaSelect).toBe(2);
    expect(transferred.integralData.find((row) => row.label === "Tx Power")?.mon1Value).toBe("968");
    expect(transferred.standbyData.find((row) => row.label === "Tx Power")?.mon1Value).toBe("1182");
    expect(transferred.integralData.find((row) => row.label === "ERP")?.mon1Value).toBe("0.0");
    expect(transferred.sidebarParams.txPower.value).toBe(968);
    expect(store.getState().needBackup).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().needBackup).toBe(false);
  });

  it("keeps TX1=70 and TX2=60 isolated in the draft, then transfers the active path on Apply", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);

    const baseTx1Power = Number(store.getState().configDraft.integralData.find((row) => row.label === "Tx Power")?.mon1Value);
    const baseTx2Power = Number(store.getState().configDraft.standbyData.find((row) => row.label === "Tx Power")?.mon1Value);
    store.getState().setParameterValue("txOffsets.0.tx1", 70);
    const tx1Only = store.getState().configDraft;
    const tx1Power = Number(tx1Only.integralData.find((row) => row.label === "Tx Power")?.mon1Value);
    expect(tx1Power).toBeGreaterThan(baseTx1Power);
    expect(Number(tx1Only.standbyData.find((row) => row.label === "Tx Power")?.mon1Value)).toBe(baseTx2Power);

    store.getState().setParameterValue("txOffsets.0.tx2", 60);
    const bothScaled = store.getState().configDraft;
    expect(Number(bothScaled.integralData.find((row) => row.label === "Tx Power")?.mon1Value)).toBe(tx1Power);
    expect(Number(bothScaled.standbyData.find((row) => row.label === "Tx Power")?.mon1Value)).toBeGreaterThan(baseTx2Power);

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().needBackup).toBe(true);
    const applied = store.getState().data;
    expect(applied.monitorTransmitterStatus.antennaSelect).toBe(2);
    expect(applied.integralData.find((row) => row.label === "Tx Power")?.mon1Value).toBe("1088");
    expect(applied.standbyData.find((row) => row.label === "Tx Power")?.mon1Value).toBe("0");
    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().needBackup).toBe(false);
  });

  it("executes RMS fan, audio, spare-output, time, and hardware-reset commands", () => {
    let currentTime = new Date(2026, 7, 9, 9, 10, 5);
    const store = createDmePmdtStore({ now: () => currentTime });
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);

    expect(store.getState().executeRmsCommand("rms-command-fan-on")).toBe(true);
    expect(store.getState().data.rmsStatus.fanControl).toBe("On");
    expect(store.getState().data.digitalOutputs.find((row) => row.name === "Fan Control")?.status).toBe("On");
    expect(store.getState().executeRmsCommand("rms-command-select-audio-tx2")).toBe(true);
    expect(store.getState().data.rmsStatus.audioSelect).toBe("tx2");
    expect(store.getState().executeRmsCommand("rms-command-spare-output-2-high")).toBe(true);
    expect(store.getState().data.digitalOutputs.find((row) => row.name === "Spare Output 2")?.status).toBe("High");
    expect(store.getState().executeRmsCommand("rms-command-bcps-1-enable")).toBe(true);
    expect(store.getState().data.bcpsChargerEnabled.bcps1).toBe(true);
    expect(store.getState().data.digitalOutputs.find((row) => row.name === "Battery Charger")?.status).toBe("On");

    currentTime = new Date(2026, 7, 9, 10, 11, 12);
    expect(store.getState().executeRmsCommand("rms-command-set-time")).toBe(true);
    expect(store.getState().data.timestamp).toBe("09/08/26 10:11:12");

    expect(store.getState().executeRmsCommand("rms-command-reset-rms")).toBe(true);
    expect(store.getState().data.local).toBe(false);
    expect(store.getState().data.rmsStatus.fanControl).toBe("Automatic");
    expect(store.getState().data.rmsStatus.audioSelect).toBe("tx1");
    expect(store.getState().data.digitalOutputs.find((row) => row.name === "Spare Output 2")?.status).toBe("Low");
    expect(store.getState().data.bcpsChargerEnabled.bcps1).toBe(false);
  });

  it("supports the manual RMS command-mode and reset command names", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);

    expect(store.getState().executeRmsCommand("rms-command-enable-mode")).toBe(true);
    expect(store.getState().data.local).toBe(true);
    expect(store.getState().executeRmsCommand("rms-command-disable-mode")).toBe(true);
    expect(store.getState().data.local).toBe(false);

    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().executeRmsCommand("rms-command-reset-rms-cpu")).toBe(true);
    expect(store.getState().lastCommand).toBe("Reset RMS CPU");
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().executeRmsCommand("rms-command-reset-station-hardware")).toBe(true);
    expect(store.getState().lastCommand).toBe("Reset Station Hardware");
  });
});
