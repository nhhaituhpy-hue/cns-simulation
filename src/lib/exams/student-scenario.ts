import type { OfficialExamScenario } from "./types";

/**
 * Removes examiner-only reference data before an official scenario crosses
 * the Server Component boundary into the candidate's browser.
 */
export function sanitizeOfficialExamScenario(source: OfficialExamScenario): OfficialExamScenario {
  if (source.moduleCode === "vor") {
    const hardwareTask = source.scenario.hardwareTask;
    return {
      moduleCode: "vor",
      scenario: {
        ...source.scenario,
        expectedCheckpoints: [],
        ...(hardwareTask
          ? { hardwareTask: { expectedComponentIds: [], faultType: "", adminNote: "" } }
          : { hardwareTask: undefined }),
      },
    };
  }

  if (source.moduleCode === "dme") {
    const hardwareTask = source.scenario.hardwareTask;
    return {
      moduleCode: "dme",
      scenario: {
        ...source.scenario,
        expectedCheckpoints: [],
        ...(hardwareTask
          ? { hardwareTask: { expectedComponentIds: [], faultType: "", adminNote: "" } }
          : { hardwareTask: undefined }),
      },
    };
  }

  const hardwareFault = source.scenario.hardwareFault;
  return {
    moduleCode: "ads-b",
    scenario: {
      ...source.scenario,
      expectedActions: [],
      ...(hardwareFault ? {
        hardwareFault: {
          ...hardwareFault,
          faultyComponentIds: [],
          faultType: "degraded",
          faultDescription: "",
          hardwareLayout: hardwareFault.hardwareLayout.map((component) => ({ ...component, status: "ok" })),
          expectedSensorStatus: "grey",
          terminalSymptoms: [],
          diagnosticSteps: [],
        },
      } : { hardwareFault: undefined }),
    },
  };
}
