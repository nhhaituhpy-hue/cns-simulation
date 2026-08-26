"use client";

import { evaluateDme1119aScenario } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

export function Dme1119aTrainingHud({ examinerView = false }: { examinerView?: boolean }) {
  const scenario = useDmePmdtStore((state) => state.scenario);
  const data = useDmePmdtStore((state) => state.data);

  if (!scenario.active || !scenario.definition) return null;
  const evaluation = evaluateDme1119aScenario(scenario, data);
  return <span className="dme1119a-training-hud" role="status" aria-atomic="true">
    <strong>{evaluation.solved ? "SOLVED" : "IN PROGRESS"}</strong>
    <span>{scenario.definition.name}</span>
    {examinerView ? <span>{evaluation.checks.filter((check) => check.passed).length}/{evaluation.checks.length}</span> : null}
  </span>;
}
