"use client";

import { useEffect, useRef, useState } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { useScenarioStore } from "@/stores/scenario-store";

export interface PracticeSubmissionInput {
  moduleId: ScenarioParametersModuleId;
  scenarioId: string;
  attemptKey?: string | number | null;
  enabled?: boolean;
  getPayload: () => Record<string, unknown> | null;
  libraryMembershipId?: string;
}

function readPointer(key: string | null) {
  try { return key ? sessionStorage.getItem(key) : null; } catch { return null; }
}

export function usePracticeSubmission({ moduleId, scenarioId, getPayload, attemptKey, libraryMembershipId, enabled = true }: PracticeSubmissionInput) {
  // AppShell's ScenarioSessionBoundary binds this to the server AuthProfile for
  // every module, and gates children synchronously on logout / identity changes.
  const owner = useScenarioStore((state) => state.sessionIdentity);
  // Only persist an opaque server ID, never feedback or a simulator checkpoint.
  // Native start timestamps may be regenerated on reload; the latest submitted
  // result remains available until the learner explicitly restarts the simulator.
  const storageKey = enabled && owner ? `cns:practice-feedback:${JSON.stringify([owner, moduleId, scenarioId, ...(libraryMembershipId ? [libraryMembershipId] : [])])}` : null;
  const scope = JSON.stringify([owner, moduleId, scenarioId, libraryMembershipId, enabled]);
  const [state, setState] = useState(() => ({ scope, attemptKey, submissionId: readPointer(storageKey), pending: false, error: null as string | null }));
  const flight = useRef<{ controller: AbortController; scope: string } | null>(null);
  const frozen = useRef<{ key: string; body: string } | null>(null);
  const current = state.scope === scope && state.attemptKey === attemptKey;

  useEffect(() => {
    if (current) return;
    flight.current?.controller.abort();
    flight.current = null;
    frozen.current = null;
    const sameScope = state.scope === scope;
    if (sameScope && storageKey) {
      try { sessionStorage.removeItem(storageKey); } catch { /* Optional browser storage. */ }
    }
    setState({ scope, attemptKey, submissionId: sameScope ? null : readPointer(storageKey), pending: false, error: null });
  }, [current, scope, attemptKey, state.scope, storageKey]);

  useEffect(() => () => { flight.current?.controller.abort(); }, []);

  async function submit() {
    if (!enabled || !current || flight.current) return;
    if (state.submissionId) return state.submissionId;
    const request = { controller: new AbortController(), scope };
    flight.current = request;
    setState((value) => ({ ...value, pending: true, error: null }));
    try {
      if (!frozen.current) frozen.current = { key: crypto.randomUUID(), body: JSON.stringify({ moduleId, scenarioId, payload: sanitizeScenarioExamPayload(getPayload()), ...(libraryMembershipId ? { libraryMembershipId } : {}) }) };
      const response = await fetch("/api/ai/practice-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": frozen.current.key },
        body: frozen.current.body,
        signal: request.controller.signal,
      });
      const data = await response.json() as { submissionId?: string; error?: string };
      if (request.controller.signal.aborted) return;
      if (!response.ok || !data.submissionId) {
        // A definitive rejection is not an ambiguous transport outcome.
        if (response.status >= 400 && response.status < 500 && response.status !== 408) frozen.current = null;
        throw new Error(data.error ?? "Không thể nộp bài ôn tập.");
      }
      setState((value) => ({ ...value, submissionId: data.submissionId!, pending: false }));
      try { if (storageKey) sessionStorage.setItem(storageKey, data.submissionId); } catch { /* Server ACK is authoritative. */ }
      return data.submissionId;
    } catch (cause) {
      if (!request.controller.signal.aborted) setState((value) => ({ ...value, error: cause instanceof Error ? cause.message : "Không thể nộp bài ôn tập.", pending: false }));
    } finally {
      if (flight.current === request) flight.current = null;
    }
  }
  function reset() {
    if (flight.current) return;
    frozen.current = null;
    setState({ scope, attemptKey, submissionId: null, pending: false, error: null });
    try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
  }
  return { submissionId: current && enabled ? state.submissionId : null, pending: current && state.pending, error: current ? state.error : null, submit, reset };
}

export type PracticeSubmissionController = ReturnType<typeof usePracticeSubmission>;
