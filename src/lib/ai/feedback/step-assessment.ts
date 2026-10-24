import { presentAdsbResult, presentPmdtResult } from "@/lib/exams/result-presentation";
import { isRecord } from "@/lib/scenario-exams/results";
import { collectChangedConfigFields, formatParameterChangeField, MAX_PARAMETER_CHANGE_LOG_ROWS } from "@/lib/simulator-config/parameter-change";
import { parseScenarioParameters, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { TerminalEngine } from "@/lib/terminal-engine";
import type { RecordedAction } from "@/lib/types";
import type { EvidenceMatcher, ScenarioRubric } from "@/lib/ai/scenario-blueprint/types";
import { validateScenarioRubric } from "@/lib/ai/scenario-blueprint/validation";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";
import { isScenarioActionEvent } from "@/lib/scenario-evidence";
import { dmeParameterFieldCatalog } from "@/lib/dme1119a/config";
import { dvor1150aNativeFieldEvidence, parseDvor1150aScenarioDefinition, type Dvor1150aScenarioEvidence } from "@/lib/dvor1150a/scenario";
import type { Dvor1150aConfig } from "@/lib/dvor1150a/config-types";

export type StepAssessmentStatus = "correct" | "missing" | "incorrect" | "unverified";
export interface AssessedStep {
  id: string;
  label: string;
  status: StepAssessmentStatus;
  evidenceIds: string[];
  citationIds: string[];
  /** Effective state is an outcome, not proof of a learner's procedure. */
  resultEvidenceIds?: string[];
}
export interface UnrelatedParameterChange {
  fieldId: string;
  label: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
  evidenceIds: string[];
  citationIds: string[];
  reason: string;
}
export interface RedundantAction {
  controlId: string;
  label: string;
  evidenceIds: string[];
  reason: "repeated" | "rejected";
}
export interface AttemptStepAssessment {
  rubricVersion: 1;
  correct: number;
  totalRequiredSteps: number;
  steps: AssessedStep[];
  unrelatedParameterChanges: UnrelatedParameterChange[];
  redundantActions: RedundantAction[];
  notice: string;
}

type Scalar = string | number | boolean | null;
function isScalar(value: unknown): value is Scalar {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}
function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) =>
    key !== "__proto__" && key !== "constructor" && key !== "prototype" && (isRecord(current) || Array.isArray(current))
      && Object.prototype.hasOwnProperty.call(current, key) ? (current as Record<string, unknown>)[key] : undefined, value);
}
function equalValue(actual: unknown, expected: unknown, tolerance = 0): boolean {
  return typeof actual === "number" && typeof expected === "number"
    ? Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(0, tolerance)
    : Object.is(actual, expected);
}

function equalJson(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(actual) || Array.isArray(expected)) return Array.isArray(actual) && Array.isArray(expected)
    && actual.length === expected.length && actual.every((value, index) => equalJson(value, expected[index]));
  if (!isRecord(actual) || !isRecord(expected)) return false;
  return Object.keys(actual).length === Object.keys(expected).length
    && Object.keys(expected).every(key => Object.hasOwn(actual, key) && equalJson(actual[key], expected[key]));
}

function replayAdsb(definition: unknown, payload: Record<string, unknown> | null) {
  const parsed = parseScenarioParameters("ads-b", definition);
  const presentation = presentAdsbResult(payload);
  const source = Array.isArray(payload?.allActions) ? presentation?.allActions : presentation?.selectedActions;
  const rawSource = Array.isArray(payload?.allActions) ? payload.allActions : payload?.selectedActions;
  const records: { id: string; action: RecordedAction }[] = [];
  if (!parsed || !source || !Array.isArray(rawSource) || source.length !== rawSource.length || source.length > 1000) return { records, complete: false, initial: undefined, running: undefined };
  const sensor = parsed.sites.flatMap(site => [site.sensorA, site.sensorB]).find(sensor => sensor?.id === parsed.targetSensorId);
  if (!sensor) return { records, complete: false, initial: undefined, running: undefined };
  let engine = new TerminalEngine({ targetLoginUser: parsed.targetLoginUser, targetIpAddress: sensor.ipAddress,
    sensorDataProfile: sensor.dataProfile, sensorMonitoring: sensor.monitoring });
  let complete = true;
  for (const [index, action] of source.entries()) {
    if (action.kind === "authentication") continue; // Never replay credentials.
    if (engine.getState().exited) {
      const role = action.menuId === "sa.root" ? "sysadmin" : action.menuId === "ma.root" ? "maintenance" : null;
      if (!role) { complete = false; break; }
      const persistent = engine.getPersistentState();
      engine = new TerminalEngine({ targetLoginUser: role, targetIpAddress: sensor.ipAddress,
        sensorDataProfile: sensor.dataProfile, sensorMonitoring: sensor.monitoring });
      engine.restorePersistentState(persistent);
    }
    if (engine.getState().pendingSensitive) { complete = false; break; }
    const response = engine.processInput(action.input);
    const native = response.recordableAction;
    if (!response.accepted || !native || native.menuId !== action.menuId || native.kind !== action.kind || native.input !== action.input
      || engine.getState().pendingSensitive) { complete = false; break; }
    records.push({ id: `terminal:${index + 1}`, action: { ...native, step: index + 1, timestamp: action.timestamp } });
  }
  const state = engine.getPersistentState();
  const pending = engine.getState().pendingInteraction;
  if ((pending && pending !== "display") || state.runtime.pendingNetwork) complete = false;
  return { records, complete, initial: { targetSensor: sensor },
    running: complete ? { targetSensor: { ...sensor, dataProfile: state.sensorDataProfile } } : undefined };
}

/** Procedure counts come only from required rubric steps, never alarm counts. */
export function assessAttemptSteps(
  moduleId: ScenarioParametersModuleId,
  definition: unknown,
  payload: Record<string, unknown> | null,
  rubric: ScenarioRubric,
): AttemptStepAssessment {
  rubric = validateScenarioRubric(rubric, moduleId);
  const technical = evaluateScenarioExamResult(moduleId, definition, payload);
  const pmdt = presentPmdtResult(payload ? { ...payload, events: payload.attemptEvents ?? payload.events } : null);
  const actions = (Array.isArray(payload?.actionHistory) ? payload.actionHistory.filter(isScenarioActionEvent) : [])
    .filter(action => action.actor === "student");
  const stats = isRecord(payload?.evidenceStats) ? payload.evidenceStats : {};
  const truncated = stats.evidenceTruncated === true || Number(stats.droppedCount) > 0
    || Number(stats.totalEventCount) > Number(stats.storedEventCount);
  const terminal = moduleId === "ads-b" ? replayAdsb(definition, payload) : null;
  const history = Array.isArray(payload?.actionHistory) ? payload.actionHistory : null;
  const validHistory = history?.every(isScenarioActionEvent) && new Set(history.map(action => action.id)).size === history.length
    && [...history].sort((a, b) => a.sequence - b.sequence).every((action, index) => action.sequence === index + 1);
  const complete = (terminal ? terminal.complete : validHistory) && !truncated;
  const mopiens = moduleId === "dvor-220" || moduleId === "dme-320";
  const running = terminal ? terminal.running : readPath(payload, moduleId === "dvor-220" ? "device.configuration.running" : moduleId === "dme-320" ? "simulation.config.running"
    : moduleId === "dme-1119a" ? "checkpoint.data" : "checkpoint.config");
  const initial = terminal ? terminal.initial : readPath(definition, "configuration");
  // Only the additive exact-configuration contract opts in; preserve every other module/publication's scoring semantics.
  const exactDvorConfiguration = moduleId === "dvor-1150a" && readPath(definition, "successCriteria.configurationValues") !== undefined;
  const dvorDefinition = exactDvorConfiguration ? parseDvor1150aScenarioDefinition(definition) : null;
  const dvorFieldProof = (fieldId: string) => dvorDefinition ? dvor1150aNativeFieldEvidence(dvorDefinition, fieldId,
    running as Dvor1150aConfig | undefined, { actionHistory: payload?.actionHistory as Dvor1150aScenarioEvidence["actionHistory"],
      evidenceStats: payload?.evidenceStats as Dvor1150aScenarioEvidence["evidenceStats"],
      runId: typeof readPath(payload, "checkpoint.scenarioRunId") === "string" ? readPath(payload, "checkpoint.scenarioRunId") as string : undefined },
    typeof readPath(payload, "checkpoint.scenarioStartedAt") === "string" ? readPath(payload, "checkpoint.scenarioStartedAt") as string : null,
    typeof readPath(payload, "checkpoint.scenarioRunId") === "string" ? readPath(payload, "checkpoint.scenarioRunId") as string : undefined,
    typeof readPath(payload, "checkpoint.scenarioId") === "string" ? readPath(payload, "checkpoint.scenarioId") as string : undefined) : [];
  const dvorApplyProof = exactDvorConfiguration ? [...new Map(rubric.steps.flatMap(step => step.alternatives.flat())
    .flatMap(matcher => matcher.kind === "parameter" ? dvorFieldProof(matcher.fieldId.replace(/^configuration\./, "")) : [])
    .map(action => [action.id, action])).values()] : [];
  // Accept the compiler's running-relative path and the full authoring path,
  // but never strip arbitrary prefixes or turn unknown paths into known fields.
  const fieldPath = (fieldId: string) => fieldId.startsWith("configuration.")
    && readPath(initial, fieldId.slice("configuration.".length)) !== undefined
    ? fieldId.slice("configuration.".length) : fieldId;
  for (const step of rubric.steps) for (const matcher of step.alternatives.flat()) {
    if (matcher.kind === "parameter") matcher.fieldId = fieldPath(matcher.fieldId);
  }
  for (const field of rubric.parameterRelevance) field.fieldId = fieldPath(field.fieldId);
  const changedFields = (mopiens || terminal) && isRecord(initial) && isRecord(running) ? collectChangedConfigFields(initial, running) : [];
  const parameterLog = readPath(payload, moduleId === "dvor-220" ? "device.history.parameterChanges" : moduleId === "dvor-1150" ? "parameterChangeLogs" : "simulation.parameterChangeLogs");
  const parameterScope = readPath(payload, moduleId === "dvor-220" ? "device.parameterEvidence" : moduleId === "dme-320" ? "simulation.parameterEvidence" : "parameterEvidence");
  const scopedParameters = (mopiens || moduleId === "dvor-1150") && isRecord(parameterScope)
    && parameterScope.version === 1 && parameterScope.moduleId === moduleId && parameterScope.scenarioId === readPath(definition, "id")
    && typeof parameterScope.runId === "string" && /^[\da-f-]{36}$/i.test(parameterScope.runId)
    && typeof parameterScope.startedAtMs === "number" && Number.isFinite(parameterScope.startedAtMs)
    && typeof parameterScope.lastSequence === "number" && Number.isSafeInteger(parameterScope.lastSequence) && parameterScope.lastSequence >= 0;
  const initialNativeValue = (fieldId: string) => moduleId === "dvor-1150" && fieldId === "simulation.integralMonitorBypass"
    ? readPath(definition, "startPolicy.startMonitorBypassed") : moduleId === "dvor-1150" && fieldId === "simulation.local"
      ? readPath(definition, "startPolicy.startLocal") : readPath(initial, fieldId);
  // A full display buffer may have silently dropped earlier native operations.
  const nativeRows = scopedParameters && !truncated && Array.isArray(parameterLog) && parameterLog.length < MAX_PARAMETER_CHANGE_LOG_ROWS ? parameterLog.filter(isRecord).filter(entry =>
    entry.evidenceRunId === parameterScope.runId && entry.moduleId === moduleId && entry.scenarioId === parameterScope.scenarioId
    && entry.state === "normal" && typeof entry.id === "string" && entry.id.length <= 250
    && (entry.origin === undefined || entry.origin === "student" || entry.origin === "native-derived")
    && typeof entry.nativeFieldId === "string" && entry.nativeFieldId.length <= 200
    && isScalar(entry.before) && isScalar(entry.after) && !Object.is(entry.before, entry.after)
    && isScalar(initialNativeValue(entry.nativeFieldId)) && typeof entry.before === typeof initialNativeValue(entry.nativeFieldId)
    && typeof entry.after === typeof initialNativeValue(entry.nativeFieldId)
    && typeof entry.sequence === "number" && Number.isSafeInteger(entry.sequence) && entry.sequence > 0 && entry.sequence <= Number(parameterScope.lastSequence)
    && typeof entry.timestampMs === "number" && Number.isFinite(entry.timestampMs) && entry.timestampMs >= Number(parameterScope.startedAtMs)
    && ((entry.phase === "apply" && entry.controlId === (moduleId === "dvor-1150" ? "config-apply" : "apply-draft"))
      || (moduleId === "dvor-220" && entry.phase === "apply" && entry.controlId === "apply-transmitter-helper"
        && /^transmitters\.tx[12]\.(?:carrierScalePercent|trackingEnabled|sidebandPowerW\.(?:usbCos|usbSin|lsbCos|lsbSin))$/.test(entry.nativeFieldId))
      || (moduleId === "dvor-1150" && entry.phase === "command" && entry.controlId === "integral-monitor-bypass" && entry.nativeFieldId === "simulation.integralMonitorBypass"))
    && entry.id === `${parameterScope.runId}:${entry.sequence}:${entry.nativeFieldId}`) : [];
  // Missing earlier operations leave the order/provenance of later rows unknown.
  const nativeSequences = [...new Set(nativeRows.map(entry => Number(entry.sequence)))].sort((a, b) => a - b);
  let verifiedSequence = 0, nativeTimestamp = -Infinity;
  for (const sequence of nativeSequences) {
    const timestamps = new Set(nativeRows.filter(entry => entry.sequence === sequence).map(entry => Number(entry.timestampMs)));
    const timestamp = [...timestamps][0];
    if (sequence !== verifiedSequence + 1 || timestamps.size !== 1 || timestamp < nativeTimestamp) break;
    verifiedSequence = sequence;
    nativeTimestamp = timestamp;
  }
  // A field's full observed chain must start at the native scenario baseline and
  // finish at running state. Do not resurrect an earlier target from stale history.
  const nativeChanges = nativeRows.filter(entry => {
    if (Number(entry.sequence) > verifiedSequence) return false;
    const chain = nativeRows.filter(row => row.nativeFieldId === entry.nativeFieldId).sort((a, b) => Number(a.sequence) - Number(b.sequence));
    let previous = initialNativeValue(String(entry.nativeFieldId));
    let sequence = 0, timestamp = -Infinity;
    for (const row of chain) {
      if (Number(row.sequence) <= sequence || Number(row.timestampMs) < timestamp || !Object.is(row.before, previous)) return false;
      sequence = Number(row.sequence); timestamp = Number(row.timestampMs); previous = row.after;
    }
    return Object.is(previous, readPath(running, String(entry.nativeFieldId)));
  });
  const legacyControls = moduleId === "dvor-1150" && Array.isArray(payload?.acceptedActionControlIds)
    ? payload.acceptedActionControlIds.filter((id): id is string => typeof id === "string"
      && /^(config-apply|tx-transfer-tx[12]|diagnostics-run-(full|on-air|standby))$/.test(id)) : [];

  const stateEvidence = (fieldId: string) => [`state:${fieldId}`, ...(Array.isArray(parameterLog) ? parameterLog.filter(isRecord)
    .filter(entry => entry.parameter === formatParameterChangeField(fieldId) && typeof entry.id === "string").map(entry => `history:${entry.id}`) : [])];
  const unrelatedParameterChanges: UnrelatedParameterChange[] = [];
  const relevantFields = new Set([...rubric.parameterRelevance.map(field => field.fieldId),
    ...rubric.steps.flatMap(step => step.alternatives.flat().flatMap(matcher => matcher.kind === "parameter" ? [matcher.fieldId] : []))]);
  for (const fieldId of changedFields) {
    // Retain the complete effective chain for recovery proof, but do not call
    // a native tracking outcome an extra student edit. Mixed/manual chains
    // remain reviewable; stale, incomplete or origin-less rows cannot hide one.
    const fieldChanges = nativeChanges.filter(entry => entry.nativeFieldId === fieldId);
    if (moduleId === "dvor-220" && scopedParameters && verifiedSequence === Number(parameterScope.lastSequence)
      && /^transmitters\.tx[12]\.sidebandPowerW\.(?:usbCos|usbSin|lsbCos|lsbSin)$/.test(fieldId)
      && fieldChanges.length && fieldChanges.every(entry => entry.origin === "native-derived" && entry.controlId === "apply-draft")) continue;
    const before = readPath(initial, fieldId), after = readPath(running, fieldId);
    if (!relevantFields.has(fieldId) && isScalar(before) && isScalar(after)) unrelatedParameterChanges.push({
      fieldId, label: formatParameterChangeField(fieldId), before, after, evidenceIds: stateEvidence(fieldId), citationIds: [],
      reason: "Tham số thay đổi ngoài phạm vi rubric; cần giám khảo xem xét, không tự trừ điểm.",
    });
  }
  for (const action of actions) {
    if (!action.accepted) continue;
    for (const change of action.parameterChanges ?? []) {
      // DME Apply includes recomputed measurements in its native audit diff.
      // Those are outcomes, not extra controls the learner adjusted.
      if (moduleId === "dme-1119a" && !dmeParameterFieldCatalog.some(field => field.id === change.fieldId && !field.readOnly)) continue;
      const actual = readPath(running, change.fieldId);
      if (change.phase === "draft" || change.phase === "backup" || !change.accepted || relevantFields.has(change.fieldId)
        || !isScalar(change.before) || !isScalar(actual) || Object.is(change.before, actual) || !Object.is(change.after, actual)) continue;
      const existing = unrelatedParameterChanges.find(item => item.fieldId === change.fieldId);
      if (existing) existing.evidenceIds.push(action.id);
      else unrelatedParameterChanges.push({ fieldId: change.fieldId, label: change.label, before: change.before, after: actual,
        evidenceIds: [action.id], citationIds: [], reason: "Tham số thay đổi ngoài phạm vi rubric; cần giám khảo xem xét, không tự trừ điểm." });
    }
  }
  const match = (matcher: EvidenceMatcher): string[] => {
    if (matcher.kind === "technical-check") return technical.checks.some(check => check.id === matcher.checkId && check.passed) ? [`technical:${matcher.checkId}`] : [];
    if (matcher.kind === "hardware") {
      const selected = payload?.scenarioHardwareSelection ?? payload?.diagnosedComponentIds;
      return Array.isArray(selected) && selected.includes(matcher.occurrenceKey) ? [`hardware:${matcher.occurrenceKey}`] : [];
    }
    if (matcher.kind === "terminal") return terminal?.records.filter(record => record.action.menuId === matcher.menuId && record.action.input === matcher.input).map(record => record.id) ?? [];
    if (matcher.kind === "parameter") {
      if (!isScalar(readPath(initial, matcher.fieldId))) return [];
      const actual = readPath(running, matcher.fieldId);
      if (exactDvorConfiguration) return equalValue(actual, matcher.value, matcher.tolerance)
        ? dvorFieldProof(matcher.fieldId).filter(action => action.parameterChanges?.some(change => change.fieldId === matcher.fieldId
          && Object.is(change.after, actual))).map(action => action.id) : [];
      if (mopiens || moduleId === "dvor-1150") {
        const proof = equalValue(actual, matcher.value, matcher.tolerance) ? nativeChanges.filter(entry => entry.nativeFieldId === matcher.fieldId
          && Object.is(entry.after, actual)).map(entry => `history:${entry.id}`) : [];
        if (mopiens || parameterScope !== undefined || proof.length) return proof;
      }
      if (terminal) return changedFields.includes(matcher.fieldId) && equalValue(actual, matcher.value, matcher.tolerance) ? stateEvidence(matcher.fieldId) : [];

      return equalValue(actual, matcher.value, matcher.tolerance) ? actions.filter(action => action.accepted
        && action.parameterChanges?.some(change => change.accepted && change.phase !== "draft" && change.phase !== "backup"
          && change.fieldId === matcher.fieldId && equalValue(change.after, actual, matcher.tolerance))).map(action => action.id) : [];
    }
    if (matcher.kind === "action" && exactDvorConfiguration && ["config-apply", "simulation.local", "simulation.integralMonitorBypass"].includes(matcher.controlId)) {
      const proof = matcher.controlId === "config-apply" ? dvorApplyProof : dvorFieldProof(matcher.controlId);
      return proof.filter(action => action.accepted && action.controlId === matcher.controlId
        && (matcher.input === undefined || equalJson(action.input, matcher.input))).map(action => action.id);
    }
    if (matcher.kind === "action") return [...actions.filter(action => action.accepted && action.controlId === matcher.controlId
      && (matcher.input === undefined || equalJson(action.input, matcher.input))).map(action => action.id),
      ...(matcher.input === undefined ? nativeChanges.filter(entry => entry.controlId === matcher.controlId).map(entry => `history:${entry.id}`) : []),
      ...(!scopedParameters && matcher.input === undefined && legacyControls.includes(matcher.controlId) ? [`accepted:${matcher.controlId}`] : [])];
    if (matcher.kind === "view") {
      const visits = actions.filter(action => action.accepted && action.kind === "view" && action.controlId === matcher.viewId).map(action => action.id);
      if (visits.length) return visits;
      const events = (pmdt?.events ?? []).filter(event => event.viewId === matcher.viewId).map(event => event.id);
      return events.length ? events : Array.isArray(payload?.visitedViewIds) && payload.visitedViewIds.includes(matcher.viewId) ? [`view:${matcher.viewId}`] : [];
    }
    return [];
  };
  const orders = new Map(actions.map(action => [action.id, action.sequence]));
  for (const entry of nativeChanges) orders.set(`history:${entry.id}`, Number(entry.sequence));
  for (const record of terminal?.records ?? []) orders.set(record.id, record.action.step);
  const assessed = new Map<string, AssessedStep>();
  const consumedTerminal = new Set<string>();
  const visiting = new Set<string>();
  const assess = (id: string): AssessedStep => {
    const cached = assessed.get(id);
    if (cached) return cached;
    const step = rubric.steps.find(step => step.id === id);
    if (!step || visiting.has(id)) return { id, label: step?.label ?? id, status: "unverified", evidenceIds: [], citationIds: [] };
    visiting.add(id);
    const prerequisites = step.prerequisites.map(assess);
    const prerequisiteOrders = prerequisites.flatMap(step => step.evidenceIds.filter(id => !id.startsWith("technical:")).map(id => orders.get(id)));
    const unknownOrder = prerequisiteOrders.some(order => order === undefined);
    const after = Math.max(-Infinity, ...prerequisiteOrders.filter((order): order is number => order !== undefined));
    const paths = step.alternatives.map(alternative => alternative.map(match));
    const path = prerequisites.every(step => step.status === "correct") && !unknownOrder
      ? paths.map(matches => matches.map(ids => ids.filter(id => !consumedTerminal.has(id) && (!prerequisites.length || id.startsWith("technical:") || (orders.get(id) ?? -Infinity) > after))
        .sort((left, right) => (orders.get(left) ?? Infinity) - (orders.get(right) ?? Infinity)).slice(0, 1)))
        .find(matches => matches.length && matches.every(ids => ids.length)) : undefined;
    const attempted = actions.filter(action => step.alternatives.flat().some(matcher =>
      (matcher.kind === "action" && matcher.controlId === action.controlId)
      || (matcher.kind === "parameter" && action.parameterChanges?.some(change => change.fieldId === matcher.fieldId && change.phase !== "draft" && change.phase !== "backup"))));
    const unknownMatcher = step.alternatives.flat().some(matcher =>
      (matcher.kind === "parameter" && !isScalar(readPath(initial, matcher.fieldId)))
      || (matcher.kind === "technical-check" && !technical.checks.some(check => check.id === matcher.checkId)));
    const nativeProofUnavailable = ((mopiens || moduleId === "dvor-1150") && step.alternatives.flat().some(matcher =>
      matcher.kind === "parameter" && !nativeChanges.some(entry => entry.nativeFieldId === matcher.fieldId)))
      || (exactDvorConfiguration && step.alternatives.flat().some(matcher => matcher.kind === "parameter" && !dvorFieldProof(matcher.fieldId).length));
    const uncertain = !complete || nativeProofUnavailable || unknownOrder || unknownMatcher || prerequisites.some(step => step.status === "unverified");
    const resultEvidenceIds = [...new Set(step.alternatives.flat().flatMap(matcher => matcher.kind === "parameter"
      && isScalar(readPath(initial, matcher.fieldId)) && equalValue(readPath(running, matcher.fieldId), matcher.value, matcher.tolerance)
      ? [`state:${matcher.fieldId}`] : []))];
    const result: AssessedStep = { id: step.id, label: step.label, status: path ? "correct" : uncertain ? "unverified" : attempted.length ? "incorrect" : "missing",
      evidenceIds: path ? [...new Set(path.flat())] : attempted.map(action => action.id), citationIds: [...step.citationIds],
      ...(resultEvidenceIds.length ? { resultEvidenceIds } : {}) };
    visiting.delete(id);
    if (path) for (const evidenceId of path.flat()) if (evidenceId.startsWith("terminal:")) consumedTerminal.add(evidenceId);
    assessed.set(id, result);
    return result;
  };
  const steps = rubric.steps.map(step => assess(step.id));
  const redundantActions: RedundantAction[] = [];
  const seen: typeof actions = [];
  for (const action of actions) {
    if (action.kind === "view") continue;
    const relevant = rubric.steps.some(step => step.alternatives.flat().some(matcher => matcher.kind === "action" && matcher.controlId === action.controlId));
    const repeated = seen.some(previous => previous.controlId === action.controlId && equalJson(previous.input, action.input)
      && equalJson(previous.parameterChanges, action.parameterChanges) && equalJson(previous.before, action.before) && equalJson(previous.after, action.after));
    if (!action.accepted || (relevant && repeated)) redundantActions.push({ controlId: action.controlId ?? "", label: action.label,
      evidenceIds: [action.id], reason: action.accepted ? "repeated" : "rejected" });
    if (action.accepted) seen.push(action);
  }
  return {
    rubricVersion: rubric.version,
    correct: steps.filter((step, index) => rubric.steps[index].required && step.status === "correct").length,
    totalRequiredSteps: rubric.steps.filter(step => step.required).length,
    steps, unrelatedParameterChanges, redundantActions,
    notice: "Đối chiếu bằng chứng quy trình độc lập với trạng thái kỹ thuật; thiếu hoặc cắt nhật ký không chứng minh chưa thực hiện. Thao tác lặp chỉ là lưu ý, không tự kết luận nguy hiểm hoặc trừ điểm. Không tự động thay đổi điểm thi.",
  };
}
