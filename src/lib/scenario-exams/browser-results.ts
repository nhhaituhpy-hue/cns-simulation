import { parseCandidateScenarioExamResult, sanitizeScenarioExamPayload } from "./results";
import type { CandidateScenarioExamItem, CandidateScenarioExamResult, CandidateScenarioExamSession, CandidateSessionSubject, ScenarioExamAnswer } from "./types";

export function candidateResultStorageKey(sessionId: string, itemId: string): string {
  return `cns-scenario-exam:result:v1:${encodeURIComponent(sessionId)}:${encodeURIComponent(itemId)}`;
}

function answerKey(sessionId: string, itemId: string) { return `cns-scenario-exam:answer:v1:${encodeURIComponent(sessionId)}:${encodeURIComponent(itemId)}`; }
export function readCandidateAnswer(sessionId: string, itemId: string): ScenarioExamAnswer {
  const empty = { suspectedFault: "", reasoning: "", remediation: "" };
  try {
    const stored = window.localStorage.getItem(answerKey(sessionId, itemId));
    const rawResult = window.localStorage.getItem(candidateResultStorageKey(sessionId, itemId));
    const value = stored ? JSON.parse(stored) : rawResult ? JSON.parse(rawResult)?.payload?.answer : null;
    return Object.fromEntries(Object.keys(empty).map((key) => [key, value && typeof value[key] === "string" ? value[key].slice(0, 4000) : ""])) as unknown as ScenarioExamAnswer;
  } catch { return empty; }
}
export function cacheCandidateAnswer(sessionId: string, itemId: string, answer: ScenarioExamAnswer) {
  window.localStorage.setItem(answerKey(sessionId, itemId), JSON.stringify(answer));
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
  const result = readStoredResult(session, subject);
  if (!result || !subject.sessionItemId) return result;
  try {
    if (window.localStorage.getItem(answerKey(session.id, subject.sessionItemId))) {
      return { ...result, payload: { ...result.payload, answer: readCandidateAnswer(session.id, subject.sessionItemId) } };
    }
  } catch { /* Keep valid saved evidence if browser storage is blocked. */ }
  return result;
}

function readStoredResult(session: CandidateScenarioExamSession, subject: CandidateSessionSubject): CandidateScenarioExamResult | null {
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
