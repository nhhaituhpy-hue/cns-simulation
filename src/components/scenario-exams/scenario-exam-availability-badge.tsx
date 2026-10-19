import { scenarioExamAvailabilityLabel } from "@/lib/scenario-exams/presentation";
import type { ScenarioExamAvailability } from "@/lib/scenario-exams/types";

const neutralClassName = "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-700";
const statusClassName: Record<ScenarioExamAvailability, string> = {
  draft: neutralClassName,
  upcoming: "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[var(--color-warning)]",
  available: "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[var(--color-success)]",
  ended: neutralClassName,
  locked: neutralClassName,
  closed: neutralClassName,
  archived: neutralClassName,
};

export function ScenarioExamAvailabilityBadge({ availability }: { availability: ScenarioExamAvailability }) {
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${statusClassName[availability]}`}>
      {scenarioExamAvailabilityLabel[availability]}
    </span>
  );
}
