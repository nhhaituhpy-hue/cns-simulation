import type { ScenarioParametersModuleId } from "./scenario-parameters";

/** Public simulation defaults, NOT web/host/provider credentials.
 * Native authentication and tutoring share these definitions; never accept browser overrides.
 */
export const SELEX_DVOR_TRAINING_ACCOUNTS = Object.freeze([
  Object.freeze({ userId: "GUEST", password: "", securityLevel: 1 as const }),
  Object.freeze({ userId: "SEC3", password: "THREE", securityLevel: 3 as const }),
  Object.freeze({ userId: "SEC4", password: "FOUR", securityLevel: 4 as const }),
]);
export const SELEX_DME_TRAINING_ACCOUNTS = Object.freeze([
  SELEX_DVOR_TRAINING_ACCOUNTS[0],
  Object.freeze({ userId: "SEC2", password: "TWO", securityLevel: 2 as const }),
  ...SELEX_DVOR_TRAINING_ACCOUNTS.slice(1),
]);
export const MOPIENS_ADMIN_TRAINING_ACCOUNT = Object.freeze({ userId: "Administrator", password: "1234", level: 3 as const });
export const MOPIENS_DME_TRAINING_ACCOUNTS = Object.freeze([
  Object.freeze({ userId: "observer", password: "observer", level: 1 as const }),
  Object.freeze({ userId: "operator", password: "operator", level: 2 as const }),
  MOPIENS_ADMIN_TRAINING_ACCOUNT,
]);
export type TrainingLogin = { kind: "fixed-default"; userId: string; password: string; securityLevel: number; mutable: boolean }
 | { kind: "no-fixed-password" } | { kind: "unsupported-account" } | { kind: "wrong-device" };
export function trainingLoginFor(moduleId: ScenarioParametersModuleId, question: string): TrainingLogin {
  // Keep explicit model scope aligned with the native citation spellings.
  const scope = question.toLowerCase().replace(/[_-]+/g, " ");
  const models = [...scope.matchAll(/(?:^|[^a-z0-9])(dvor|dme|selex|model)\s*(?:model\s*)?(1150a|1150|1119a|220|320)(?![a-z0-9])/g)];
  if (models.some(([, family, model]) => model !== moduleId.split("-")[1]
    || family === (moduleId.startsWith("dvor-") ? "dme" : "dvor"))
    || (moduleId !== "ads-b" && /(?:^|[^a-z0-9])ads\s*b(?![a-z0-9])/.test(scope))) return { kind: "wrong-device" };
  // Resolve all finite native role tokens before selecting a default. Never
  // choose the first role from a conflicting request or match part of a token.
  const roles = new Set((question.match(/(?<![\p{L}\p{N}_-])(?:SEC[0-9]+|GUEST|Administrator|observer|operator|sysadmin|maintenance|SA|MA)(?![\p{L}\p{N}_-])/giu) ?? []).map(role => role.toLowerCase()));
  if (roles.size > 1) return { kind: "unsupported-account" };
  const requested = [...roles][0];
  if (moduleId === "ads-b") return !requested || requested === "sysadmin" || requested === "maintenance"
    ? { kind: "no-fixed-password" } : { kind: "unsupported-account" };
  if (moduleId === "dvor-1150" || moduleId === "dvor-1150a" || moduleId === "dme-1119a") {
    const accounts = moduleId === "dme-1119a" ? SELEX_DME_TRAINING_ACCOUNTS : SELEX_DVOR_TRAINING_ACCOUNTS;
    const account = accounts.find(x => x.userId === (requested?.toUpperCase() ?? "SEC3"));
    return account ? { kind: "fixed-default", ...account, mutable: moduleId === "dme-1119a" } : { kind: "unsupported-account" };
  }
  const accounts = moduleId === "dme-320" ? MOPIENS_DME_TRAINING_ACCOUNTS : [MOPIENS_ADMIN_TRAINING_ACCOUNT];
  const account = accounts.find(x => x.userId.toLowerCase() === (requested ?? "Administrator").toLowerCase());
  return account ? { kind: "fixed-default", userId: account.userId, password: account.password, securityLevel: account.level, mutable: true } : { kind: "unsupported-account" };
}
