export type ScenarioEvidenceValue =
  | string
  | number
  | boolean
  | null
  | ScenarioEvidenceValue[]
  | { [key: string]: ScenarioEvidenceValue };

export type ScenarioEvidenceSnapshot = Record<string, ScenarioEvidenceValue>;

export type ScenarioActionActor = "student" | "system" | "instructor";
export type ScenarioActionKind =
  | "view"
  | "control"
  | "configuration"
  | "authentication"
  | "system";

export type ScenarioParameterChangePhase = "draft" | "apply" | "command" | "restore" | "backup";

export interface ScenarioParameterChange {
  fieldId: string;
  label: string;
  before: ScenarioEvidenceValue;
  after: ScenarioEvidenceValue;
  phase: ScenarioParameterChangePhase;
  accepted: boolean;
}

export const MAX_SCENARIO_ACTION_HISTORY_EVENTS = 500;

export interface ScenarioEvidenceStats {
  totalEventCount: number;
  storedEventCount: number;
  droppedCount: number;
  evidenceTruncated: boolean;
  lastSequence: number;
}

export function createScenarioEvidenceStats(
  history: readonly ScenarioActionEvent[] = [],
): ScenarioEvidenceStats {
  const storedEventCount = Math.min(history.length, MAX_SCENARIO_ACTION_HISTORY_EVENTS);
  const lastSequence = history.reduce((maximum, event) => Math.max(maximum, event.sequence), 0);
  return {
    totalEventCount: lastSequence,
    storedEventCount,
    droppedCount: Math.max(0, lastSequence - storedEventCount),
    evidenceTruncated: lastSequence > storedEventCount,
    lastSequence,
  };
}

export function appendScenarioEvidenceEvent(
  existing: readonly ScenarioActionEvent[],
  next: ScenarioActionEvent,
  stats: ScenarioEvidenceStats,
): { history: ScenarioActionEvent[]; stats: ScenarioEvidenceStats } {
  const totalEventCount = Math.max(stats.totalEventCount, next.sequence);
  const canStore = existing.length < MAX_SCENARIO_ACTION_HISTORY_EVENTS;
  const history = canStore ? [...existing, next] : [...existing];
  const storedEventCount = history.length;
  return {
    history,
    stats: {
      totalEventCount,
      storedEventCount,
      droppedCount: Math.max(0, totalEventCount - storedEventCount),
      evidenceTruncated: totalEventCount > storedEventCount,
      lastSequence: Math.max(stats.lastSequence, next.sequence),
    },
  };
}

export function isScenarioEvidenceStats(value: unknown): value is ScenarioEvidenceStats {
  if (!isRecord(value)) return false;
  const totalEventCount = value.totalEventCount;
  const storedEventCount = value.storedEventCount;
  return ["totalEventCount", "storedEventCount", "droppedCount", "lastSequence"].every((key) => (
    typeof value[key] === "number" && Number.isInteger(value[key]) && (value[key] as number) >= 0
  )) && typeof value.evidenceTruncated === "boolean"
    && typeof storedEventCount === "number"
    && typeof totalEventCount === "number"
    && storedEventCount <= MAX_SCENARIO_ACTION_HISTORY_EVENTS
    && storedEventCount <= totalEventCount;
}

/**
 * A compact, serializable audit event. Inputs are intentionally typed as JSON
 * values so passwords and DOM objects cannot accidentally enter an exam result.
 */
export interface ScenarioActionEvent {
  id: string;
  sequence: number;
  occurredAt: string;
  actor: ScenarioActionActor;
  kind: ScenarioActionKind;
  controlId?: string;
  menuPath: string[];
  label: string;
  input?: ScenarioEvidenceValue;
  accepted: boolean;
  reason?: string;
  before?: ScenarioEvidenceSnapshot;
  after?: ScenarioEvidenceSnapshot;
  parameterChanges?: readonly ScenarioParameterChange[];
}

export interface ScenarioResolutionCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ScenarioResolution {
  active: boolean;
  solved: boolean;
  startedAt: string | null;
  solvedAt?: string;
  elapsedMs?: number;
  finalChecks: ScenarioResolutionCheck[];
  blockers: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isScenarioEvidenceValue(value: unknown): value is ScenarioEvidenceValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isScenarioEvidenceValue);
  return isRecord(value) && Object.values(value).every(isScenarioEvidenceValue);
}

export function isScenarioEvidenceSnapshot(value: unknown): value is ScenarioEvidenceSnapshot {
  return isRecord(value) && Object.values(value).every(isScenarioEvidenceValue);
}

export function isScenarioActionEvent(value: unknown): value is ScenarioActionEvent {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" || !value.id.trim()
    || typeof value.sequence !== "number" || !Number.isInteger(value.sequence) || value.sequence < 1
    || typeof value.occurredAt !== "string"
    || !["student", "system", "instructor"].includes(value.actor as ScenarioActionActor)
    || !["view", "control", "configuration", "authentication", "system"].includes(value.kind as ScenarioActionKind)
    || !Array.isArray(value.menuPath) || !value.menuPath.every((item) => typeof item === "string")
    || typeof value.label !== "string" || !value.label.trim()
    || typeof value.accepted !== "boolean"
  ) return false;
  if (value.controlId !== undefined && typeof value.controlId !== "string") return false;
  if (value.input !== undefined && !isScenarioEvidenceValue(value.input)) return false;
  if (value.reason !== undefined && typeof value.reason !== "string") return false;
  if (value.before !== undefined && !isScenarioEvidenceSnapshot(value.before)) return false;
  if (value.after !== undefined && !isScenarioEvidenceSnapshot(value.after)) return false;
  if (value.parameterChanges !== undefined && (!Array.isArray(value.parameterChanges) || !value.parameterChanges.every((change) => {
    if (!isRecord(change)) return false;
    return typeof change.fieldId === "string"
      && typeof change.label === "string"
      && isScenarioEvidenceValue(change.before)
      && isScenarioEvidenceValue(change.after)
      && ["draft", "apply", "command", "restore", "backup"].includes(change.phase as ScenarioParameterChangePhase)
      && typeof change.accepted === "boolean";
  }))) return false;
  return true;
}

export function appendScenarioActionHistory(
  existing: readonly ScenarioActionEvent[],
  next: ScenarioActionEvent,
): ScenarioActionEvent[] {
  if (existing.length >= MAX_SCENARIO_ACTION_HISTORY_EVENTS) return [...existing];
  return [...existing, next];
}

export function isScenarioResolution(value: unknown): value is ScenarioResolution {
  if (!isRecord(value) || typeof value.active !== "boolean" || typeof value.solved !== "boolean") return false;
  if (!(typeof value.startedAt === "string" || value.startedAt === null)) return false;
  if (value.solvedAt !== undefined && typeof value.solvedAt !== "string") return false;
  if (
    value.elapsedMs !== undefined
    && (typeof value.elapsedMs !== "number" || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0)
  ) return false;
  if (!Array.isArray(value.finalChecks) || !value.finalChecks.every((check) => {
    if (!isRecord(check)) return false;
    return typeof check.id === "string"
      && typeof check.label === "string"
      && typeof check.passed === "boolean"
      && typeof check.detail === "string";
  })) return false;
  return Array.isArray(value.blockers) && value.blockers.every((blocker) => typeof blocker === "string");
}

function displayEvidenceValue(value: ScenarioEvidenceValue | undefined): string {
  if (value === undefined) return "không ghi nhận";
  if (typeof value === "boolean") return value ? "Normal/Có" : "Alarm/Không";
  if (value === null) return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/** Human-readable changes used by both the student journal and examiner view. */
export function describeScenarioActionTransition(event: ScenarioActionEvent): string[] {
  const transitions = event.before && event.after ? [
    ...(() => {
      const fields = [
    ["monitorNormal", "Integral Monitor"],
    ["monitorIntegralNormal", "Integral Monitor"],
    ["monitorStandbyNormal", "Standby Monitor"],
    ["monitorBypass", "Monitor Bypass"],
    ["monitorIntegralBypass", "Integral Bypass"],
    ["monitorStandbyBypass", "Standby Bypass"],
    ["sidebandVswrAlarm", "Sideband VSWR"],
    ["primaryMonitorAlarm", "Primary Monitor Alarm"],
    ["secondaryMonitorAlarm", "Secondary Monitor Alarm"],
    ["activeTransmitter", "Active Transmitter"],
    ["alarm", "PMDT Alarm"],
      ] as const;
      return fields.flatMap(([key, label]) => {
    const before = event.before?.[key];
    const after = event.after?.[key];
    return JSON.stringify(before) === JSON.stringify(after)
      ? []
      : [`${label}: ${displayEvidenceValue(before)} → ${displayEvidenceValue(after)}`];
      });
    })(),
  ] : [];
  return [
    ...transitions,
    ...(event.parameterChanges ?? []).map((change) => (
      `${change.label}: ${displayEvidenceValue(change.before)} → ${displayEvidenceValue(change.after)} (${change.phase})`
    )),
  ];
}

export function scenarioResolutionFromEvaluation(input: {
  active: boolean;
  solved: boolean;
  startedAt: string | null;
  checks: readonly ScenarioResolutionCheck[];
  blockers: readonly string[];
  now?: string;
}): ScenarioResolution {
  const solvedAt = input.solved && input.now ? input.now : undefined;
  const startedMs = input.startedAt ? Date.parse(input.startedAt) : Number.NaN;
  const solvedMs = solvedAt ? Date.parse(solvedAt) : Number.NaN;
  return {
    active: input.active,
    solved: input.solved,
    startedAt: input.startedAt,
    ...(solvedAt ? { solvedAt } : {}),
    ...(Number.isFinite(startedMs) && Number.isFinite(solvedMs) && solvedMs >= startedMs
      ? { elapsedMs: solvedMs - startedMs }
      : {}),
    finalChecks: structuredClone([...input.checks]),
    blockers: [...input.blockers],
  };
}
