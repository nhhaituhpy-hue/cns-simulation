"use client";

import { useSearchParams } from "next/navigation";
import { ScenarioWizard } from "./scenario-wizard";

export function EditAdsbScenarioPage() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("id") ?? "";
  return <ScenarioWizard scenarioId={scenarioId} />;
}
