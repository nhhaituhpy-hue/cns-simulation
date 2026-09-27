import "server-only";

import type { AuthProfile } from "@/lib/auth/profile";

/**
 * Teacher authoring is deliberately a rollout flag. Admins retain the
 * existing management path; a teacher cannot reach the new authoring APIs or
 * UI until the resource-scope tests have passed in the target environment.
 */
export function isTeacherScenarioAuthoringEnabled(): boolean {
  return process.env.CNS_TEACHER_SCENARIO_AUTHORING === "1";
}

export function canAuthorScenario(profile: AuthProfile): boolean {
  return profile.role === "admin"
    || (profile.role === "teacher" && isTeacherScenarioAuthoringEnabled());
}

export function canManageScenarioResource(input: {
  profile: AuthProfile;
  ownerId: string;
  hasGrant?: boolean;
}): boolean {
  if (input.profile.role === "admin") return true;
  if (input.profile.role !== "teacher" || !isTeacherScenarioAuthoringEnabled()) return false;
  return input.ownerId === input.profile.id || input.hasGrant === true;
}

export function scenarioOwnerPredicate(input: {
  profile: AuthProfile;
  sourceAlias?: string;
  parameterStart?: number;
}): { sql: string; values: unknown[] } {
  const alias = input.sourceAlias ?? "sp";
  const parameter = input.parameterStart ?? 1;
  if (input.profile.role === "admin") return { sql: "true", values: [] };
  return {
    sql: `(${alias}.created_by = $${parameter}
      or exists (
        select 1
        from public.simulator_scenario_parameter_permissions permission
        where permission.scenario_parameters_id = ${alias}.id
          and permission.module_id = ${alias}.module_id
          and permission.grantee_user_id = $${parameter}
          and permission.permission = 'manage'
      ))`,
    values: [input.profile.id],
  };
}
