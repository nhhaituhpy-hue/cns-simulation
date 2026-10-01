import { beforeEach, describe, expect, it } from "vitest";
import { parseCandidateScenarioExamResult, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { candidateResultStorageKey, readCandidateScenarioExamResult } from "@/lib/scenario-exams/browser-results";
import type { CandidateScenarioExamResult, CandidateScenarioExamSession } from "@/lib/scenario-exams/types";

const result: CandidateScenarioExamResult = { version: 1, sessionItemId: "item-1", moduleId: "dvor-1150a", scenarioId: "scenario-1", revision: 7, capturedAt: "2026-10-01T01:00:00.000Z", payload: { answer: { suspectedFault: "Reference modulation" }, checkpoint: { config: { reference: 100 } } } };
const session: CandidateScenarioExamSession = { id: "session-1", examId: "exam-1", examName: "Test", candidateName: "Test candidate", candidateUnit: "Test unit", status: "in_progress", startedAt: "2026-10-01T00:00:00.000Z", deadlineAt: "2026-10-01T02:00:00.000Z", submittedAt: null, subjects: [{ id: "subject-1", moduleId: "dvor-1150a", position: 1, status: "in_progress", startedAt: null, submittedAt: null, sessionItemId: "item-1", scenarioId: "scenario-1", scenarioName: "Scenario", revision: 7 }] };

beforeEach(() => window.localStorage.clear());

describe("candidate result integrity", () => {
  it("keeps result metadata and discards undeclared identity/score fields", () => {
    expect(parseCandidateScenarioExamResult({ ...result, candidateUserId: "other", examinerScore: 100 })).toEqual(result);
  });
  it.each([ { version: 9 }, { moduleId: "unknown" }, { revision: 0 }, { capturedAt: "invalid" }, { payload: { nested: { password: "test-fixture" } } }, { payload: { impossible: Infinity } }, { payload: { large: "a".repeat(750001) } } ])("rejects invalid or unsafe evidence case %#", (change) => {
    expect(parseCandidateScenarioExamResult({ ...result, ...change })).toBeNull();
  });
  it("removes account credentials and duplicate scenario definitions from runtime evidence", () => {
    expect(sanitizeScenarioExamPayload({ checkpoint: { reference: 100, securityAccounts: [{ password: "test-fixture" }], nested: { token: "test-fixture", power: 42 } }, definition: { answer: "not-needed" } })).toEqual({ checkpoint: { reference: 100, nested: { power: 42 } } });
  });
  it("reads only an item/revision matching the current session", () => {
    window.localStorage.setItem(candidateResultStorageKey(session.id, result.sessionItemId), JSON.stringify(result));
    expect(readCandidateScenarioExamResult(session, session.subjects[0])).toEqual(result);
    expect(readCandidateScenarioExamResult({ ...session, id: "another-session" }, session.subjects[0])).toBeNull();
    expect(readCandidateScenarioExamResult(session, { ...session.subjects[0], revision: 8 })).toBeNull();
  });
  it("recovers Selex work stored before the submission UI was added", () => {
    const sessionKey = "scenario-exam:session-1:item-1";
    const revisionKey = "exam:item-1:7";
    const key = `cns-training:vor-scenario-session:v2:session-1:${encodeURIComponent(sessionKey)}:${encodeURIComponent(revisionKey)}:scenario-1`;
    window.localStorage.setItem(key, JSON.stringify({ version: 2, userId: session.id, sessionKey, revisionKey, scenarioId: "scenario-1", savedAt: result.capturedAt, actionHistory: [], answer: result.payload.answer, checkpoint: result.payload.checkpoint }));
    expect(readCandidateScenarioExamResult(session, session.subjects[0])?.payload.answer).toEqual(result.payload.answer);
    expect(readCandidateScenarioExamResult(session, { ...session.subjects[0], revision: 8 })).toBeNull();
  });
  it("prefers the latest Selex changes over an older periodic autosave", () => {
    window.localStorage.setItem(candidateResultStorageKey(session.id, result.sessionItemId), JSON.stringify(result));
    const sessionKey = "scenario-exam:session-1:item-1";
    const revisionKey = "exam:item-1:7";
    const key = `cns-training:vor-scenario-session:v2:session-1:${encodeURIComponent(sessionKey)}:${encodeURIComponent(revisionKey)}:scenario-1`;
    window.localStorage.setItem(key, JSON.stringify({ version: 2, userId: session.id, sessionKey, revisionKey, scenarioId: "scenario-1", savedAt: "2026-10-01T01:00:05.000Z", actionHistory: [], answer: { suspectedFault: "Latest conclusion" }, checkpoint: { config: { reference: 101 } } }));
    expect(readCandidateScenarioExamResult(session, session.subjects[0])?.payload.answer).toEqual({ suspectedFault: "Latest conclusion" });
    window.localStorage.setItem(candidateResultStorageKey(session.id, result.sessionItemId), JSON.stringify({ ...result, capturedAt: "2026-10-01T01:00:10.000Z" }));
    expect(readCandidateScenarioExamResult(session, session.subjects[0])?.payload.answer).toEqual(result.payload.answer);
  });
});
