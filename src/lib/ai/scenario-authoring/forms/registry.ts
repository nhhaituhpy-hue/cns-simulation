import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { NativeAuthoringAdapter } from "../types";
import { AuthoringError } from "../errors";
import { selexAuthoringAdapters } from "./selex";
import { mopiensAuthoringAdapters } from "./mopiens";
import { adsbAuthoringAdapter } from "./adsb";
export function authoringAdapterFor(moduleId:ScenarioParametersModuleId):NativeAuthoringAdapter{
 const adapter=[...selexAuthoringAdapters,...mopiensAuthoringAdapters,adsbAuthoringAdapter].find(a=>a.moduleId===moduleId);
 if(!adapter)throw new AuthoringError("INVALID_MODULE","Thiết bị không hỗ trợ trình hướng dẫn.");return adapter;
}
