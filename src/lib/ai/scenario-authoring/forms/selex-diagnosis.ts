import type { JsonValue, ValueSchema } from "../types";
import type { SelexModule } from "./selex";
import type { Dvor1150ViewId } from "@/lib/dvor1150/types";
import type { VorViewId } from "@/lib/vor-types";
import type { DmeViewId } from "@/lib/dme-types";
import { DVOR_1150_BLOCKS, resolveDvor1150HardwareOccurrence } from "@/modules/devices/dvor-1150/block-diagram-data";
import { DVOR_BLOCKS, resolveDvorHardwareOccurrence } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { DME_1119A_BLOCKS, resolveDme1119aHardwareOccurrence } from "@/modules/devices/dme-1119a/block-diagram-data";
import { dmeMenuStructure } from "@/lib/dme-menu-structure";
import { vorMenuStructure } from "@/lib/vor-menu-structure";
import { object, select, text, list } from "./selex-schemas";
// Native view unions have no runtime export. Keep these type-checked mirrors;
// disabled/security screens cannot become diagnosis checkpoints.
const views = {
 "dvor-1150": ["home", "rms-status", "rms-maintenance-alerts", "rms-ad-data", "rms-logs-operational-summary", "rms-logs-alarms", "rms-logs-maintenance-alerts", "rms-logs-command-activity", "rms-logs-parameter-change", "rms-config-general", "rms-config-station", "rms-config-ad-limits", "monitor-integrity", "monitor-ground-check", "monitor-certification", "monitor-test-data", "monitor-notch", "monitor-sideband-vswr", "monitor-standby", "monitor-fault-history-data", "monitor-fault-history-system-status", "monitor-alarm-limits", "monitor-offsets", "tx-data-tx1", "tx-data-tx2", "tx-config-nominal", "tx-config-offsets", "diagnostics-power-up", "diagnostics-fault-isolation"] satisfies Dvor1150ViewId[],
 "dvor-1150a": ["home", "rms-status-main", "rms-status-monitor-tx", "rms-status-software", "rms-status-hardware", "rms-logs-operational-summary", "rms-logs-commands", "rms-logs-parameters", "rms-maintenance-alerts", "rms-digital-io", "rms-power-supply", "rms-temperature", "rms-ad-data", "rms-logs-alarms", "rms-logs-maintenance", "rms-config-general", "rms-config-station", "rms-config-power-limits", "rms-config-ad-limits", "monitor-integral", "monitor-status", "monitor-sideband-vswr", "monitor-notch", "monitor-alarm-limits", "monitor-config-general", "monitor-test-results", "monitor-fault-history", "monitor-1-offsets", "monitor-2-offsets", "tx-data-main", "tx-ground-check-1", "tx-ground-check-2", "tx-status-1", "tx-status-2", "tx-config-nominal", "tx-config-offsets", "diagnostics-power-up", "diagnostics-fault-isolation"] satisfies VorViewId[],
 "dme-1119a": ["home", "rms-status-main", "rms-status-monitor-tx", "rms-maintenance-alerts", "rms-power-supply", "rms-ad-data", "rms-digital-io", "rms-logs-alarms", "rms-logs-maintenance", "rms-logs-operational-summary", "rms-logs-command-activity", "rms-logs-parameter-change", "rms-config-general", "rms-config-station", "rms-config-power-limits", "rms-config-ad-limits", "monitor-integral", "monitor-standby", "monitor-config-general", "monitor-alarm-limits", "monitor-special-tests", "monitor-fault-history", "monitor-1-test-alarm-limits", "monitor-1-test-interrogator", "monitor-1-test-transponder", "monitor-1-decoder-results", "monitor-2-test-alarm-limits", "monitor-2-test-interrogator", "monitor-2-test-transponder", "monitor-2-decoder-results", "monitor-1-offsets", "monitor-2-offsets", "monitor-1-data-detail-integral", "monitor-1-data-detail-standby", "monitor-1-data-detail-maintenance", "monitor-1-data-detail-status", "monitor-2-data-detail-integral", "monitor-2-data-detail-standby", "monitor-2-data-detail-maintenance", "monitor-2-data-detail-status", "monitor-1-calibration", "monitor-2-calibration", "tx-data-main", "tx-rtc-data", "tx-config-nominal", "tx-config-offsets", "tx-config-integral-monitor", "tx-config-standby-monitor", "diagnostics-power-up", "diagnostics-fault-isolation"] satisfies DmeViewId[]
};
type MenuNode={enabled?:boolean;commandId?:string;children?:readonly MenuNode[]};
function commands(nodes:readonly MenuNode[]):string[]{return nodes.flatMap(n=>n.enabled===false?[]:[...(n.commandId?[n.commandId]:[]),...commands(n.children??[])]);}
function hardwareSchema(moduleId:SelexModule):ValueSchema {
 const entries: {value:JsonValue;label:string;assemblies:readonly string[]}[]=[];
 if(moduleId==="dvor-1150") for(const b of DVOR_1150_BLOCKS) for(const o of b.diagramOccurrences){const v=resolveDvor1150HardwareOccurrence(b.id,o.id);if(v)entries.push({value:v as unknown as JsonValue,label:`${b.name} / ${o.id}`,assemblies:b.assemblyIds});}
 if(moduleId==="dvor-1150a") for(const b of DVOR_BLOCKS) for(const o of b.diagramHotspots){const v=resolveDvorHardwareOccurrence(b.id,o.id);if(v)entries.push({value:v as unknown as JsonValue,label:`${b.name} / ${o.id}`,assemblies:b.assemblyIds});}
 if(moduleId==="dme-1119a") for(const b of DME_1119A_BLOCKS) for(const o of b.diagramOccurrences){const v=resolveDme1119aHardwareOccurrence(b.id,o.id);if(v)entries.push({value:v as unknown as JsonValue,label:`${b.name} / ${o.id}`,assemblies:b.assemblyIds});}
 const discriminator=moduleId==="dvor-1150a"?"diagramHotspotId":"diagramOccurrenceId";
 return {type:"array",label:"Phần cứng cần thay",help:"Chọn occurrence thật: block và cabinet lấy nguyên từ catalog; không tạo ID phần cứng.",maxItems:50,required:true,discriminator,variants:entries.map(e=>{
  const v=e.value as Record<string,JsonValue>;
  const properties=Object.fromEntries(Object.entries(v).map(([k,value]):[string,ValueSchema]=>[k,Array.isArray(value)?{...list(k,select(k,value as string[])),readOnly:true}:value===null?{...text(k),nullable:true,readOnly:true}:{...select(k,[value as string]),readOnly:true}]));
  if(e.assemblies.length)properties.assemblyId={...select("Assembly",e.assemblies),required:false};
  return {value:v[discriminator] as string,label:e.label,schema:object(e.label,properties),initial:structuredClone(e.value)};
 })};
}
export function diagnosisSchema(moduleId:SelexModule,operable:string[]):ValueSchema {
 const actions=["config-apply","diagnostics-run-full","diagnostics-run-on-air"];
 if(moduleId!=="dvor-1150"){
  actions.push(...commands(moduleId==="dme-1119a"?dmeMenuStructure.flatMap(g=>g.items):vorMenuStructure.flatMap(g=>g.items)));
  for(const tx of ["tx1","tx2"]) for(const mode of [moduleId==="dme-1119a"?"antenna":"main","load","off"]) actions.push(`transmitter-${tx}-${mode}`);
  if(moduleId==="dme-1119a")actions.push("local-on","local-off","integral-monitor-bypass","standby-monitor-bypass","delay-tx1","delay-tx2");
  else actions.push(...operable);
 }
 const schema={...object("Chẩn đoán hai bước",{
  disposition:select("Hướng xử lý",["replace-module","software-adjustment"]),
  diagnosticRun:select("Chạy diagnostics",["full","on-air","not-required"]),
  diagnosticSubsystem:text("Phân hệ"),diagnosticResult:text("Kết luận mong đợi"),faultSummary:text("Tóm tắt lỗi"),
  manualReferences:list("Tham chiếu manual",text("Nguồn/trang")),
  pmdtCheckpoints:list("Màn hình phải kiểm tra",object("Checkpoint",{id:text("ID"),label:text("Nhãn"),viewId:select("Màn hình",views[moduleId])})),
  requiredActionControlIds:list("Thao tác bắt buộc",select("Control ID",[...new Set(actions)].filter(id=>!/password|security|logon|logoff|login|reset-smoke|reset-intrusion/i.test(id)))),
  expectedHardware:hardwareSchema(moduleId),
 }),nullable:true};
 schema.initial={disposition:"software-adjustment",diagnosticRun:"not-required",diagnosticSubsystem:"",diagnosticResult:"",faultSummary:"",manualReferences:[],pmdtCheckpoints:[],requiredActionControlIds:[],expectedHardware:[]};
 return schema;
}
