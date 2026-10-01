"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";

interface ScenarioExamSnapshot {
  moduleId: ScenarioParametersModuleId;
  definition: ScenarioParametersDefinition;
  sessionKey: string;
  revisionKey: string;
}

const ScenarioExamSnapshotContext = createContext<ScenarioExamSnapshot | null>(null);
export type ScenarioExamResultReader = () => Record<string, unknown> | null;
type RegisterResultReader = (reader: ScenarioExamResultReader) => () => void;
const ScenarioExamResultContext = createContext<RegisterResultReader | null>(null);

export function ScenarioExamSnapshotProvider({ snapshot, registerResultReader, children }: { snapshot: ScenarioExamSnapshot; registerResultReader?: RegisterResultReader; children: ReactNode }) {
  return <ScenarioExamSnapshotContext.Provider value={snapshot}><ScenarioExamResultContext.Provider value={registerResultReader ?? null}>{children}</ScenarioExamResultContext.Provider></ScenarioExamSnapshotContext.Provider>;
}

export function useScenarioExamSnapshot() {
  return useContext(ScenarioExamSnapshotContext);
}

export function useScenarioExamResultReader(reader: ScenarioExamResultReader) {
  const register = useContext(ScenarioExamResultContext);
  useEffect(() => register?.(reader), [reader, register]);
}
