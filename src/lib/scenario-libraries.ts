import {
  mapRowToStoredScenarioParameters,
  type StoredScenarioParameters,
} from "./scenario-parameters-storage";

export const SCENARIO_LIBRARY_KINDS = ["practice", "exam"] as const;
export type ScenarioLibraryKind = (typeof SCENARIO_LIBRARY_KINDS)[number];

export interface ScenarioLibraryMembership extends StoredScenarioParameters {
  membershipId: string;
  libraryKind: ScenarioLibraryKind;
  revisionNumber: number;
  sortOrder: number;
  publishedBy: string;
  publishedAt: string;
  archivedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Scenario library database field "${field}" is invalid.`);
  }
  return value;
}

function requiredInteger(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`Scenario library database field "${field}" is invalid.`);
  }
  return value;
}

export function mapRowToScenarioLibraryMembership(row: unknown): ScenarioLibraryMembership {
  if (!isRecord(row)) throw new Error("Scenario library database row must be an object.");
  const libraryKind = requiredString(row, "library_kind");
  if (!SCENARIO_LIBRARY_KINDS.includes(libraryKind as ScenarioLibraryKind)) {
    throw new Error(`Unsupported scenario library: ${libraryKind}.`);
  }
  const stored = mapRowToStoredScenarioParameters(row);
  return {
    ...stored,
    membershipId: requiredString(row, "membership_id"),
    libraryKind: libraryKind as ScenarioLibraryKind,
    revisionNumber: requiredInteger(row, "revision_number"),
    sortOrder: requiredInteger(row, "sort_order"),
    publishedBy: requiredString(row, "published_by"),
    publishedAt: requiredString(row, "published_at"),
    archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
  };
}
