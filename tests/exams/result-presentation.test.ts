import { describe, expect, it } from "vitest";
import { presentAdsbResult, presentPmdtResult } from "@/lib/exams/result-presentation";

describe("official exam result presentation", () => {
  it("maps PMDT evidence and ignores malformed event rows", () => {
    const result = presentPmdtResult({
      startedAt: "2026-07-18T08:00:00.000Z",
      submittedAt: "2026-07-18T08:15:00.000Z",
      events: [
        {
          id: "event-1",
          sequence: 1,
          eventType: "view",
          viewId: "monitor-data",
          title: "Monitor Data",
          menuPath: ["Monitor", "Data"],
          annotation: "Đã kiểm tra cảnh báo.",
        },
        { id: "broken-row" },
      ],
      actionHistory: [{
        id: "action-1",
        sequence: 1,
        occurredAt: "2026-07-18T08:01:00.000Z",
        actor: "student",
        kind: "control",
        menuPath: ["Sidebar", "Local"],
        label: "Local Mode",
        accepted: true,
        before: { local: false },
        after: { local: true },
      }],
      answer: {
        suspectedFault: "Monitor 1",
        reasoning: "Giá trị vượt giới hạn.",
        remediation: "Kiểm tra đường tín hiệu.",
      },
    });

    expect(result).not.toBeNull();
    expect(result?.events).toHaveLength(1);
    expect(result?.actionHistory).toHaveLength(1);
    expect(result?.actionHistory[0]).toMatchObject({ id: "action-1", label: "Local Mode", accepted: true });
    expect(result?.events[0]).toMatchObject({
      id: "event-1",
      viewId: "monitor-data",
      title: "Monitor Data",
    });
    expect(result?.answer.suspectedFault).toBe("Monitor 1");
  });

  it("maps ADS-B actions and discards invalid action data", () => {
    const action = {
      step: 1,
      kind: "menu-selection",
      menuId: "main",
      menuTitle: "Main menu",
      input: "1",
      resultLabel: "Status",
      timestamp: 123,
    };
    const result = presentAdsbResult({
      selectedActions: [action, { kind: "unknown", input: "2" }],
      allActions: [action],
      authenticatedCorrectly: true,
      qcmsMonitoringOpened: true,
      diagnosedComponentIds: ["rx-a", 42],
      inspectedComponentIds: ["rx-a", "psu-a"],
    });

    expect(result?.selectedActions).toEqual([action]);
    expect(result?.authenticatedCorrectly).toBe(true);
    expect(result?.diagnosedComponentIds).toEqual(["rx-a"]);
    expect(result?.inspectedComponentIds).toEqual(["rx-a", "psu-a"]);
  });

  it("returns null when no official result was stored", () => {
    expect(presentPmdtResult(null)).toBeNull();
    expect(presentAdsbResult(null)).toBeNull();
  });
});
