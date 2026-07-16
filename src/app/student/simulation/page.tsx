"use client";

import { ScenarioMonitorView } from "@/components/qcms/scenario-monitor-view";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SimulationContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("id") || "";
  const autoOpenHardware = searchParams.get("stage") === "hardware";
  return (
    <ScenarioMonitorView
      scenarioId={scenarioId}
      autoOpenHardware={autoOpenHardware}
    />
  );
}

export default function StudentScenarioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải mô phỏng...</div>}>
      <SimulationContent />
    </Suspense>
  );
}
