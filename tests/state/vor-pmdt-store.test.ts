import { describe, expect, it } from "vitest";
import { defaultVorPmdtData } from "@/lib/vor-pmdt-defaults";
import { vorMenuStructure } from "@/lib/vor-menu-structure";
import {
  createVorPmdtStore,
  resolveVorField,
  resolveVorStatus,
} from "@/stores/vor-pmdt-store";

describe("VOR PMDT defaults", () => {
  it("keeps the documented table sizes and menu hierarchy", () => {
    expect(defaultVorPmdtData.generalAlerts).toHaveLength(15);
    expect(defaultVorPmdtData.monitorAgenAlerts).toHaveLength(8);
    expect(defaultVorPmdtData.alarmLogs).toHaveLength(20);
    expect(defaultVorPmdtData.maintenanceLogs).toHaveLength(20);
    expect(defaultVorPmdtData.integralData).toHaveLength(11);
    expect(defaultVorPmdtData.vswrData).toHaveLength(48);
    expect(defaultVorPmdtData.alarmLimits).toHaveLength(7);
    expect(defaultVorPmdtData.monitorOffsets).toHaveLength(12);
    expect(defaultVorPmdtData.txOffsets).toHaveLength(18);
    expect(vorMenuStructure).toHaveLength(8);

    const monitor1 = vorMenuStructure.find((group) => group.id === "monitor-1");
    const testSignal = monitor1?.items.find((item) =>
      item.id.endsWith("test-signal"),
    );
    const transmitters = vorMenuStructure.find(
      (group) => group.id === "transmitters",
    );
    const commands = transmitters?.items.find((item) =>
      item.id.endsWith("commands"),
    );

    expect(testSignal?.children).toHaveLength(8);
    expect(commands?.children?.map((item) => [item.label, item.enabled])).toEqual([
      ["Transfer", true],
      ["Transmitter 1", true],
      ["Transmitter 2", true],
      ["Transmitter Ident", true],
      ["Hold Commutator...", false],
    ]);
  });
});

describe("VOR PMDT store", () => {
  function enterMaintenanceMode(store: ReturnType<typeof createVorPmdtStore>) {
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  }

  it("applies typed overlays without mutating the baseline", () => {
    const store = createVorPmdtStore();
    store.getState().setOverride("txPower.0.tx1", 0, "red");

    expect(
      resolveVorField(
        defaultVorPmdtData.txPower[0].tx1,
        "txPower.0.tx1",
        store.getState().overrides,
      ),
    ).toBe(0);
    expect(
      resolveVorStatus("green", "txPower.0.tx1", store.getState().overrides),
    ).toBe("red");
    expect(defaultVorPmdtData.txPower[0].tx1).toBe(98.8);
  });

  it("records student investigation visits and annotations", () => {
    const store = createVorPmdtStore({
      now: () => new Date("2026-07-16T10:00:00.000Z"),
      generateId: () => "event-1",
    });
    store.getState().initializeSession({
      mode: "student",
      scenarioId: "vor-loss-of-power",
      sessionKey: "exam-item-vor-1",
      userId: "student-user",
      studentName: "Nguyen Van A",
      workUnit: "Doi TSS",
    });
    store.getState().openView(
      "tx-data",
      "tx-data-main",
      ["Transmitters", "Data", "Transmitter Data"],
      "Transmitter Data",
    );
    store.getState().updateEventAnnotation("event-1", "Tx #1 mất công suất.");

    expect(store.getState().attemptEvents[0]).toMatchObject({
      viewId: "tx-data-main",
      annotation: "Tx #1 mất công suất.",
      visitedAt: "2026-07-16T10:00:00.000Z",
    });
  });

  it("lets an author mark the current PMDT view as a checkpoint", () => {
    const store = createVorPmdtStore({ generateId: () => "checkpoint-1" });
    store.getState().initializeSession({ mode: "author" });
    store.getState().openView(
      "rms-logs",
      "rms-logs-alarms",
      ["RMS", "Logs", "Alarms"],
      "Alarms",
    );
    store.getState().addCurrentViewAsCheckpoint(
      "Kiểm tra alarm liên quan đến transmitter.",
      20,
    );

    expect(store.getState().expectedCheckpoints).toEqual([
      expect.objectContaining({
        id: "checkpoint-1",
        viewId: "rms-logs-alarms",
        points: 20,
      }),
    ]);
  });

  it("records a student sidebar interaction and resulting color", () => {
    const store = createVorPmdtStore({
      now: () => new Date("2026-07-16T10:05:00.000Z"),
      generateId: () => "sidebar-event-1",
    });
    store.getState().initializeSession({ mode: "student" });
    store.getState().interactWithSidebar("local", "Local", true, "yellow");

    expect(store.getState().studentFieldStates).toEqual([
      { fieldId: "local", value: true, status: "yellow" },
    ]);
    expect(store.getState().attemptEvents[0]).toMatchObject({
      eventType: "sidebar",
      fieldId: "local",
      resultValue: true,
      resultStatus: "yellow",
      visitedAt: "2026-07-16T10:05:00.000Z",
    });
  });

  it("transfers once to the eligible standby transmitter and shows Main/Off/Antenna separately", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.voting.transferRequested).toBe(false);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");

    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().config.transmitters.tx1.onAir).toBe(false);
    expect(store.getState().config.transmitters.tx2.onAir).toBe(true);
    expect(store.getState().configDraft.transmitters.tx2.onAir).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().derived.monitors.mon1.parameters.txFrequencyError.value).toBe(0);
    expect(store.getState().derived.voting.transferRequested).toBe(false);
    expect(store.getState().derived.mainTransmitter).toBe("tx1");
    expect(store.getState().data.transmitters.tx1).toMatchObject({ main: "green", antenna: "gray", off: "red" });
    expect(store.getState().data.transmitters.tx2).toMatchObject({ main: "gray", antenna: "green" });
    expect(store.getState().lastCommand).toBe("Automatic monitor transfer to TX2");
  });

  it("transfers to standby when a single monitor calibration alarm persists after the route changes", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("monitor.calibration.mon1.deviationScale", 70);

    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().derived.monitors.mon1.parameters.deviation.status).toBe("alarm");
    expect(store.getState().config.transmitters.tx1.onAir).toBe(false);
    expect(store.getState().config.transmitters.tx2.onAir).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().lastCommand).toBe("Automatic monitor transfer to TX2");
  });

  it("turns both transmitters Off when the standby transmitter alarms too", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);
    store.getState().setConfigValue("transmitters.tx2.nominal.voiceModulation", 30);

    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().derived.voting.activeTransmitter).toBe(null);
    expect(store.getState().config.transmitters.tx1.enabled).toBe(false);
    expect(store.getState().config.transmitters.tx2.enabled).toBe(false);
    expect(store.getState().data.transmitters.tx1.off).toBe("red");
    expect(store.getState().data.transmitters.tx2.off).toBe("red");
    expect(store.getState().lastCommand).toBe("Automatic monitor shutdown: both transmitters off");
  });

  it("keeps the active transmitter in place when no eligible standby exists", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);
    store.getState().setConfigValue("transmitters.tx2.enabled", false);

    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().derived.voting.transferRequested).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    expect(store.getState().config.transmitters.tx1.onAir).toBe(true);
    expect(store.getState().config.transmitters.tx2.onAir).toBe(false);
  });

  it("rejects TX2 commands while the station is configured for one transmitter", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.effectiveTransmitters.tx2.enabled).toBe(false);
    expect(store.getState().setTransmitterMode("tx2", "main")).toBe(false);
    expect(store.getState().config.transmitters.tx1.onAir).toBe(true);

    store.getState().setConfigValue("station.transmitterConfig", "Dual Transmitters");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().setTransmitterMode("tx2", "main")).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  });
});
