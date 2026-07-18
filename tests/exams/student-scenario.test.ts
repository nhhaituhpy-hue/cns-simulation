import { describe, expect, it } from "vitest";
import { sanitizeOfficialExamScenario } from "@/lib/exams/student-scenario";

describe("sanitizeOfficialExamScenario", () => {
  it("removes VOR checkpoints and hardware answers from the candidate payload", () => {
    const sanitized = sanitizeOfficialExamScenario({
      moduleCode: "vor",
      scenario: {
        id: "vor-01",
        title: "VOR fault",
        description: "Description",
        difficulty: "easy",
        prompt: "Diagnose the fault",
        createdAt: "2026-07-18T00:00:00.000Z",
        overrides: [],
        expectedCheckpoints: [{ id: "checkpoint-1", viewId: "home", menuPath: ["Home"], title: "Home", guidance: "Secret", required: true, points: 10, order: 1 }],
        hardwareTask: { expectedComponentIds: ["board-a"], faultType: "Mất nguồn", adminNote: "Secret note" },
      },
    });

    expect(sanitized.moduleCode).toBe("vor");
    if (sanitized.moduleCode !== "vor") throw new Error("Unexpected module");
    expect(sanitized.scenario.expectedCheckpoints).toEqual([]);
    expect(sanitized.scenario.hardwareTask).toEqual({ expectedComponentIds: [], faultType: "", adminNote: "" });
  });

  it("removes ADS-B expected actions and faulty component identifiers", () => {
    const sanitized = sanitizeOfficialExamScenario({
      moduleCode: "ads-b",
      scenario: {
        id: "adsb-01",
        title: "ADS-B fault",
        description: "Description",
        difficulty: "medium",
        createdAt: "2026-07-18T00:00:00.000Z",
        sites: [],
        targetSensorId: "sensor-a",
        targetLoginUser: "maintenance",
        expectedActions: [{ step: 1, kind: "menu-selection", menuId: "main", menuTitle: "Main", input: "1", resultLabel: "Status", timestamp: 1 }],
        hardwareFault: {
          faultyComponentIds: ["receiver-a"],
          faultType: "open",
          faultDescription: "Receiver open circuit",
          hardwareLayout: [{ id: "receiver-a", type: "sensor_unit", eplId: "RX.1", name: "Receiver", manufacturer: "ATTECH", specs: {}, position: { x: 10, y: 10 }, connectedTo: [], status: "failed" }],
          signalPaths: [],
          expectedSensorStatus: "red",
          terminalSymptoms: ["Secret terminal clue"],
          qcmsSymptoms: ["Visible monitoring symptom"],
          diagnosticSteps: ["Secret answer"],
        },
      },
    });

    expect(sanitized.moduleCode).toBe("ads-b");
    if (sanitized.moduleCode !== "ads-b") throw new Error("Unexpected module");
    expect(sanitized.scenario.expectedActions).toEqual([]);
    expect(sanitized.scenario.hardwareFault).toMatchObject({
      faultyComponentIds: [],
      faultDescription: "",
      expectedSensorStatus: "grey",
      terminalSymptoms: [],
      diagnosticSteps: [],
      qcmsSymptoms: ["Visible monitoring symptom"],
    });
    expect(sanitized.scenario.hardwareFault?.hardwareLayout[0].status).toBe("ok");
  });
});
