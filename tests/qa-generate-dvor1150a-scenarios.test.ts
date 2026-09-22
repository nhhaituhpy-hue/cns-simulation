import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DVOR1150A_BUILT_IN_SCENARIOS,
  parseDvor1150aScenarioDefinition,
} from "@/lib/dvor1150a/scenario";

const outputDir = join(process.cwd(), "output", "dvor1150a-scenarios-20260922");
const newScenarioIds = [
  "audio-generator-tx1",
  "synthesizer-tx2",
  "monitor-1-cca",
  "lvps-tx1",
  "bcps-tx2",
  "rf-monitor-vswr",
  "carrier-amplifier-tx2",
  "sideband-amplifier-tx1",
  "commutator-distribution",
  "monitor-1-calibration",
] as const;

describe("DVOR 1150A troubleshooting scenario fixtures", () => {
  it("writes ten manual-backed two-stage scenarios for Scenario Parameters import", () => {
    const selected = DVOR1150A_BUILT_IN_SCENARIOS.filter((scenario) =>
      newScenarioIds.includes(scenario.id as (typeof newScenarioIds)[number]),
    ).map((scenario) => scenario.create());

    expect(selected).toHaveLength(10);
    mkdirSync(outputDir, { recursive: true });

    for (const scenario of selected) {
      expect(scenario.diagnosis).toBeDefined();
      expect(parseDvor1150aScenarioDefinition(scenario)).not.toBeNull();
      writeFileSync(
        join(outputDir, `${scenario.id}.json`),
        `${JSON.stringify(scenario, null, 2)}\n`,
        "utf8",
      );
    }
  });
});
