"use client";

import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

/**
 * Deliberately outside the PMDT window: the original Home screen stays blank,
 * while the surrounding simulator still gives the trainee session context.
 */
export function Dvor1150TrainingHud({ examinerView }: { examinerView: boolean }) {
  const scenario = useDvor1150PmdtStore((state) => state.scenario);

  if (!scenario.active) return null;

  return <span className="dvor1150-training-hud" role="status" aria-atomic="true">
    <strong>TRAINING SESSION ACTIVE</strong>
    <span>{examinerView ? "Examiner view" : "Student view"}</span>
    <span>F8 restores the assigned baseline</span>
  </span>;
}
