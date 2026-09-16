import {
  mapRowToStoredScenarioParameters,
  type StoredScenarioParameters,
} from "./scenario-parameters-storage";

export interface AssignedReviewScenario extends StoredScenarioParameters {
  sortOrder: number;
  assignedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mapRowToAssignedReviewScenario(
  row: unknown,
): AssignedReviewScenario {
  if (!isRecord(row)) throw new Error("Review scenario database row must be an object.");
  const stored = mapRowToStoredScenarioParameters(row);
  if (
    typeof row.sort_order !== "number" ||
    !Number.isInteger(row.sort_order) ||
    row.sort_order < 1
  ) {
    throw new Error('Review scenario database field "sort_order" is invalid.');
  }
  if (typeof row.assigned_at !== "string" || !row.assigned_at.trim()) {
    throw new Error('Review scenario database field "assigned_at" is invalid.');
  }
  return {
    ...stored,
    sortOrder: row.sort_order,
    assignedAt: row.assigned_at,
  };
}
