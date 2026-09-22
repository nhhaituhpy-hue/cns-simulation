"use client";

import { evaluateDvor1150aScenario } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function Dvor1150aTrainingHud({ examinerView = false }: { examinerView?: boolean }) {
  const scenario = useVorPmdtStore((state) => state.scenario);
  const config = useVorPmdtStore((state) => state.config);
  const derived = useVorPmdtStore((state) => state.derived);
  const attemptEvents = useVorPmdtStore((state) => state.attemptEvents);
  const actionHistory = useVorPmdtStore((state) => state.actionHistory);
  const scenarioHardwareSelection = useVorPmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareDispositionConfirmed = useVorPmdtStore((state) => state.scenarioHardwareDispositionConfirmed);

  if (!scenario.active || !scenario.definition) return null;

  const evaluation = evaluateDvor1150aScenario(scenario, derived, config, {
    visitedViewIds: attemptEvents.map((event) => event.viewId),
    acceptedActionControlIds: actionHistory
      .filter((event) => event.accepted && event.controlId)
      .map((event) => event.controlId as string),
    selectedHardwareOccurrenceKeys: scenarioHardwareSelection,
    hardwareDispositionConfirmed: scenarioHardwareDispositionConfirmed,
  });
  return (
    <span className="dvor1150a-training-hud" role="status">
      <strong>{evaluation.solved ? "SOLVED" : "IN PROGRESS"}</strong>
      <span>{scenario.definition.name}</span>
      {examinerView ? <span>{evaluation.checks.filter((check) => check.passed).length}/{evaluation.checks.length}</span> : null}
    </span>
  );
}
