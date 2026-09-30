import { describe, expect, it } from "vitest";
import { parseAdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";

const baseLegacyScenario = {
  id: "adsb-low-carrier-01",
  title: "ADS-B low carrier",
  description: "Khôi phục cảnh báo carrier trên sensor mục tiêu.",
  difficulty: "medium",
  sites: [
    {
      id: "site-1",
      name: "Site 1",
      sensorA: {
        id: "site-1-A",
        sensorLabel: "A",
        status: "red",
        ipAddress: "10.10.1.3",
        name: "Sensor A",
      },
      sensorB: null,
    },
  ],
  targetSensorId: "site-1-A",
  targetLoginUser: "sysadmin",
  expectedActions: [
    {
      step: 1,
      kind: "authentication",
      menuId: "login",
      menuTitle: "Login",
      input: "sysadmin",
      resultLabel: "Authenticated",
      timestamp: 1,
    },
  ],
};

describe("ADS-B Scenario Parameters adapter", () => {
  it("normalizes the legacy title and difficulty fields", () => {
    const definition = parseAdsbScenarioDefinition(baseLegacyScenario);

    expect(definition).toMatchObject({
      schemaVersion: 1,
      id: "adsb-low-carrier-01",
      name: "ADS-B low carrier",
      difficulty: "intermediate",
      targetSensorId: "site-1-A",
    });
  });

  it("accepts the normalized name/schema shape", () => {
    const definition = parseAdsbScenarioDefinition({
      ...baseLegacyScenario,
      schemaVersion: 1,
      name: "ADS-B normalized",
      difficulty: "advanced",
    });

    expect(definition?.name).toBe("ADS-B normalized");
    expect(definition?.difficulty).toBe("advanced");
  });

  it("rejects scenarios without a valid target sensor or action", () => {
    expect(
      parseAdsbScenarioDefinition({
        ...baseLegacyScenario,
        targetSensorId: "missing",
      }),
    ).toBeNull();
    expect(
      parseAdsbScenarioDefinition({
        ...baseLegacyScenario,
        expectedActions: [],
      }),
    ).toBeNull();
  });
});
