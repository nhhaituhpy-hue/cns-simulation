import {
  collectChangedConfigFields,
  createParameterChangeLogEntries,
  prependParameterChangeLogEntries,
  type SimulatorParameterChangeLogEntry,
} from "./parameter-change";

type NativeModuleId = "dvor-1150" | "dvor-220" | "dme-320";
type Scalar = string | number | boolean | null;
export interface NativeParameterEvidence {
  version: 1;
  moduleId: NativeModuleId;
  scenarioId: string | null;
  runId: string;
  startedAtMs: number;
  lastSequence: number;
}

export function createNativeParameterEvidence(moduleId: NativeModuleId, scenarioId: string | null, timestampMs: number): NativeParameterEvidence {
  return { version: 1, moduleId, scenarioId, runId: globalThis.crypto.randomUUID(), startedAtMs: timestampMs, lastSequence: 0 };
}

function scalar(value: unknown): value is Scalar {
  return value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))
    || (typeof value === "string" && value.length <= 512);
}
function read(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current !== null && typeof current === "object"
    && Object.hasOwn(current, key) ? (current as Record<string, unknown>)[key] : undefined, value);
}

/** Call only after a native command passes guards, using effective values, not draft input.
 * Scalars are copied by value. Never copy configuration/security objects into evidence.
 * Run scope changes at scenario load/restore; retained UI history stays readable, not reusable proof.
 */
export function recordNativeParameterChanges(options: {
  existing: readonly SimulatorParameterChangeLogEntry[];
  evidence: NativeParameterEvidence;
  before: unknown;
  after: unknown;
  timestampMs: number;
  userName?: string | null;
  controlId: string;
  actionLabel: string;
  phase: "apply" | "command" | "restore";
  fields?: readonly string[];
  /** Differences authored before native derivations. Omit for direct commands. */
  authoredFields?: readonly string[];
}): { logs: SimulatorParameterChangeLogEntry[]; evidence: NativeParameterEvidence } {
  const fields = (options.fields ?? collectChangedConfigFields(options.before, options.after)).filter(field =>
    field.length <= 200 && !/(?:password|secret|token|credential|security|accounts|__proto__|constructor|prototype)/i.test(field)
    && scalar(read(options.before, field)) && scalar(read(options.after, field))
    && !Object.is(read(options.before, field), read(options.after, field)));
  if (!fields.length) return { logs: [...options.existing], evidence: { ...options.evidence } };
  const evidence = { ...options.evidence, lastSequence: options.evidence.lastSequence + 1 };
  const logs = createParameterChangeLogEntries({ changedFields: fields, timestampMs: options.timestampMs,
    userName: options.userName, actionLabel: options.actionLabel, idPrefix: `${evidence.runId}:${evidence.lastSequence}` });
  const records = logs.map((entry, index): SimulatorParameterChangeLogEntry => ({ ...entry,
    ...(index < fields.length ? { id: `${evidence.runId}:${evidence.lastSequence}:${fields[index]}`, nativeFieldId: fields[index], before: read(options.before, fields[index]) as Scalar,
      after: read(options.after, fields[index]) as Scalar,
      origin: options.authoredFields && !options.authoredFields.includes(fields[index]) ? "native-derived" : "student" } : {}),
    phase: options.phase, controlId: options.controlId, sequence: evidence.lastSequence, timestampMs: options.timestampMs,
    evidenceRunId: evidence.runId, moduleId: evidence.moduleId, scenarioId: evidence.scenarioId,
  }));
  return { logs: prependParameterChangeLogEntries(options.existing, records), evidence };
}
