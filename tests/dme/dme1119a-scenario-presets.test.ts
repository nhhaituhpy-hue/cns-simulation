import { describe, expect, it } from "vitest";
import { recomputeDmeDerivedData } from "@/lib/dme1119a/derived-data";
import {
  DME1119A_BUILT_IN_SCENARIOS,
  evaluateDme1119aScenario,
  previewDme1119aScenario,
  type Dme1119aScenarioDefinition,
  type Dme1119aScenarioRuntime,
} from "@/lib/dme1119a/scenario";
import { setDmeParameterValue } from "@/lib/dme1119a/config";

function runtime(definition: Dme1119aScenarioDefinition): Dme1119aScenarioRuntime {
  return { active: true, definition, startedAt: "2026-08-26T00:00:00.000Z" };
}

function releaseBypass(data: ReturnType<typeof previewDme1119aScenario>["data"]) {
  data.monitors.integral.bypass = false;
  data.monitors.standby.bypass = false;
  return recomputeDmeDerivedData(data);
}

function selectTransmitter(
  data: ReturnType<typeof previewDme1119aScenario>["data"],
  transmitter: "tx1" | "tx2",
) {
  data.monitorTransmitterStatus.mainSelect = transmitter === "tx1" ? 1 : 2;
  data.monitorTransmitterStatus.antennaSelect = transmitter === "tx1" ? 1 : 2;
  return recomputeDmeDerivedData(data);
}

describe("DME 1119A built-in scenarios", () => {
  it.each(DME1119A_BUILT_IN_SCENARIOS.filter((item) => item.id !== "default"))(
    "$id starts in progress and has a valid definition",
    ({ create }) => {
      const definition = create();
      expect(
        definition.faultInjections.length
        + definition.studentEditableFieldIds.length
        + (definition.diagnosis ? 1 : 0),
      ).toBeGreaterThan(0);
      expect(previewDme1119aScenario(definition).data).toBeDefined();
    },
  );

  it("solves the low output scenario only after restoring output and bypass", () => {
    const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "tx1-low-output")!.create();
    const preview = previewDme1119aScenario(definition);
    expect(evaluateDme1119aScenario(runtime(definition), preview.data).solved).toBe(false);

    const restored = setDmeParameterValue(preview.data, "txConfigNominal.rtcParameters.powerOutput", -1);
    const evaluation = evaluateDme1119aScenario(runtime(definition), releaseBypass(restored));

    expect(evaluation.solved).toBe(true);
  });

  it("solves the delay drift scenario with the permitted RTC correction", () => {
    const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "tx1-delay-drift")!.create();
    const preview = previewDme1119aScenario(definition);
    const restored = setDmeParameterValue(preview.data, "txConfigNominal.rtcParameters.replyDelayOffset", -0.6);

    expect(evaluateDme1119aScenario(runtime(definition), releaseBypass(restored)).solved).toBe(true);
  });

  it("solves the PRF overload scenario by restoring capacity", () => {
    const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "rtc-prf-overload")!.create();
    const preview = previewDme1119aScenario(definition);
    const restored = setDmeParameterValue(preview.data, "txConfigNominal.rtcParameters.maximumPrf", 5400);

    expect(evaluateDme1119aScenario(runtime(definition), releaseBypass(restored)).solved).toBe(true);
  });

  it("solves HPA and VSWR faults by transferring service to TX2", () => {
    for (const id of ["tx1-hpa-changeover", "tx1-high-vswr"] as const) {
      const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === id)!.create();
      const preview = previewDme1119aScenario(definition);
      const restored = selectTransmitter(preview.data, "tx2");

      expect(evaluateDme1119aScenario(runtime(definition), releaseBypass(restored)).solved).toBe(true);
    }
  });

  it("solves Ident loss with the permitted self-key correction", () => {
    const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "ident-keying-loss")!.create();
    const preview = previewDme1119aScenario(definition);
    const restored = setDmeParameterValue(preview.data, "txConfigNominal.ident.selfKeyOnLoss", true);

    expect(evaluateDme1119aScenario(runtime(definition), releaseBypass(restored)).solved).toBe(true);
  });

  it("solves monitor calibration error without changing alarm limits", () => {
    const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "monitor-calibration-error")!.create();
    const preview = previewDme1119aScenario(definition);
    const restored = setDmeParameterValue(preview.data, "monitorOffsets.monitor1.0.integral", 0);
    const evaluation = evaluateDme1119aScenario(runtime(definition), releaseBypass(restored));

    expect(evaluation.solved).toBe(true);
    expect(definition.studentEditableFieldIds).not.toContain("alarmLimits.0.alarmHigh");
  });

  it("solves overtemperature training by selecting the required fan state", () => {
    const definition = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === "cabinet-overtemperature")!.create();
    const preview = previewDme1119aScenario(definition);
    preview.data.rmsStatus.fanControl = "On";

    expect(evaluateDme1119aScenario(runtime(definition), releaseBypass(preview.data)).solved).toBe(true);
  });
});
