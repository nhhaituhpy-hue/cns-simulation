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
    expect(commands?.children).toHaveLength(5);
    expect(commands?.children?.every((item) => !item.enabled)).toBe(true);
  });
});

describe("VOR PMDT store", () => {
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
});
