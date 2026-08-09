import { cloneDvor220 } from "./defaults";
import type { Dvor220DeepPartial } from "./types";

function isMergeableObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeDvor220Patch<T extends object>(
  current: T,
  patch: Dvor220DeepPartial<T>,
): T {
  const target = cloneDvor220(current) as Record<string, unknown>;
  const source = patch as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const currentValue = target[key];
    if (isMergeableObject(currentValue) && isMergeableObject(value)) {
      target[key] = mergeDvor220Patch(currentValue, value);
    } else {
      target[key] = cloneDvor220(value);
    }
  }

  return target as T;
}

export function configurationsEqual(left: object, right: object): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
