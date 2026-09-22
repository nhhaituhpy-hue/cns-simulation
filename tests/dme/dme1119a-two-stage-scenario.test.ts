import { describe, expect, it } from "vitest";
import { recomputeDmeDerivedData } from "@/lib/dme1119a/derived-data";
import { setDmeParameterValue } from "@/lib/dme1119a/config";
import {
  createCalibrationErrorDme1119aScenario,
  createHpaChangeoverDme1119aScenario,
  evaluateDme1119aScenario,
  previewDme1119aScenario,
  type Dme1119aScenarioRuntime,
} from "@/lib/dme1119a";
import { dme1119aHardwareOccurrenceKey } from "@/modules/devices/dme-1119a/block-diagram-data";

function runtime(definition: Parameters<typeof evaluateDme1119aScenario>[0]["definition"]): Dme1119aScenarioRuntime {
  return { active: true, definition, startedAt: "2026-09-22T00:00:00.000Z" };
}

function releaseBypass(data: ReturnType<typeof previewDme1119aScenario>["data"]) {
  data.monitors.integral.bypass = false;
  data.monitors.standby.bypass = false;
  return recomputeDmeDerivedData(data);
}

describe("DME 1119A two-stage scenario workflow", () => {
  it("requires PMDT evidence and the exact HPA 1 cabinet occurrence", () => {
    const definition = createHpaChangeoverDme1119aScenario();
    const preview = previewDme1119aScenario(definition);
    const restored = releaseBypass(preview.data);
    restored.monitorTransmitterStatus.mainSelect = 2;
    restored.monitorTransmitterStatus.antennaSelect = 2;
    const recovered = recomputeDmeDerivedData(restored);
    const target = definition.diagnosis!.expectedHardware[0];
    const baseEvidence = {
      visitedViewIds: definition.diagnosis!.pmdtCheckpoints.map((checkpoint) => checkpoint.viewId),
      acceptedActionControlIds: ["diagnostics-run-full", "tx-command-transfer"],
    };

    expect(evaluateDme1119aScenario(runtime(definition), recovered, baseEvidence).solved).toBe(false);
    expect(evaluateDme1119aScenario(runtime(definition), recovered, {
      ...baseEvidence,
      selectedHardwareOccurrenceKeys: [dme1119aHardwareOccurrenceKey(target)],
    }).solved).toBe(true);
  });

  it("requires explicit no-replacement confirmation for software-only recovery", () => {
    const definition = createCalibrationErrorDme1119aScenario();
    const preview = previewDme1119aScenario(definition);
    const restored = setDmeParameterValue(preview.data, "monitorOffsets.monitor1.0.integral", 0);
    const recovered = releaseBypass(restored);
    const evidence = {
      visitedViewIds: definition.diagnosis!.pmdtCheckpoints.map((checkpoint) => checkpoint.viewId),
      acceptedActionControlIds: ["config-apply"],
      selectedHardwareOccurrenceKeys: [],
    };
    expect(evaluateDme1119aScenario(runtime(definition), recovered, evidence).solved).toBe(false);
    expect(evaluateDme1119aScenario(runtime(definition), recovered, { ...evidence, hardwareDispositionConfirmed: true }).solved).toBe(true);
  });
});
