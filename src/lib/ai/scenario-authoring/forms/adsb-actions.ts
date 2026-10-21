import { TerminalEngine, type TerminalEnginePersistentState } from "@/lib/terminal-engine";
import type { AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import type { LoginUser, RecordedAction } from "@/lib/types";
import type { ValueSchema } from "../types";
import { assertSafeJson, validateFieldValue } from "./helpers";

import { adsbMenuHelp } from "./adsb-menu-help";
const menuHelp=adsbMenuHelp();
export interface AdsbActionSegment { loginUser: LoginUser; inputs: string[] }
export const adsbActionSchema: ValueSchema = {
 type: "array", label: "Phiên terminal / chuỗi input", help: menuHelp.help, maxItems: 20,
 item: { type: "object", label: "Phiên", help: "Thứ tự các phiên được replay trên cùng cấu hình máy thu.", required: true, properties: {
  loginUser: {type: "select", label: "Vai trò", help: "Phiên đầu phải khớp vai trò đăng nhập của bài.", required: true, options: [{value:"sysadmin",label:"sysadmin"},{value:"maintenance",label:"maintenance"}]},
  inputs: {type:"array",label:"Input native",help:"Menu chọn số; workflow nhận giá trị theo prompt native. 0 = quay lại, X = đăng xuất.",required:true,maxItems:500,item:{type:"text",label:"Input",help:"Không chỉnh nhãn đáp án; engine tự tạo nhãn.",maxLength:2000,options:menuHelp.options},initial:[]},
 }, initial: {loginUser:"sysadmin",inputs:[]} }, initial: [],
};
export function adsbActionPlan(d: AdsbScenarioDefinition): AdsbActionSegment[] {
 const segments: AdsbActionSegment[] = [];
 for (const a of d.expectedActions) {
  const role = a.menuId.startsWith("sa.") ? "sysadmin" : "maintenance";
  const previous = segments.at(-1);
  if (!previous || previous.inputs.at(-1) === "X") segments.push({loginUser:role,inputs:[]});
  segments.at(-1)!.inputs.push(a.input);
 }
 return segments;
}
export function compileAdsbActions(d: AdsbScenarioDefinition, value: unknown): {actions:RecordedAction[]; state:TerminalEnginePersistentState | null} {
 assertSafeJson(value);
 const errors=validateFieldValue(adsbActionSchema,value);
 if(errors.length) throw new Error(errors.join(" "));
 const plan=value as AdsbActionSegment[];
 const sensor=d.sites.flatMap(s=>[s.sensorA,s.sensorB]).find(s=>s?.id===d.targetSensorId);
 if(!sensor) throw new Error("Cảm biến mục tiêu không tồn tại.");
 let engine:TerminalEngine | undefined;
 const actions:RecordedAction[]=[];
 for(const [index,segment] of plan.entries()) {
  if(!segment.inputs.length || (index===0 && segment.loginUser!==d.targetLoginUser)) throw new Error("Vai trò phiên đầu không khớp hoặc phiên chưa có input.");
  const persistent=engine?.getPersistentState();
  if(engine && !engine.getState().exited) throw new Error("Phải đăng xuất bằng X trước khi đăng nhập phiên tiếp theo.");
  engine=new TerminalEngine({targetLoginUser:segment.loginUser,targetIpAddress:sensor.ipAddress,sensorDataProfile:sensor.dataProfile,sensorMonitoring:sensor.monitoring});
  if(persistent) engine.restorePersistentState(persistent);
  for(const input of segment.inputs) {
   if(engine.getState().pendingSensitive) throw new Error("Không hỗ trợ nhập credential.");
   const result=engine.processInput(input);
   if(!result.accepted || !result.recordableAction || engine.getState().pendingSensitive) throw new Error(`Input native không hợp lệ hoặc được bảo vệ: bước ${actions.length+1}.`);
   actions.push({...result.recordableAction,step:actions.length+1,timestamp:actions.length});
   if(actions.length>1000) throw new Error("Quá nhiều thao tác.");
  }
 }
 if(engine) {
  const pending=engine.getState().pendingInteraction;
  if(pending && pending!=="display") throw new Error("Workflow native chưa hoàn thành.");
  const state=engine.getPersistentState();
  if(state.runtime.pendingNetwork) throw new Error("Cấu hình mạng chưa được xác nhận.");
  const p=state.sensorDataProfile;
  if(p?.endToEnd && p.endToEnd.failurePower>=p.endToEnd.alertPower) throw new Error("Ngưỡng failure phải thấp hơn alert.");
  return {actions,state};
 }
 return {actions,state:null};
}
