import { createHash } from "node:crypto";
import { createTemplateDefinition } from "@/lib/ai/scenario-generation/capabilities";
import { parameterAdapterFor } from "@/lib/ai/scenario-generation/parameters";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ParameterAssignment } from "@/lib/ai/scenario-generation/parameter-types";
import type { ScenarioBlueprint } from "@/lib/ai/scenario-blueprint/types";

/** Synthetic source text is a TEST FIXTURE, not a manufacturer manual or a live AI result. */
export function nativeBlueprintFixture(moduleId:ScenarioParametersModuleId):ScenarioBlueprint {
 const adapter=parameterAdapterFor(moduleId);
 const mopiens=moduleId==="dvor-220"||moduleId==="dme-320";
 const base=mopiens?authoringAdapterFor(moduleId).createDefault():createTemplateDefinition(moduleId,moduleId==="ads-b"?"adsb-08-configure-sac-sic":moduleId==="dme-1119a"?"tx1-delay-drift":"carrier-9960");
 const fieldId=moduleId==="ads-b"?"targetSensor.dataProfile.asterix.sac":moduleId==="dvor-220"?"configuration.transmitters.tx1.carrierScalePercent":moduleId==="dme-320"?"configuration.transmitters.tx1.outputPowerPercent":moduleId==="dme-1119a"?"configuration.txConfigNominal.rtcParameters.replyDelayOffset":"configuration.transmitters.tx1.nominal.outputPower";
 const initialValue=moduleId==="ads-b"?44:moduleId==="dme-1119a"?0.17:37.4;
 // DVOR1150A's existing training reference is 70 W, not DVOR1150's 125 W.
 // At 125 W both CCAs alarm; old immediate TX2 transfer hid that bad target.
 const targetValue=moduleId==="ads-b"?95:moduleId==="dme-1119a"?-0.6:mopiens?100:moduleId==="dvor-1150a"?70:125;
 const definition=adapter.apply(moduleId,base,[{fieldId,value:initialValue}]);
 definition.name=`Bài tập kiểm chứng ${moduleId}`;definition.description="Test fixture only: inspect and correct the specified native configuration.";
 const recovery:ParameterAssignment[]=[{fieldId,value:targetValue}];
 if(moduleId==="dme-1119a")recovery.push({fieldId:"startPolicy.integralMonitorBypassed",value:false},{fieldId:"startPolicy.standbyMonitorBypassed",value:false});
 else if(moduleId==="dvor-1150"||moduleId==="dvor-1150a")recovery.push({fieldId:"startPolicy.startMonitorBypassed",value:false});
 else if(moduleId==="ads-b")recovery.push({fieldId:"targetSensor.dataProfile.asterix.sic",value:164});
 const verification=adapter.verify(moduleId,definition,recovery);
 const quote=`TEST FIXTURE ONLY for ${moduleId}: inspect and correct the specified configuration before checking the simulated result.`;
 const citation={id:"fixture-reference",documentId:"fixture-document",documentName:`Test fixture ${moduleId}`,sha256:createHash("sha256").update(quote).digest("hex"),segmentLabel:"test section",quote,sourceKind:"uploaded" as const};
 const citations=[citation];
 return {version:1,moduleId,title:definition.name,situation:definition.description,cause:"Test configuration deviation",symptoms:verification.initial.map(c=>c.detail),assumptions:["Synthetic test case, not an approved real-world procedure."],definition,verification,citations,rubric:{version:1,moduleId,steps:[{id:"correct-configuration",label:"Hiệu chỉnh tham số mục tiêu",required:true,prerequisites:[],alternatives:[[{kind:"parameter",fieldId,value:targetValue}]],citationIds:[citation.id]}],parameterRelevance:[{fieldId,label:"Tham số mục tiêu",initialValue,targetValue,reason:"Test target",citationIds:[citation.id]}],citations}};
}
