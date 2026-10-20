import { DVOR1150_BUILT_IN_SCENARIOS, previewDvor1150Scenario } from "@/lib/dvor1150/scenario";
import { DVOR1150A_BUILT_IN_SCENARIOS, previewDvor1150aScenario } from "@/lib/dvor1150a/scenario";
import { DME1119A_BUILT_IN_SCENARIOS, previewDme1119aScenario } from "@/lib/dme1119a/scenario";
import { DVOR220_BUILT_IN_SCENARIOS, previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import { DME320_BUILT_IN_SCENARIOS } from "@/modules/operations/dme-320/domain/scenario";
import { previewDme320Scenario } from "@/modules/operations/dme-320/domain/engine";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { TerminalEngine } from "@/lib/terminal-engine";
import { parseScenarioParameters, type ScenarioParametersDefinition, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { AiScenarioError, type ScenarioCapability } from "./types";

type Template = { id: string; label: string; create: () => unknown };
const templates: Record<ScenarioParametersModuleId, readonly Template[]> = {
  "dvor-1150": DVOR1150_BUILT_IN_SCENARIOS,
  "dvor-1150a": DVOR1150A_BUILT_IN_SCENARIOS,
  "dme-1119a": DME1119A_BUILT_IN_SCENARIOS,
  "dvor-220": DVOR220_BUILT_IN_SCENARIOS,
  "dme-320": DME320_BUILT_IN_SCENARIOS,
  // Other ADS-B built-ins are inspections/configuration exercises, not fault stimuli.
  "ads-b": DEFAULT_SCENARIOS.filter((item) => ["seed-sa-enable-cat21", "seed-ma-restore-gps"].includes(item.id))
    .map((item) => ({ id: item.id, label: item.title, create: () => structuredClone(item) })),
};
export function createTemplateDefinition(moduleId: ScenarioParametersModuleId, templateId: string): ScenarioParametersDefinition {
  const template = templates[moduleId]?.find((item) => item.id !== "default" && item.id === templateId);
  if (!template) throw new AiScenarioError("UNSUPPORTED_TEMPLATE", "The requested fault template is not supported by this simulator.");
  const parsed = parseScenarioParameters(moduleId, template.create());
  if (!parsed) throw new AiScenarioError("INVALID_TEMPLATE", "The native fault template failed schema validation.");
  return structuredClone(parsed);
}
export function getScenarioCapabilities(moduleId: ScenarioParametersModuleId): ScenarioCapability[] {
  if (!templates[moduleId]) throw new AiScenarioError("INVALID_MODULE", "Unsupported simulator module.");
  return templates[moduleId].filter((item) => item.id !== "default").map((item) => ({
    templateId: item.id, label: item.label, description: createTemplateDefinition(moduleId, item.id).description,
  }));
}
/** Execute only existing detached simulator engines, never model-supplied code. */
export function previewNativeDefinition(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition): void {
  switch (moduleId) {
    case "dvor-1150": previewDvor1150Scenario(parseScenarioParameters(moduleId, definition)!); break;
    case "dvor-1150a": previewDvor1150aScenario(parseScenarioParameters(moduleId, definition)!); break;
    case "dme-1119a": previewDme1119aScenario(parseScenarioParameters(moduleId, definition)!); break;
    case "dvor-220": previewDvor220Scenario(parseScenarioParameters(moduleId, definition)!); break;
    case "dme-320": previewDme320Scenario(parseScenarioParameters(moduleId, definition)!); break;
    case "ads-b": {
      const parsed = parseScenarioParameters(moduleId, definition)!;
      const sensor = parsed.sites.flatMap((site) => [site.sensorA, site.sensorB]).find((item) => item?.id === parsed.targetSensorId)!;
      const engine = new TerminalEngine({ targetLoginUser: parsed.targetLoginUser, sensorDataProfile: sensor.dataProfile });
      for (const action of parsed.expectedActions) {
        if (!engine.processInput(action.input).accepted) throw new AiScenarioError("INVALID_TEMPLATE", "Native ADS-B action preview failed.");
      }
    }
  }
}
