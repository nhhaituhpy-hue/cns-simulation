import type { JsonValue, ValueSchema } from "../types";
import { DME1119A_TEMPERATURE_SENSORS } from "@/lib/dme1119a/scenario";
import { dme1119aConfigurationValuesSchema } from "./dme1119a-criteria";
export const text = (label:string,required=true):ValueSchema=>({type:"text",label,help:`${label}: nhập nội dung của giám khảo, không tự suy ra từ preset.`,required,maxLength:2000});
export const select = (label:string,values:readonly string[]):ValueSchema=>({type:"select",label,help:`Chọn ${label} từ danh mục native của thiết bị.`,required:true,options:values.map(value=>({value,label:value}))});
export const number = (label:string,min:number,max:number,unit?:string):ValueSchema=>({type:"number",label,help:`${label}: đầu vào engine native${unit ? ` (${unit})`:""}.`,required:true,min,max,unit});
export const bool = (label:string):ValueSchema=>({type:"boolean",label,help:`${label}: bật/tắt điều kiện native.`,required:true});
export const object = (label:string,properties:Record<string,ValueSchema>):ValueSchema=>({type:"object",label,help:`${label}: chỉ các trường native được liệt kê.`,properties,required:true});
export const list = (label:string,item:ValueSchema):ValueSchema=>({type:"array",label,help:`${label}: thêm hoặc xóa các mục có kiểu; ID phải duy nhất.`,item,maxItems:100,required:true});
const variant=(kind:string,properties:Record<string,ValueSchema>,initial:Record<string,JsonValue>)=>({value:kind,label:kind,schema:object(kind,{id:text("ID"),kind:select("Loại",[kind]),...properties}),initial:{id:kind,kind,...initial}});
const tx=()=>select("Máy phát",["tx1","tx2"]);
const monitors=["integral","standby"];
const monitorParameters=["Delay","Spacing","Tx Power","ERP","Efficiency","PRF","Tx Frequency","Rx LO Frequency","Rx Frequency","Tx Frequency Error","Rx LO Frequency Error","VSWR","Ident Status","Ident Code"];
const offsets=["Delay Offset","Spacing Offset","Tx Power Scale","Tx Power Offset","Efficiency Offset","PRF Offset","Tx Frequency Offset","Rx Frequency Offset","ERP Offset","Return Loss Offset"];
export function dmeFaultSchema():ValueSchema {
 return {type:"array",label:"Lỗi mô phỏng DME",help:"11 loại lỗi được engine DME thực hiện; để trống là không chèn lỗi.",maxItems:100,discriminator:"kind",variants:[
 variant("tx-power-loss",{transmitter:tx(),lossDb:number("Suy hao",0,60,"dB")},{transmitter:"tx1",lossDb:0}),
 ...["reply-delay-drift","pulse-spacing-drift"].map(kind=>variant(kind,{transmitter:tx(),driftUs:number("Độ lệch",-100,100,"us")},{transmitter:"tx1",driftUs:0})),
 variant("tx-frequency-error",{transmitter:tx(),ppm:number("Sai số tần số",-10000,10000,"ppm")},{transmitter:"tx1",ppm:0}),
 ...["hpa-fault","rtc-comm-fault"].map(kind=>variant(kind,{transmitter:tx(),active:bool("Có lỗi")},{transmitter:"tx1",active:false})),
 variant("antenna-vswr",{transmitter:tx(),ratio:number("VSWR",1,100,":1")},{transmitter:"tx1",ratio:1}),
 variant("monitor-offset",{monitor:{...number("Monitor",1,2),step:1},measurement:select("Đường đo",monitors),parameter:select("Tham số offset",offsets),value:number("Offset",-1000000,1000000,"native parameter unit")},{monitor:1,measurement:"integral",parameter:"Delay Offset",value:0}),
 variant("ident-signal",{state:select("Ident",["normal","missing","continuous"])},{state:"normal"}),
 variant("temperature",{sensor:select("Cảm biến",DME1119A_TEMPERATURE_SENSORS),celsius:number("Nhiệt độ",-80,150,"°C")},{sensor:"Cabinet Temperature",celsius:25}),
 variant("ac-power",{failed:bool("Mất điện AC")},{failed:false}),
 ]};
}
export function dmeCriterionSchema():ValueSchema {
 return {type:"array",label:"Điều kiện đạt DME",help:"Ít nhất một điều kiện native; đây là yêu cầu, không phải bằng chứng hoàn thành.",maxItems:100,discriminator:"kind",variants:[
 variant("monitor-normal",{monitor:select("Monitor",monitors)},{monitor:"integral"}),
 variant("monitor-alarm-clear",{severity:select("Mức alarm",["primary","secondary","both"])},{severity:"both"}),
 variant("active-transmitter",{expected:select("Máy phát mong đợi",["any","tx1","tx2"])},{expected:"any"}),
 variant("active-path-healthy",{},{}),
 variant("parameter-status",{monitor:select("Monitor",monitors),parameter:select("Tham số",monitorParameters),expected:select("Trạng thái",["normal","warning","alarm"])},{monitor:"integral",parameter:"Delay",expected:"normal"}),
 variant("rtc-overload-clear",{transmitter:select("Máy phát",["active","tx1","tx2","both"])},{transmitter:"active"}),
 variant("bypass-cleared",{monitor:select("Monitor",[...monitors,"both"])},{monitor:"both"}),
 variant("ident-normal",{},{}),
 variant("fan-control",{expected:select("Quạt",["Automatic","On","Off"])},{expected:"Automatic"}),
 variant("ac-power-normal",{},{}),
 variant("configuration-values",{targets:dme1119aConfigurationValuesSchema()},{targets:[]}),
 ]};
}
