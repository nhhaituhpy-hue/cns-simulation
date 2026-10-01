"use client";

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";
import type { CandidateScenarioExamItem } from "@/lib/scenario-exams/types";
import type { ScenarioExamResultReader } from "./scenario-exam-snapshot-context";
import { ScenarioExamTechnicalStatus } from "./scenario-exam-technical-status";

export function ScenarioExamLiveStatus({ item, reader }: { item: CandidateScenarioExamItem; reader: MutableRefObject<ScenarioExamResultReader | null> }) {
  const [summary, setSummary] = useState(() => evaluateScenarioExamResult(item.moduleId, item.definition, null));
  useEffect(() => {
    const update = () => setSummary(evaluateScenarioExamResult(item.moduleId, item.definition, reader.current?.() ?? null));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [item, reader]);
  return <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-3 text-sm"><span className="text-[var(--text-secondary)]">Trạng thái kỹ thuật:</span><ScenarioExamTechnicalStatus summary={summary} /><span className="text-xs text-[var(--text-muted)]">{summary.checks.filter((check) => check.passed).length}/{summary.checks.length} tiêu chí</span></div>;
}
