import type { RecordedAction, Scenario, SiteState } from "@/lib/types";

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string") {
    throw new Error(`Database field "${field}" must be a string.`);
  }
  return value;
}

export function mapRowToScenario(row: unknown): Scenario {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw new Error("Database scenario row must be an object.");
  }

  const record = row as Record<string, unknown>;
  const difficulty = requiredString(record, "difficulty");
  const targetLoginUser = requiredString(record, "target_login_user");

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new Error("Database scenario difficulty is invalid.");
  }
  if (!["sysadmin", "maintenance"].includes(targetLoginUser)) {
    throw new Error("Database scenario login user is invalid.");
  }

  const updatedAt =
    record.updated_at === null || record.updated_at === undefined
      ? undefined
      : requiredString(record, "updated_at");

  return {
    id: requiredString(record, "id"),
    title: requiredString(record, "title"),
    description: requiredString(record, "description"),
    difficulty: difficulty as Scenario["difficulty"],
    targetSensorId: requiredString(record, "target_sensor_id"),
    targetLoginUser: targetLoginUser as Scenario["targetLoginUser"],
    sites: JSON.parse(requiredString(record, "sites_json")) as SiteState[],
    expectedActions: JSON.parse(
      requiredString(record, "expected_actions_json"),
    ) as RecordedAction[],
    createdAt: requiredString(record, "created_at"),
    updatedAt,
  };
}
