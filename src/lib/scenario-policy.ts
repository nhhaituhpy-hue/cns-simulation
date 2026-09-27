/**
 * Shared policy primitives for parameter-training scenarios.
 *
 * A scenario's edit policy answers "what may the learner change?". It does
 * not replace simulator security, Local/Bypass prerequisites, read-only field
 * rules, or device-specific command guards.
 */
export type ScenarioEditPolicy =
  | { mode: "open" }
  | { mode: "restricted"; allowedFieldIds: string[] };

/** Classification is part of the module catalog contract, not user input. */
export type ScenarioFieldRole =
  | "student-operable"
  | "instructor-only"
  | "runtime"
  | "security";

export type ScenarioTaskTargetRequirement = "inspect" | "change-applied";

export interface ScenarioTaskTarget {
  fieldId: string;
  requirement: ScenarioTaskTargetRequirement;
}

export interface ScenarioPolicyField {
  id: string;
  readOnly?: boolean;
}

export type ScenarioFieldRoleResolver = (fieldId: string) => ScenarioFieldRole;

function isStudentOperableField(input: {
  fieldId: string;
  field?: ScenarioPolicyField;
  isBlocked: (fieldId: string) => boolean;
  roleOf?: ScenarioFieldRoleResolver;
}): boolean {
  if (!input.field || input.field.readOnly || input.isBlocked(input.fieldId)) return false;
  return (input.roleOf?.(input.fieldId) ?? "student-operable") === "student-operable";
}

export function legacyScenarioEditPolicy(
  policy: ScenarioEditPolicy | undefined,
  legacyFieldIds: readonly string[],
): ScenarioEditPolicy {
  // An explicit policy is authoritative. The legacy whitelist is consulted
  // only for definitions created before editPolicy existed.
  if (policy?.mode === "open") return { mode: "open" };
  if (policy?.mode === "restricted") {
    return {
      mode: "restricted",
      allowedFieldIds: [...policy.allowedFieldIds],
    };
  }
  // Definitions created before editPolicy was introduced remain restricted.
  return {
    mode: "restricted",
    allowedFieldIds: [...legacyFieldIds],
  };
}

export function isScenarioFieldAllowed(input: {
  policy?: ScenarioEditPolicy;
  legacyFieldIds: readonly string[];
  fieldId: string;
  fields: readonly ScenarioPolicyField[];
  isBlocked: (fieldId: string) => boolean;
  roleOf?: ScenarioFieldRoleResolver;
}): boolean {
  const field = input.fields.find((candidate) => candidate.id === input.fieldId);
  if (!isStudentOperableField({ ...input, field })) return false;

  const policy = legacyScenarioEditPolicy(input.policy, input.legacyFieldIds);
  return policy.mode === "open"
    ? true
    : policy.allowedFieldIds.includes(input.fieldId);
}

export function scenarioAllowedFieldIds(input: {
  policy?: ScenarioEditPolicy;
  legacyFieldIds: readonly string[];
  fields: readonly ScenarioPolicyField[];
  isBlocked: (fieldId: string) => boolean;
  roleOf?: ScenarioFieldRoleResolver;
}): string[] {
  const policy = legacyScenarioEditPolicy(input.policy, input.legacyFieldIds);
  if (policy.mode === "open") {
    return input.fields
      .filter((field) => isStudentOperableField({ ...input, field, fieldId: field.id }))
      .map((field) => field.id);
  }
  const known = new Set(input.fields.map((field) => field.id));
  return [...new Set(policy.allowedFieldIds)].filter(
    (fieldId) => {
      const field = input.fields.find((candidate) => candidate.id === fieldId);
      return known.has(fieldId) && isStudentOperableField({ ...input, field, fieldId });
    },
  );
}

export function validateScenarioEditPolicy(input: {
  policy: unknown;
  fields: readonly ScenarioPolicyField[];
  isBlocked: (fieldId: string) => boolean;
  roleOf?: ScenarioFieldRoleResolver;
  label?: string;
}): string[] {
  const label = input.label ?? "Scenario edit policy";
  if (input.policy === undefined) return [];
  if (!input.policy || typeof input.policy !== "object" || Array.isArray(input.policy)) {
    return [`${label} must be an object.`];
  }

  const policy = input.policy as Record<string, unknown>;
  if (policy.mode === "open") {
    return Object.keys(policy).some((key) => key !== "mode")
      ? [`${label} open mode must not contain allowed fields.`]
      : [];
  }
  if (policy.mode !== "restricted" || !Array.isArray(policy.allowedFieldIds)) {
    return [`${label} mode or allowed fields are invalid.`];
  }

  const known = new Set(input.fields.map((field) => field.id));
  const issues: string[] = [];
  if (!policy.allowedFieldIds.every((fieldId) => typeof fieldId === "string")) {
    issues.push(`${label} allowed fields must be strings.`);
  } else {
      for (const fieldId of policy.allowedFieldIds) {
        const field = input.fields.find((candidate) => candidate.id === fieldId);
        if (!known.has(fieldId) || !isStudentOperableField({ ...input, field, fieldId })) {
        issues.push(`${label} field is invalid: ${fieldId}.`);
      }
    }
    if (new Set(policy.allowedFieldIds).size !== policy.allowedFieldIds.length) {
      issues.push(`${label} allowed fields must not contain duplicates.`);
    }
  }
  return issues;
}

export function validateScenarioTaskTargets(input: {
  targets: unknown;
  fields: readonly ScenarioPolicyField[];
  isBlocked: (fieldId: string) => boolean;
  roleOf?: ScenarioFieldRoleResolver;
  label?: string;
}): string[] {
  const label = input.label ?? "Scenario task targets";
  if (input.targets === undefined) return [];
  if (!Array.isArray(input.targets)) return [`${label} must be an array.`];
  const known = new Set(input.fields.map((field) => field.id));
  const issues: string[] = [];
  for (const target of input.targets) {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      issues.push(`${label} contains an invalid target.`);
      continue;
    }
    const candidate = target as Record<string, unknown>;
    if (
      typeof candidate.fieldId !== "string"
      || !known.has(candidate.fieldId)
      || !isStudentOperableField({
        ...input,
        fieldId: candidate.fieldId,
        field: input.fields.find((field) => field.id === candidate.fieldId),
      })
    ) {
      issues.push(`${label} field is invalid: ${String(candidate.fieldId)}.`);
    }
    if (candidate.requirement !== "inspect" && candidate.requirement !== "change-applied") {
      issues.push(`${label} requirement is invalid.`);
    }
  }
  const ids = input.targets.flatMap((target) => (
    target && typeof target === "object" && !Array.isArray(target) && typeof (target as Record<string, unknown>).fieldId === "string"
      ? [(target as Record<string, unknown>).fieldId as string]
      : []
  ));
  if (new Set(ids).size !== ids.length) issues.push(`${label} fields must not contain duplicates.`);
  return issues;
}
