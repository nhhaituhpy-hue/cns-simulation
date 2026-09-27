import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBcpsPowerFailureScenario,
  createMonitor1FaultScenario,
  createMonitor2FaultScenario,
  createNoCarrierPowerScenario,
  createNoLowerSidebandScenario,
  createNoUpperSidebandScenario,
  createRmsFaultScenario,
  createSystemAlarmFieldDetectorScenario,
  createTx1FaultScenario,
  createTx2FaultScenario,
  parseDvor1150ScenarioDefinition,
  type Dvor1150ScenarioDefinition,
} from "@/lib/dvor1150";

const outputDir = join(process.cwd(), "output", "dvor1150-scenarios-20260922");

const fixtures: Array<{ fileName: string; create: () => Dvor1150ScenarioDefinition }> = [
  { fileName: "system-alarm-field-detector.json", create: createSystemAlarmFieldDetectorScenario },
  { fileName: "rms-cpu-fault.json", create: createRmsFaultScenario },
  { fileName: "transmitter-1-fault.json", create: createTx1FaultScenario },
  { fileName: "monitor-1-fault.json", create: createMonitor1FaultScenario },
  { fileName: "transmitter-2-fault.json", create: createTx2FaultScenario },
  { fileName: "monitor-2-fault.json", create: createMonitor2FaultScenario },
  { fileName: "bcps-power-failure.json", create: createBcpsPowerFailureScenario },
  { fileName: "no-carrier-power-output.json", create: createNoCarrierPowerScenario },
  { fileName: "no-upper-sideband-output.json", create: createNoUpperSidebandScenario },
  { fileName: "no-lower-sideband-output.json", create: createNoLowerSidebandScenario },
];

describe("DVOR 1150 scenario fixtures", () => {
  it("writes ten schema-valid hardware diagnosis scenarios", () => {
    mkdirSync(outputDir, { recursive: true });
    expect(fixtures).toHaveLength(10);
    for (const fixture of fixtures) {
      const scenario = fixture.create();
      expect(parseDvor1150ScenarioDefinition(scenario), fixture.fileName).not.toBeNull();
      writeFileSync(join(outputDir, fixture.fileName), `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
    }
  });
});
