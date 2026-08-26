"use client";

import { evaluateDvor1150aScenario } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function Dvor1150aTrainingHud({ examinerView = false }: { examinerView?: boolean }) {
  const scenario = useVorPmdtStore((state) => state.scenario);
  const config = useVorPmdtStore((state) => state.config);
  const derived = useVorPmdtStore((state) => state.derived);

  if (!scenario.active || !scenario.definition) return null;

  const evaluation = evaluateDvor1150aScenario(scenario, derived, config);
  return (
    <span className="dvor1150a-training-hud" role="status">
      <strong>{evaluation.solved ? "SOLVED" : "IN PROGRESS"}</strong>
      <span>{scenario.definition.name}</span>
      {examinerView ? <span>{evaluation.checks.filter((check) => check.passed).length}/{evaluation.checks.length}</span> : null}
    </span>
  );
}
