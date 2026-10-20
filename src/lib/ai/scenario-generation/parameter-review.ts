/** Public examiner summary, deliberately independent of provider/worker types. */
export type ParameterReviewRow = {
  fieldId: string;
  value: string | number | boolean | null;
  unit?: string;
  label?: string;
};
type ReviewCheck = { id: string; passed: boolean; detail: string };
export type ParameterReview = {
  version: 2;
  initial: ParameterReviewRow[];
  recovery: ParameterReviewRow[];
  verification: {
    mode: "engine-recovery" | "native-diagnosis" | "native-action-replay";
    initial: ReviewCheck[];
    recovered: ReviewCheck[];
    recoveryVerified: boolean;
    notes: string[];
  };
};

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, limit = 200): value is string => typeof value === "string" && value.length < limit;

function readRows(value: unknown): ParameterReviewRow[] | null {
  if (!Array.isArray(value) || value.length > 24) return null;
  const rows: ParameterReviewRow[] = [];
  for (const row of value) {
    if (!record(row) || !text(row.fieldId) || !row.fieldId.trim() ||
      !(row.value === null || typeof row.value === "boolean" || text(row.value) || (typeof row.value === "number" && Number.isFinite(row.value))) ||
      (row.unit !== undefined && !text(row.unit)) || (row.label !== undefined && !text(row.label))) return null;
    rows.push({ fieldId: row.fieldId, value: row.value, ...(row.unit === undefined ? {} : { unit: row.unit }), ...(row.label === undefined ? {} : { label: row.label }) });
  }
  return rows;
}

function readChecks(value: unknown): ReviewCheck[] | null {
  if (!Array.isArray(value) || value.length > 32) return null;
  const checks: ReviewCheck[] = [];
  for (const check of value) {
    if (!record(check) || !text(check.id) || !check.id.trim() || typeof check.passed !== "boolean" || !text(check.detail, 300)) return null;
    checks.push({ id: check.id, passed: check.passed, detail: check.detail });
  }
  return checks;
}

/** Fail closed; never reconstruct missing model settings from a template or prose. */
export function readParameterReview(value: unknown): ParameterReview | null {
  try {
    if (!record(value) || value.version !== 2 || (value.configuredFieldCount !== undefined && (typeof value.configuredFieldCount !== "number" || !Number.isSafeInteger(value.configuredFieldCount) || value.configuredFieldCount < 0))) return null;
    const initial = readRows(value.initial);
    const recovery = readRows(value.recovery);
    const verification = value.verification;
    if (!initial || !recovery || !record(verification)) return null;
    const { mode, recoveryVerified } = verification;
    if ((mode !== "engine-recovery" && mode !== "native-diagnosis" && mode !== "native-action-replay") || typeof recoveryVerified !== "boolean") return null;
    const initialChecks = readChecks(verification.initial);
    const recovered = readChecks(verification.recovered);
    if (!initialChecks || !recovered || !Array.isArray(verification.notes) || verification.notes.length >= 10) return null;
    const notes: string[] = [];
    for (const note of verification.notes) {
      if (!text(note, 300)) return null;
      notes.push(note);
    }
    return { version: 2, initial, recovery,
      verification: { mode, initial: initialChecks, recovered, recoveryVerified, notes } };
  } catch {
    // Even exotic non-JSON callers must not break the progress/history UI.
    return null;
  }
}
