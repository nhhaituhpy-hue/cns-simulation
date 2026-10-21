import { CON_SON_HARDWARE, CON_SON_SIGNAL_PATHS } from "@/lib/hardware-model";
import { SENSOR_STATUSES, type ScenarioHardwareFault } from "@/lib/types";
import type { JsonValue, ValueSchema } from "../types";
import { inferValueSchema, validateFieldValue } from "./helpers";
import { arr, num, obj, select, text } from "./adsb-schema";
const ids=CON_SON_HARDWARE.map(c=>c.id);
const layout:ValueSchema={...arr("Hardware layout",obj("Component",{}),ids.length),discriminator:"id",variants:CON_SON_HARDWARE.map(c=>{
 const schema=inferValueSchema(c as unknown as JsonValue,c.name,"Catalog phần cứng native; chỉ chỉnh trạng thái và vị trí hiển thị, không tạo wiring/spec mới.");
 for(const [key,value]of Object.entries(schema.properties!))if(!["status","position"].includes(key))value.readOnly=true;
 schema.properties!.id={...select("Component ID",[c.id]),readOnly:true};
 schema.properties!.type={...select("Component type",[c.type]),readOnly:true};
 schema.properties!.connectedTo={...arr("Connected to",select("Component ID",ids)),readOnly:true};
 schema.properties!.status=select("Component status",["ok","failed"]);
 schema.properties!.position=obj("Vị trí hiển thị (%)",{x:num("X",0,100),y:num("Y",0,100)});
 return {value:c.id,label:c.name,schema,initial:structuredClone(c) as unknown as JsonValue};
})};
const paths:ValueSchema={...arr("Signal paths",obj("Signal path",{}),CON_SON_SIGNAL_PATHS.length),discriminator:"id",variants:CON_SON_SIGNAL_PATHS.map(p=>{
 const schema=inferValueSchema(p as unknown as JsonValue,p.name,"Đường tín hiệu từ catalog native; không tự tạo wiring.");
 schema.properties!.id=select("Path ID",[p.id]);schema.properties!.componentIds=arr("Component IDs",select("Component ID",ids));
 for(const child of Object.values(schema.properties!))child.readOnly=true;
 return {value:p.id,label:p.name,schema,initial:structuredClone(p) as unknown as JsonValue};
})};
export const adsbHardwareSchema:ValueSchema={...obj("Sự cố phần cứng (None = không có)",{
 faultyComponentIds:arr("Linh kiện lỗi",select("Linh kiện",ids),ids.length),faultType:select("Loại sự cố",["open","short","degraded","disconnected","overheated"]),faultDescription:text("Mô tả sự cố"),hardwareLayout:layout,signalPaths:paths,expectedSensorStatus:select("Trạng thái QCMS dự kiến (nhãn, không phải vật lý)",SENSOR_STATUSES),terminalSymptoms:arr("Triệu chứng terminal",text("Triệu chứng",false)),qcmsSymptoms:arr("Triệu chứng QCMS",text("Triệu chứng",false)),diagnosticSteps:arr("Bước chẩn đoán",text("Bước",false)),
}),nullable:true,initial:{faultyComponentIds:[],faultType:"degraded",faultDescription:"",hardwareLayout:structuredClone(CON_SON_HARDWARE),signalPaths:structuredClone(CON_SON_SIGNAL_PATHS),expectedSensorStatus:"grey",terminalSymptoms:[],qcmsSymptoms:[],diagnosticSteps:[]} as unknown as JsonValue};
function equal(a:unknown,b:unknown):boolean{
 if(a===b)return true;
 if(!a||!b||typeof a!=="object"||typeof b!=="object")return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>;
 return Object.keys(x).length===Object.keys(y).length&&Object.keys(x).every(k=>Object.hasOwn(y,k)&&equal(x[k],y[k]));
}
export function validateAdsbHardware(value:unknown):string[]{
 const errors=validateFieldValue(adsbHardwareSchema,value);if(errors.length||value===null)return errors;
 const fault=value as ScenarioHardwareFault;
 if(!fault.faultyComponentIds.length||new Set(fault.faultyComponentIds).size!==fault.faultyComponentIds.length)errors.push("Chọn ít nhất một linh kiện lỗi duy nhất.");
 if(fault.hardwareLayout.length!==ids.length||new Set(fault.hardwareLayout.map(c=>c.id)).size!==ids.length)errors.push("Hardware layout phải giữ đủ catalog native, không trùng ID.");
 for(const c of fault.hardwareLayout){const native=CON_SON_HARDWARE.find(n=>n.id===c.id);if(!native||!equal({...c,status:native.status,position:native.position},native))errors.push("Hardware layout/spec/wiring không khớp catalog native.");}
 if(fault.signalPaths.length!==CON_SON_SIGNAL_PATHS.length||new Set(fault.signalPaths.map(p=>p.id)).size!==CON_SON_SIGNAL_PATHS.length||fault.signalPaths.some(p=>!equal(p,CON_SON_SIGNAL_PATHS.find(n=>n.id===p.id))))errors.push("Signal paths không khớp catalog native.");
 return errors;
}
