import { parseCandidateScenarioExamResult, sanitizeScenarioExamPayload } from "./results";
import type { CandidateScenarioExamItem, CandidateScenarioExamResult, CandidateScenarioExamSession, CandidateSessionSubject } from "./types";

export function candidateResultStorageKey(sessionId: string, itemId: string): string {
  return `cns-scenario-exam:result:v1:${encodeURIComponent(sessionId)}:${encodeURIComponent(itemId)}`;
}

export function buildCandidateScenarioExamResult(item: CandidateScenarioExamItem, payload: Record<string, unknown>): CandidateScenarioExamResult {
  const result = parseCandidateScenarioExamResult({
    version: 1, sessionItemId: item.id, moduleId: item.moduleId,
    scenarioId: item.definition.id, revision: item.revision,
    capturedAt: new Date().toISOString(), payload: sanitizeScenarioExamPayload(payload),
  });
  if (!result) throw new Error("Dữ liệu bài làm không hợp lệ hoặc quá lớn.");
  return result;
}

export function cacheCandidateScenarioExamResult(sessionId: string, result: CandidateScenarioExamResult): void {
  window.localStorage.setItem(candidateResultStorageKey(sessionId, result.sessionItemId), JSON.stringify(result));
}

/** Recover the existing Selex evidence cache so already-completed work can be submitted. */
export function readCandidateScenarioExamResult(session: CandidateScenarioExamSession, subject: CandidateSessionSubject): CandidateScenarioExamResult | null {
  if (!subject.sessionItemId) return null;
  try {
    const raw = window.localStorage.getItem(candidateResultStorageKey(session.id, subject.sessionItemId));
    const cached = raw ? parseCandidateScenarioExamResult(JSON.parse(raw)) : null;
    const matchingCache = cached && cached.sessionItemId === subject.sessionItemId && cached.moduleId === subject.moduleId
      && cached.scenarioId === subject.scenarioId && cached.revision === subject.revision ? cached : null;
    if (!subject.scenarioId || !subject.revision || !["dvor-1150a", "dme-1119a"].includes(subject.moduleId)) return matchingCache;
    const prefix = subject.moduleId === "dvor-1150a" ? "vor" : "dme";
    const sessionKey = `scenario-exam:${session.id}:${subject.sessionItemId}`;
    const revisionKey = `exam:${subject.sessionItemId}:${subject.revision}`;
    const safe = (value: string) => encodeURIComponent(value);
    const key = `cns-training:${prefix}-scenario-session:v2:${safe(session.id)}:${safe(sessionKey)}:${safe(revisionKey)}:${safe(subject.scenarioId)}`;
    const evidenceRaw = window.localStorage.getItem(key);
    const evidence = evidenceRaw ? JSON.parse(evidenceRaw) as Record<string, unknown> : null;
    if (!evidence || evidence.version !== 2 || evidence.userId !== session.id || evidence.sessionKey !== sessionKey
      || evidence.revisionKey !== revisionKey || evidence.scenarioId !== subject.scenarioId) return matchingCache;
    const evidenceResult = parseCandidateScenarioExamResult({ version: 1, sessionItemId: subject.sessionItemId,
      moduleId: subject.moduleId, scenarioId: subject.scenarioId, revision: subject.revision,
      capturedAt: evidence.savedAt, payload: sanitizeScenarioExamPayload(evidence) });
    // Selex persists on every change; it can be newer than the periodic server draft.
    if (matchingCache && (!evidenceResult || Date.parse(matchingCache.capturedAt) >= Date.parse(evidenceResult.capturedAt))) return matchingCache;
    return evidenceResult;
  } catch {
    return null;
  }
}
