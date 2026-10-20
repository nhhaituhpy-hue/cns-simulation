import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioParameterAdapter } from "./parameter-types";
import { selexParameterAdapter } from "./parameter-selex";
import { mopiensParameterAdapter } from "./parameter-mopiens";
import { adsbParameterAdapter } from "./parameter-adsb";

export function parameterAdapterFor(moduleId: ScenarioParametersModuleId): ScenarioParameterAdapter {
  if (moduleId === "ads-b") return adsbParameterAdapter;
  if (moduleId === "dvor-220" || moduleId === "dme-320") return mopiensParameterAdapter;
  return selexParameterAdapter;
}
