import type { Scenario } from "@/lib/types";

export function sortScenariosByRecency(
  scenarios: readonly Scenario[],
): Scenario[] {
  return [...scenarios].sort((left, right) => {
    const leftDate = left.updatedAt ?? left.createdAt;
    const rightDate = right.updatedAt ?? right.createdAt;
    const dateComparison = rightDate.localeCompare(leftDate);

    return dateComparison || left.id.localeCompare(right.id);
  });
}

export function formatScenarioNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}
