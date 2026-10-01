"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";

interface ScenarioExamSnapshot {
  moduleId: ScenarioParametersModuleId;
  definition: ScenarioParametersDefinition;
  sessionKey: string;
  revisionKey: string;
}

const ScenarioExamSnapshotContext = createContext<ScenarioExamSnapshot | null>(null);

export function ScenarioExamSnapshotProvider({ snapshot, children }: { snapshot: ScenarioExamSnapshot; children: ReactNode }) {
  return <ScenarioExamSnapshotContext.Provider value={snapshot}>{children}</ScenarioExamSnapshotContext.Provider>;
}

export function useScenarioExamSnapshot() {
  return useContext(ScenarioExamSnapshotContext);
}
