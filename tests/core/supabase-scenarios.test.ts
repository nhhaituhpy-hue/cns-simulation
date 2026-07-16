import { describe, expect, it } from "vitest";

import { mapRowToScenario } from "@/lib/supabase/scenarios";

function databaseRow() {
  return {
    id: "hardware-test",
    title: "Hardware test",
    description: "Scenario persistence test",
    difficulty: "medium",
    target_sensor_id: "sensor-a",
    target_login_user: "maintenance",
    sites_json: "[]",
    expected_actions_json: "[]",
    hardware_fault_json: JSON.stringify({
      faultyComponentId: "coax-1",
      faultType: "open",
    }),
    event_log_json: JSON.stringify([
      { timestamp: "2026-07-16T00:00:00.000Z", type: "qcms", message: "Alarm" },
    ]),
    created_at: "2026-07-16T00:00:00.000Z",
    updated_at: null,
  };
}

describe("Supabase scenario mapping", () => {
  it("restores optional data and normalizes legacy hardware faults", () => {
    const scenario = mapRowToScenario(databaseRow());

    expect(scenario.hardwareFault?.faultyComponentIds).toEqual(["coax-1"]);
    expect(scenario.eventLog).toHaveLength(1);
  });

  it("accepts rows created before optional columns existed", () => {
    const legacyRow = { ...databaseRow() } as Record<string, unknown>;
    delete legacyRow.hardware_fault_json;
    delete legacyRow.event_log_json;

    const scenario = mapRowToScenario(legacyRow);

    expect(scenario.hardwareFault).toBeUndefined();
    expect(scenario.eventLog).toBeUndefined();
  });
});