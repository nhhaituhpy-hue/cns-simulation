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
    expect(dmeMenuStructure.map((group) => group.label)).toEqual([
      "System", "RMS", "Monitors", "Monitor 1", "Monitor 2", "Transmitters", "Info",
    ]);
  });
});

describe("DME PMDT store", () => {
  it("applies a typed alarm overlay without changing the baseline", () => {
    const store = createDmePmdtStore();
    store.getState().setOverride("integralData.2.mon1Value", "0", "alarm");
    expect(resolveDmeField(defaultDmePmdtData.integralData[2].mon1Value, "integralData.2.mon1Value", store.getState().overrides)).toBe("0");
    expect(resolveDmeStatus("normal", "integralData.2.mon1Value", store.getState().overrides)).toBe("alarm");
    expect(defaultDmePmdtData.integralData[2].mon1Value).toBe("1023");
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
});
