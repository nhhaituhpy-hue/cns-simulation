import type { Scenario } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Converts legacy single-component hardware faults to the current array shape. */
export function normalizeScenario(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.hardwareFault)) {
    return value;
  }

  const hardwareFault = value.hardwareFault;
  if (Array.isArray(hardwareFault.faultyComponentIds)) {
    return value;
  }

  if (typeof hardwareFault.faultyComponentId !== "string") {
    return value;
  }

  const { faultyComponentId, ...remainingHardwareFault } = hardwareFault;
  return {
    ...value,
    hardwareFault: {
      ...remainingHardwareFault,
      faultyComponentIds: [faultyComponentId],
    },
  };
}

export function normalizeScenarioList(values: readonly unknown[]): Scenario[] {
  return values.map((value) => normalizeScenario(value) as Scenario);
}
