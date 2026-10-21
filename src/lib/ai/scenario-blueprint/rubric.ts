import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { BlueprintProposal, CitedAssignment } from "./compiler";
import type { EvidenceMatcher, ManualCitation, ReferenceStep, ScenarioRubric } from "./types";
import type { ScenarioParameterField } from "../scenario-generation/parameter-types";
import { fail, validateScenarioRubric } from "./validation";
import { createHash } from "node:crypto";

export function stableId(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24)}`;
}
function recoveryMatchers(moduleId: ScenarioParametersModuleId, change: CitedAssignment): EvidenceMatcher[] {
  if (change.fieldId.startsWith("configuration.")) {
    const parameter: EvidenceMatcher = { kind: "parameter", fieldId: change.fieldId.slice(14), value: change.value };
    // These engines persist running configuration, not SELEX actionHistory/control IDs.
    return moduleId === "dvor-220" || moduleId === "dme-320" ? [parameter] : [parameter, { kind: "action", controlId: "config-apply" }];
  }
  if (moduleId === "dvor-1150a" && ["startPolicy.startMonitorBypassed", "startPolicy.startLocal"].includes(change.fieldId)) {
    const fieldId = change.fieldId.endsWith("startLocal") ? "simulation.local" : "simulation.integralMonitorBypass";
    return [{ kind: "action", controlId: fieldId, input: { fieldId, value: String(change.value) } }];
  }
  if (moduleId === "dvor-1150" && ["startPolicy.startMonitorBypassed", "startPolicy.startLocal"].includes(change.fieldId)) {
    // Legacy module has no action log for these toggles; snapshot evidence may be unverified as a procedure.
    return [{ kind: "parameter", fieldId: change.fieldId.endsWith("startLocal") ? "simulation.local" : "simulation.integralMonitorBypass", value: change.value }];
  }
  if (moduleId === "dme-1119a") {
    if (["startPolicy.integralMonitorBypassed", "startPolicy.standbyMonitorBypassed"].includes(change.fieldId)) {
      const monitor = change.fieldId.includes("integral") ? "integral" : "standby";
      return [{ kind: "action", controlId: `${monitor}-monitor-bypass`, input: { monitor, enabled: change.value } }];
    }
    if (change.fieldId === "startPolicy.startLocal") return [{ kind: "action", controlId: change.value ? "local-on" : "local-off" }];
  }
  return fail("UNSUPPORTED_REQUEST", "Điều khiển chưa có evidence matcher native; không tự tạo thao tác để chấm bước.");
}
export function compileRubric(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition, proposal: BlueprintProposal, fields: ScenarioParameterField[], citations: ManualCitation[]): ScenarioRubric {
  const citationIds = (indices: number[]) => [...new Set(indices.map(index => citations[index]?.id ?? fail("INVALID_CITATION")))];
  const steps: ReferenceStep[] = [];
  const add = (key: unknown, label: string, matchers: EvidenceMatcher[], refs: string[], prerequisites: string[] = []) => {
    const step: ReferenceStep = { id: stableId("step", [moduleId, key]), label, required: true, prerequisites, alternatives: [matchers], citationIds: refs };
    steps.push(step); return step.id;
  };
  if ("expectedActions" in definition) {
    let previous: string | undefined;
    for (const action of definition.expectedActions) {
      previous = add([action.step, action.menuId, action.input], `${action.menuTitle}: ${action.resultLabel}`, [{ kind: "terminal", menuId: action.menuId, input: action.input }], citationIds(proposal.diagnosisCitationIndexes), previous ? [previous] : []);
    }
  } else {
    if ("diagnosis" in definition && definition.diagnosis) {
      for (const checkpoint of definition.diagnosis.pmdtCheckpoints) add(["view", checkpoint.viewId], checkpoint.label, [{ kind: "view", viewId: checkpoint.viewId }], citationIds(proposal.diagnosisCitationIndexes));
      // Other mandatory diagnosis actions are not proven by parameter replay. Do not fabricate them.
      if (definition.diagnosis.requiredActionControlIds.some(id => id !== "config-apply")) fail("UNSUPPORTED_REQUEST", "Scaffold yêu cầu chẩn đoán ngoài phạm vi replay tham số.");
    }
    const configSteps: string[] = [];
    for (const change of proposal.recovery) {
      if (Object.is(fields.find(f => f.id === change.fieldId)?.value, change.value)) continue;
      const matchers = recoveryMatchers(moduleId, change);
      const releaseBypass = /MonitorBypassed$/.test(change.fieldId) && change.value === false;
      const id = add(matchers, `Thực hiện ${fields.find(f => f.id === change.fieldId)!.label}: ${String(change.value)}`, matchers, citationIds(change.citationIndexes), releaseBypass ? [...configSteps] : []);
      if (change.fieldId.startsWith("configuration.")) configSteps.push(id);
    }
  }
  return validateScenarioRubric({ version: 1, moduleId, citations, steps,
    parameterRelevance: [...new Set([...proposal.initial, ...proposal.recovery].map(change => change.fieldId))].map(fieldId => {
      const field = fields.find(f => f.id === fieldId)!;
      const recovery = proposal.recovery.find(change => change.fieldId === fieldId);
      const source = recovery ?? proposal.initial.find(change => change.fieldId === fieldId)!;
      return { fieldId: fieldId.startsWith("configuration.") ? fieldId.slice(14) : fieldId, label: field.label, initialValue: field.value,
        ...(recovery ? { targetValue: recovery.value } : {}), reason: "Giá trị của bài mô phỏng, không phải thông số được manual xác nhận.", citationIds: citationIds(source.citationIndexes) };
    }),
  }, moduleId);
}
