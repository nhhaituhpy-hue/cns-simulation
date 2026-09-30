import { scenarioExamAvailabilityLabel } from "@/lib/scenario-exams/presentation";
import type { ScenarioExamAvailability } from "@/lib/scenario-exams/types";

const neutralClassName = "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-secondary)]";
const statusClassName: Record<ScenarioExamAvailability, string> = {
  draft: neutralClassName,
  upcoming: "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  available: "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]",
  ended: neutralClassName,
  locked: neutralClassName,
  closed: neutralClassName,
  archived: neutralClassName,
};

export function ScenarioExamAvailabilityBadge({ availability }: { availability: ScenarioExamAvailability }) {
  return (
    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusClassName[availability]}`}>
      {scenarioExamAvailabilityLabel[availability]}
    </span>
  );
}
