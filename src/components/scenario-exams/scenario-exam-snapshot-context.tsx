"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioExamAnswer } from "@/lib/scenario-exams/types";

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
const ScenarioExamAnswerContext = createContext<ScenarioExamAnswer | null>(null);

export function ScenarioExamSnapshotProvider({ snapshot, answer, registerResultReader, children }: { snapshot: ScenarioExamSnapshot; answer?: ScenarioExamAnswer; registerResultReader?: RegisterResultReader; children: ReactNode }) {
  return <ScenarioExamSnapshotContext.Provider value={snapshot}><ScenarioExamResultContext.Provider value={registerResultReader ?? null}><ScenarioExamAnswerContext.Provider value={answer ?? null}>{children}</ScenarioExamAnswerContext.Provider></ScenarioExamResultContext.Provider></ScenarioExamSnapshotContext.Provider>;
}

export function useScenarioExamAnswer() { return useContext(ScenarioExamAnswerContext); }

export function useScenarioExamSnapshot() {
  return useContext(ScenarioExamSnapshotContext);
}

export function useScenarioExamResultReader(reader: ScenarioExamResultReader) {
  const register = useContext(ScenarioExamResultContext);
  useEffect(() => register?.(reader), [reader, register]);
}
