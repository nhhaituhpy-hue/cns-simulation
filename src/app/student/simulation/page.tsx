"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdsbScenarioMonitorView } from "@/modules/devices/adsb";

function SimulationContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("id") || "";
  const autoOpenHardware = searchParams.get("stage") === "hardware";
  return <AdsbScenarioMonitorView scenarioId={scenarioId} autoOpenHardware={autoOpenHardware} />;
}

export default function StudentScenarioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải mô phỏng...</div>}>
      <SimulationContent />
    </Suspense>
  );
}
