import { describe, expect, it } from "vitest";
import { canEditDmeScenarioField } from "@/lib/dme1119a";

const base = {
  editableFieldIds: ["txConfigNominal.rtcParameters.powerOutput"],
  securityLevel: 3,
  local: true,
  loginDialogOpen: false,
};

describe("DME 1119A scenario field permissions", () => {
  it("keeps normal Level 3 Local editing behavior outside a scenario", () => {
    expect(canEditDmeScenarioField({ ...base, active: false, fieldId: "rmsConfigGeneral.transfer" })).toBe(true);
    expect(canEditDmeScenarioField({ ...base, active: false, fieldId: "alarmLimits.0.alarmHigh", readOnly: true })).toBe(false);
  });

  it("limits an active scenario to the examiner whitelist", () => {
    expect(canEditDmeScenarioField({ ...base, active: true, fieldId: "txConfigNominal.rtcParameters.powerOutput" })).toBe(true);
    expect(canEditDmeScenarioField({ ...base, active: true, fieldId: "rmsConfigGeneral.transfer" })).toBe(false);
    expect(canEditDmeScenarioField({ ...base, active: true, fieldId: "timestamp" })).toBe(false);
  });
});
