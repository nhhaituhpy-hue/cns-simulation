"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ScenarioLibraryCells, ScenarioLibraryControls } from "@/components/scenario/scenario-library-controls";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

const AdsbSourcesContext = createContext<readonly StoredScenarioParameters[]>([]);

export function AdsbScenarioLibraryPanel({ refreshKey = 0, legacyScenarioIds, children }: {
  refreshKey?: number;
  legacyScenarioIds: readonly string[];
  children: ReactNode;
}) {
  const [scenarios, setScenarios] = useState<StoredScenarioParameters[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/scenario-parameters", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Không thể tải Scenario Parameters ADS-B.");
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("Danh sách Scenario Parameters không hợp lệ.");
        if (!cancelled) setScenarios((payload as StoredScenarioParameters[]).filter(s => s.moduleId === "ads-b"));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể tải Scenario Parameters ADS-B.");
      }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);
  const visibleSources = scenarios.filter(s => legacyScenarioIds.includes(s.scenarioId));
  return <AdsbSourcesContext.Provider value={visibleSources}>
    {error ? <p role="alert" className="mb-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
    <ScenarioLibraryControls moduleId="ads-b" scenarios={visibleSources} disabled={loading || !!error}>
      {children}
    </ScenarioLibraryControls>
  </AdsbSourcesContext.Provider>;
}

export function AdsbScenarioLibraryCells({ scenarioId, title }: { scenarioId: string; title: string }) {
  const source = useContext(AdsbSourcesContext).find(s => s.scenarioId === scenarioId);
  return <ScenarioLibraryCells scenario={{ id: source?.id ?? "", name: title }} disabled={!source} />;
}
