import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DME1119A_BUILT_IN_SCENARIOS,
  parseDme1119aScenarioDefinition,
} from "@/lib/dme1119a/scenario";

const outputDir = join(process.cwd(), "output", "dme1119a-scenarios-20260922");
const newScenarioIds = [
  "monitor-1-lru-fault",
  "rtc-1-lru-fault",
  "lpa-1-lru-fault",
  "power-supply-1-lru-fault",
  "rms-processor-lru-fault",
  "facilities-cca-lru-fault",
  "bcps-1-lru-fault",
  "interface-cca-lru-fault",
  "rf-switch-lru-fault",
  "lcu-lru-fault",
] as const;

describe("DME 1119A troubleshooting scenario fixtures", () => {
  it("writes the upgraded eight plus ten new DME scenarios for Scenario Parameters import", () => {
    const scenarios = DME1119A_BUILT_IN_SCENARIOS
      .filter((scenario) => scenario.id !== "default")
      .map((scenario) => scenario.create());

    expect(scenarios).toHaveLength(18);
    expect(scenarios.filter((scenario) => newScenarioIds.includes(scenario.id as (typeof newScenarioIds)[number]))).toHaveLength(10);
    mkdirSync(outputDir, { recursive: true });
    for (const scenario of scenarios) {
      expect(scenario.diagnosis).toBeDefined();
      expect(parseDme1119aScenarioDefinition(scenario)).not.toBeNull();
      writeFileSync(join(outputDir, `${scenario.id}.json`), `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
    }
  });
});
