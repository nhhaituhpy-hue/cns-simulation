import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/dme/pmdt-layout";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import { buildDmeMenuStructure, dmeMenuStructure } from "@/lib/dme-menu-structure";
import type { DmeMenuItem, DmePmdtData } from "@/lib/dme-types";
import { recomputeDmeDerivedData } from "@/lib/dme1119a/derived-data";
import {
  deriveDmeRmsResourceUtilization,
  deriveDmeUserSessions,
  dmeFlashWriteBusy,
  type DmeRmsResourceActivity,
} from "@/lib/dme1119a/rms-resources";
import { parseDme1119aConfig } from "@/lib/simulator-config/dme-1119a";
import { createDmePmdtStore, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { getDefaultDme1119aConfig as legacyDefault } from "../fixtures/dme-config-fa138e9/parser";

function loggedInStore() {
  const store = createDmePmdtStore();
  const account = store.getState().data.securityAccounts.find((item) => item.securityLevel === 3)!;
  expect(store.getState().login(account.userId, account.password)).toBe(true);
  expect(store.getState().setLocalMode(true)).toBe(true);
  return store;
}

function findMenuItem(items: readonly DmeMenuItem[], id: string): DmeMenuItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children ? findMenuItem(item.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
}

function menuItem(data: DmePmdtData, id: string): DmeMenuItem {
  for (const group of buildDmeMenuStructure(data)) {
    const found = findMenuItem(group.items, id);
    if (found) return found;
  }
  throw new Error(`Menu item not found: ${id}`);
}

describe("Stage 4 G07 — F8 discards the draft", () => {
  it("reset restores the draft from the applied config, never factory defaults", () => {
    const store = loggedInStore();
    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.rmsConfigStation.channelType).toBe("Y");

    store.getState().setParameterValue("rmsConfigStation.channelType", "X");
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().resetConfigDraft()).toBe(true);
    // The draft returns to the APPLIED value (Y). A factory restore would
    // have reset the applied data itself back to the default (X).
    expect(store.getState().configDraft.rmsConfigStation.channelType).toBe("Y");
    expect(store.getState().data.rmsConfigStation.channelType).toBe("Y");
    expect(store.getState().configDirty).toBe(false);
  });
});

describe("Stage 4 G07 — F8 key in the PMDT shell", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
  });

  it("pressing F8 abandons draft edits and leaves the applied config alone", () => {
    const account = useDmePmdtStore.getState().data.securityAccounts.find((item) => item.securityLevel === 3)!;
    expect(useDmePmdtStore.getState().login(account.userId, account.password)).toBe(true);
    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    render(<PmdtLayout />);
    useDmePmdtStore.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(useDmePmdtStore.getState().configDirty).toBe(true);

    fireEvent.keyDown(document, { key: "F8" });

    expect(useDmePmdtStore.getState().configDirty).toBe(false);
    expect(useDmePmdtStore.getState().configDraft.rmsConfigStation.channelType).toBe("X");
    expect(useDmePmdtStore.getState().data.rmsConfigStation.channelType).toBe("X");
  });
});

describe("Stage 4 G15 — unknown RMS commands are rejected", () => {
  it("rejects an unrecognised command id and logs it as rejected", () => {
    const store = loggedInStore();
    expect(store.getState().executeRmsCommand("rms-command-does-not-exist")).toBe(false);
    const entry = store.getState().commandActivityLogs[0];
    expect(entry?.command).toContain("rms-command-does-not-exist");
    expect(entry?.command).toContain("(rejected)");
  });

  it("rejects a spare-output command for a row that does not exist", () => {
    const store = loggedInStore();
    expect(store.getState().executeRmsCommand("rms-command-spare-output-9-high")).toBe(false);
    expect(store.getState().commandActivityLogs[0]?.command).toContain("(rejected)");
  });

  it("still accepts the legitimate menu commands", () => {
    const store = loggedInStore();
    expect(store.getState().executeRmsCommand("rms-command-fan-on")).toBe(true);
    expect(store.getState().data.rmsStatus.fanControl).toBe("On");
    expect(store.getState().executeRmsCommand("rms-command-spare-output-2-high")).toBe(true);
    expect(store.getState().data.digitalOutputs.find((row) => row.name === "Spare Output 2")?.status).toBe("High");
    expect(store.getState().executeRmsCommand("monitor-1-integral-first-pulse-delay")).toBe(true);
    expect(store.getState().data.monitorTrigger.monitor1).toBe("Integral Delay - 1st Pulse Delay");
  });
});

describe("Stage 4 G16 — menu checkmarks follow live state", () => {
  it("checks the active transmitter route, fan mode and ident mode", () => {
    const store = loggedInStore();
    let data = store.getState().data;
    expect(menuItem(data, "tx-command-1-antenna").checked).toBe(true);
    expect(menuItem(data, "tx-command-1-load").checked).toBe(false);
    expect(menuItem(data, "rms-command-fan-auto").checked).toBe(true);
    expect(menuItem(data, "tx-command-ident-normal").checked).toBe(true);

    expect(store.getState().setTransmitterMode("tx1", "load")).toBe(true);
    expect(store.getState().executeRmsCommand("tx-command-ident-continuous")).toBe(true);
    data = store.getState().data;
    expect(menuItem(data, "tx-command-1-antenna").checked).toBe(false);
    expect(menuItem(data, "tx-command-1-load").checked).toBe(true);
    expect(menuItem(data, "tx-command-ident-normal").checked).toBe(false);
    expect(menuItem(data, "tx-command-ident-continuous").checked).toBe(true);
  });

  it("checks the selected trigger source per monitor", () => {
    const store = loggedInStore();
    expect(menuItem(store.getState().data, "monitor-1-integral-normal").checked).toBe(true);
    expect(store.getState().executeRmsCommand("monitor-1-integral-first-pulse-delay")).toBe(true);
    const data = store.getState().data;
    expect(menuItem(data, "monitor-1-integral-normal").checked).toBe(false);
    expect(menuItem(data, "monitor-1-integral-first-pulse-delay").checked).toBe(true);
    expect(menuItem(data, "monitor-2-integral-normal").checked).toBe(true);
  });
});

describe("Stage 4 G14 — PA status columns are judged independently", () => {
  it("an injected HPA temperature reddens only that row's temperature column", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults!.temperature["HPA #1 Temperature"] = 95;
    const derived = recomputeDmeDerivedData(data);
    const hpa1 = derived.paStatus.find((row) => row.name === "HPA #1")!;
    const hpa2 = derived.paStatus.find((row) => row.name === "HPA #2")!;
    expect(hpa1.rmsTemperature).toBe("red");
    expect(hpa1.vswr).toBe("green");
    expect(hpa1.outputPower).toBe("green");
    expect(hpa2.rmsTemperature).toBe("green");
  });

  it("an HPA fault marks the pulse-fault and output columns without touching temperature", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults!.transmitters.tx1.hpaFault = true;
    const derived = recomputeDmeDerivedData(data);
    const hpa1 = derived.paStatus.find((row) => row.name === "HPA #1")!;
    const lpa1 = derived.paStatus.find((row) => row.name === "LPA #1")!;
    expect(hpa1.longPulseFault).toBe("red");
    expect(hpa1.outputPower).toBe("red");
    expect(hpa1.rmsTemperature).toBe("green");
    expect(lpa1.longPulseFault).toBe("green");
  });
});

describe("Stage 4 G21 — per-monitor detail data", () => {
  it("derives Monitor 2 detail rows from Monitor 2's own measurements", () => {
    const data = cloneDefaultDmePmdtData();
    data.monitorOffsets.monitor2[0].integral = 0.5;
    const derived = recomputeDmeDerivedData(data);
    const monitor1Delay = derived.monitorDetailData.monitor1.find((row) => row.label === "Delay")!;
    const monitor2Delay = derived.monitorDetailData.monitor2.find((row) => row.label === "Delay")!;
    const integralDelay = derived.integralData.find((row) => row.label === "Delay")!;
    expect(monitor2Delay.mon1Value).toBe(integralDelay.mon2Value);
    expect(monitor1Delay.mon1Value).toBe(integralDelay.mon1Value);
    expect(monitor2Delay.mon1Value).not.toBe(monitor1Delay.mon1Value);
  });
});

describe("Stage 4 G22 — Reset Intrusion/Smoke through the store", () => {
  it("clears the source latch, recomputes the alert, keeps the draft and logs the reset", () => {
    const store = loggedInStore();
    store.getState().setParameterValue("alert", true);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.manualAlertOverride).toBe(true);
    expect(store.getState().data.alert).toBe(true);

    // An unrelated draft edit must survive the reset (the old code cloned
    // the live data over the draft).
    store.getState().setParameterValue("rmsConfigStation.channelType", "Y");
    expect(store.getState().configDirty).toBe(true);

    expect(store.getState().executeRmsCommand("rms-command-reset-smoke")).toBe(true);
    const state = store.getState();
    expect(state.data.manualAlertOverride).toBe(false);
    expect(state.data.alert).toBe(false);
    expect(state.configDraft.manualAlertOverride).toBe(false);
    expect(state.configDraft.rmsConfigStation.channelType).toBe("Y");
    const log = state.data.maintenanceLogs[0];
    expect(log?.alert).toBe("Smoke/Intrusion Detector");
    expect(log?.state).toBe("Normal");
  });
});

describe("Stage 4 G12 — per-path monitor classification", () => {
  it("selecting a standby radio leaves the integral pair untouched", () => {
    const store = loggedInStore();
    store.getState().setParameterValue("monitorConfigGeneral.1.standbySecondary", true);
    const draft = store.getState().configDraft.monitorConfigGeneral[1];
    expect(draft.standbySecondary).toBe(true);
    expect(draft.standbyPrimary).toBe(false);
    expect(draft.integralPrimary).toBe(true);
    expect(draft.integralSecondary).toBe(false);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().data.monitorConfigGeneral[1].standbySecondary).toBe(true);
  });

  it("migrates a legacy shared-pair configuration onto both paths", () => {
    const parsed = parseDme1119aConfig(legacyDefault());
    expect(parsed).not.toBeNull();
    const spacing = parsed!.monitorConfigGeneral[1];
    expect(spacing.integralPrimary).toBe(true);
    expect(spacing.standbyPrimary).toBe(true);
    const erp = parsed!.monitorConfigGeneral.find((row) => row.parameter === "ERP")!;
    expect(erp.integralPrimary).toBe(true);
    expect(erp.standbyPrimary).toBe(false);
    expect(erp.standbySecondary).toBe(false);
  });
});

describe("Stage 4 G19 — RMS resource derivations", () => {
  const idle: DmeRmsResourceActivity = {
    alarmLogEntries: 0,
    maintenanceLogEntries: 0,
    faultSnapshotsByMonitor: { monitor1: 0, monitor2: 0 },
    diagnosticsActive: false,
    specialTestTargets: [],
    selfCalibrationMonitors: [],
    hasSavedConfiguration: false,
    hasBackupConfiguration: false,
    configDirty: false,
    onBattery: false,
  };

  it("derives user sessions from the logon/connection state", () => {
    expect(deriveDmeUserSessions({ connected: false, logonLevel: 3, rcsuConnectionEnabled: true })).toBe(0);
    expect(deriveDmeUserSessions({ connected: true, logonLevel: 0, rcsuConnectionEnabled: false })).toBe(0);
    expect(deriveDmeUserSessions({ connected: true, logonLevel: 3, rcsuConnectionEnabled: false })).toBe(1);
    expect(deriveDmeUserSessions({ connected: true, logonLevel: 3, rcsuConnectionEnabled: true })).toBe(2);
  });

  it("raises utilization with real activity and keeps the LCU row blank", () => {
    const idleUsage = deriveDmeRmsResourceUtilization(idle);
    const busyUsage = deriveDmeRmsResourceUtilization({
      ...idle,
      diagnosticsActive: true,
      selfCalibrationMonitors: [1],
      alarmLogEntries: 12,
    });
    expect(busyUsage.rms.ram).toBeGreaterThan(idleUsage.rms.ram!);
    expect(busyUsage.monitor1.ram).toBeGreaterThan(busyUsage.monitor2.ram!);
    expect(idleUsage.lcu).toEqual({ ram: null, flash: null, nvram: null });
  });

  it("reports flash busy only inside the write window after a flash write", () => {
    expect(dmeFlashWriteBusy(10_000, null)).toBe(false);
    expect(dmeFlashWriteBusy(10_000, 7_000)).toBe(true);
    expect(dmeFlashWriteBusy(10_000, 5_000)).toBe(false);
    const store = loggedInStore();
    expect(store.getState().flashWriteAtMs).toBeNull();
    expect(store.getState().saveConfig()).toBe(true);
    expect(store.getState().flashWriteAtMs).not.toBeNull();
  });
});

describe("Stage 4 G20 — PMDT menu stubs resolved", () => {
  it("enables Print Setup and Exit, and disables PMDT Setup with a specific reason", () => {
    const system = dmeMenuStructure.find((group) => group.id === "system")!;
    const printSetup = system.items.find((item) => item.id === "system-print-setup")!;
    const exit = system.items.find((item) => item.id === "system-exit")!;
    const pmdtSetup = system.items.find((item) => item.id === "system-pmdt-setup")!;
    expect(printSetup.enabled).toBe(true);
    expect(printSetup.action).toBe("open-print-setup");
    expect(exit.enabled).toBe(true);
    expect(exit.action).toBe("exit-pmdt");
    expect(pmdtSetup.enabled).toBe(false);
    expect(pmdtSetup.disabledReason).toContain("cổng truyền thông");
  });

  it("stores the print setup choices in the PMDT store", () => {
    const store = createDmePmdtStore();
    store.getState().setPrintSetup({ paperSize: "Letter", orientation: "landscape" });
    expect(store.getState().printSetup).toEqual({ paperSize: "Letter", orientation: "landscape" });
  });
});
