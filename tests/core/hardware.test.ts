import { describe, expect, it } from "vitest";

import { CON_SON_FAULT_SCENARIOS } from "../../src/lib/fault-scenarios";
import { gradeHardwareDiagnosis } from "../../src/lib/grading";
import {
  CON_SON_HARDWARE,
  CON_SON_SIGNAL_PATHS,
  validateSignalPaths,
} from "../../src/lib/hardware-model";

describe("Con Son hardware model", () => {
  it("contains the complete component inventory with unique IDs", () => {
    expect(CON_SON_HARDWARE).toHaveLength(16);
    expect(new Set(CON_SON_HARDWARE.map((component) => component.id)).size).toBe(
      CON_SON_HARDWARE.length,
    );
    expect(
      new Set(CON_SON_HARDWARE.map((component) => component.type)).size,
    ).toBe(16);
    expect(
      CON_SON_HARDWARE.every(
        (component) =>
          component.eplId &&
          component.name &&
          Object.keys(component.specs).length > 0,
      ),
    ).toBe(true);
  });

  it("references only valid component IDs in every signal path", () => {
    expect(CON_SON_SIGNAL_PATHS).toHaveLength(6);
    expect(validateSignalPaths(CON_SON_HARDWARE, CON_SON_SIGNAL_PATHS)).toBe(
      true,
    );

    const componentIds = new Set(
      CON_SON_HARDWARE.map((component) => component.id),
    );
    for (const path of CON_SON_SIGNAL_PATHS) {
      expect(path.componentIds.length).toBeGreaterThan(1);
      expect(
        path.componentIds.every((componentId) =>
          componentIds.has(componentId),
        ),
      ).toBe(true);
    }
  });
});

describe("hardware fault scenarios", () => {
  it("defines ten complete, internally consistent presets", () => {
    expect(CON_SON_FAULT_SCENARIOS).toHaveLength(10);
    const componentIds = new Set(
      CON_SON_HARDWARE.map((component) => component.id),
    );

    for (const fault of CON_SON_FAULT_SCENARIOS) {
      expect(componentIds.has(fault.faultyComponentId)).toBe(true);
      expect(fault.terminalSymptoms.length).toBeGreaterThan(2);
      expect(fault.qcmsSymptoms.length).toBeGreaterThan(1);
      expect(fault.diagnosticSteps.length).toBeGreaterThan(2);

      const combined = fault.qcmsSymptoms.join(" ").toLowerCase();
      if (fault.expectedSensorStatus === "red") {
        expect(combined).toContain("red");
        expect(combined).toMatch(/no snmp|unreachable/);
      } else if (fault.expectedSensorStatus === "yellow") {
        expect(combined).toContain("yellow");
        expect(combined).toMatch(/no data|no surveillance|intermittent|extremely low/);
      } else if (fault.expectedSensorStatus === "orange") {
        expect(combined).toContain("orange");
        expect(combined).toContain("temperature");
      } else if (fault.expectedSensorStatus === "green") {
        expect(combined).toContain("green");
      }
    }
  });
});

describe("gradeHardwareDiagnosis", () => {
  const noInspection = {
    openedTerminal: false,
    openedMonitoring: false,
    inspectedComponents: [] as string[],
  };

  it("awards 40 points for the correct component alone", () => {
    const result = gradeHardwareDiagnosis(
      { componentId: "preamp-1" },
      { componentId: "preamp-1" },
      noInspection,
    );
    expect(result.correctComponent).toBe(true);
    expect(result.score).toBe(40);
  });

  it("awards zero points for a wrong component without inspection", () => {
    const result = gradeHardwareDiagnosis(
      { componentId: "preamp-1" },
      { componentId: "coax-1" },
      noInspection,
    );
    expect(result.correctComponent).toBe(false);
    expect(result.score).toBe(0);
  });

  it("awards 100 points for a correct diagnosis and full inspection", () => {
    const result = gradeHardwareDiagnosis(
      { componentId: "preamp-1" },
      { componentId: "preamp-1" },
      {
        openedTerminal: true,
        openedMonitoring: true,
        inspectedComponents: ["antenna-1", "preamp-1", "coax-1"],
      },
    );
    expect(result).toMatchObject({
      correctComponent: true,
      terminalInspected: true,
      monitoringInspected: true,
      inspectedComponentCount: 3,
      componentInspectionScore: 20,
      score: 100,
    });
  });
});
