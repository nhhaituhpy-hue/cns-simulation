import type { Scenario } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Converts legacy hardware-fault data to the current binary-status shape. */
export function normalizeScenario(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.hardwareFault)) {
    return value;
  }

  let hardwareFault = value.hardwareFault;
  let changed = false;

  if (
    !Array.isArray(hardwareFault.faultyComponentIds) &&
    typeof hardwareFault.faultyComponentId === "string"
  ) {
    const { faultyComponentId, ...remainingHardwareFault } = hardwareFault;
    hardwareFault = {
      ...remainingHardwareFault,
      faultyComponentIds: [faultyComponentId],
    };
    changed = true;
  }

  if (Array.isArray(hardwareFault.hardwareLayout)) {
    const hardwareLayout = hardwareFault.hardwareLayout.map((component) => {
      if (isRecord(component) && component.status === "degraded") {
        changed = true;
        return { ...component, status: "failed" };
      }
      return component;
    });
    if (changed) {
      hardwareFault = { ...hardwareFault, hardwareLayout };
    }
  }

  return changed ? { ...value, hardwareFault } : value;
}

export function normalizeScenarioList(values: readonly unknown[]): Scenario[] {
  return values.map((value) => normalizeScenario(value) as Scenario);
}
