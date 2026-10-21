import type { JsonValue, ValueSchema } from "../types";
import { getDefaultAdsbConfig } from "@/lib/simulator-config/ads-b";
import { NOI_BAI_TRAINING_MONITORING } from "@/lib/sensor-data-presets";
import { SENSOR_STATUSES } from "@/lib/types";
export const text=(label:string,required=true):ValueSchema=>({type:"text",label,help:`${label}: giá trị cấu hình native; không nhập bí mật.`,required,maxLength:2000});
export const num=(label:string,min?:number,max?:number,step?:number,unit?:string):ValueSchema=>({type:"number",label,help:`${label}: giá trị hữu hạn trong schema native.`,required:true,...(min===undefined?{}:{min}),...(max===undefined?{}:{max}),...(step===undefined?{}:{step}),...(unit?{unit}:{})});
export const bool=(label:string):ValueSchema=>({type:"boolean",label,help:`${label}: cấu hình ban đầu, không phải bằng chứng hồi phục.`,required:true});
export const select=(label:string,values:readonly string[]):ValueSchema=>({type:"select",label,help:`${label}: chọn giá trị native được hỗ trợ.`,required:true,options:values.map(value=>({value,label:value}))});
export const obj=(label:string,properties:Record<string,ValueSchema>):ValueSchema=>({type:"object",label,help:`${label}: các trường cấu trúc native.`,required:true,properties});
export const arr=(label:string,item:ValueSchema,maxItems=200):ValueSchema=>({type:"array",label,help:`${label}: thêm hoặc xóa từng mục có kiểu; không dùng JSON thô.`,required:true,item,maxItems,initial:[]});
const integer=(label:string)=>num(label,0,Number.MAX_SAFE_INTEGER,1);
const byte=(label:string)=>num(label,0,255,1);
const counts=()=>obj("Bộ đếm",{total:integer("Tổng"),passed:integer("Đạt"),failed:integer("Lỗi")});
const client=obj("Surveillance client",{id:integer("ID client"),name:text("Tên client"),ip:text("IPv4 client"),port:num("Port",0,65535,1),protocol:select("Giao thức",["UDP","TCP"]),messageType:text("Message type"),enabled:bool("Bật client"),messagesSent:integer("Messages sent")});
client.initial={id:1,name:"Client",ip:"127.0.0.1",port:20550,protocol:"UDP",messageType:"all",enabled:false,messagesSent:0};
const snmpUser=obj("SNMP user",{name:text("Tên SNMP"),authType:select("Chế độ SNMP",["noAuth","authNoPriv","authPriv"])});snmpUser.initial={name:"public",authType:"noAuth"};
const trap=obj("SNMP trap",{ip:text("IPv4 trap"),port:num("Port",0,65535,1),enabled:bool("Bật trap")});trap.initial={ip:"127.0.0.1",port:162,enabled:false};
const monitor=obj("Site monitor",{enabled:bool("Bật monitor"),ip:text("Mã monitor (native, không nhất thiết là IP)"),port:integer("Mã port monitor native"),name:text("Tên monitor")});
monitor.initial=structuredClone(getDefaultAdsbConfig().sensorDataProfile!.siteMonitors[0]) as unknown as JsonValue;
export const adsbProfileSchema=obj("Sensor data profile",{
 sensorVersion:text("Sensor version"),configVersion:text("Config version"),sensorName:text("Sensor name"),operationMode:{...select("Operation mode",["OPERATIONAL","MAINTENANCE"]),required:false},
 endToEnd:{...obj("End-to-end",{alertPower:byte("Alert power (native)"),failurePower:byte("Failure power (native)"),interrogationPeriodMs:num("Interrogation period",0,Number.MAX_SAFE_INTEGER,1,"ms"),replyDelayNs:num("Reply delay",0,Number.MAX_SAFE_INTEGER,1,"ns")}),required:false},
 network:obj("Mạng",{ip:text("IPv4 sensor"),subnet:text("Subnet"),gateway:text("Gateway"),dhcp:bool("DHCP"),macAddress:text("MAC address"),ntpServer:text("NTP server"),bitRate:text("Bit rate")}),
 receiverStats:obj("Receiver statistics",{shortSquitter:counts(),extendedSquitter:counts(),totalTargetsDetected:integer("Total targets"),currentTargets:integer("Current targets")}),
 clients:arr("Surveillance clients",client),snmpUsers:arr("SNMP users (không có credential)",snmpUser),snmpTraps:arr("SNMP traps",trap),snmpHeartbeatPeriod:integer("SNMP heartbeat period"),snmpAlarmPeriod:integer("SNMP alarm period"),
 gps:obj("GPS configuration",{enabled:bool("GPS enabled"),ntpEnabled:bool("NTP enabled"),ntpServer:text("NTP server"),latitude:text("Latitude"),longitude:text("Longitude"),altitude:text("Altitude"),deviation:text("Deviation",false)}),
 filters:obj("Filters",{altitudeEnabled:bool("Altitude filter enabled"),altitudeMin:num("Altitude min"),altitudeMax:num("Altitude max"),addressFilterEnabled:bool("Address filter enabled"),addressFilter:text("Address filter",false),positionFilterEnabled:bool("Position filter enabled"),positionFilterRadius:num("Position radius",0)}),
 asterix:obj("ASTERIX",{sac:byte("SAC"),sic:byte("SIC"),cat21Version:text("CAT21 version"),cat21Enabled:bool("CAT21 enabled"),nonOpEnabled:bool("Non-OP enabled"),mlatEnabled:bool("MLAT enabled"),rawEnabled:bool("RAW enabled"),dataBlockSize:integer("Data block size"),ttl:integer("TTL")}),
 general:obj("General",{crcCorrection:bool("CRC correction"),groundTargets:bool("Ground targets"),targetOverloadLimit:integer("Target overload limit")}),
 syslog:obj("Syslog",{localDestination:text("Local destination"),remoteEnabled:bool("Remote enabled"),remoteServerIp:text("Remote server IPv4")}),siteMonitors:arr("Site monitors",monitor),
});
adsbProfileSchema.required=false;adsbProfileSchema.nullable=true;adsbProfileSchema.initial=getDefaultAdsbConfig().sensorDataProfile as unknown as JsonValue;
const monitoring=obj("Observations initiales",{lastSnmpResponseAt:text("Last SNMP response"),temperatureC:num("Temperature",undefined,undefined,undefined,"°C"),cpuLoadPercent:num("CPU load",0,100,undefined,"%"),voltages:obj("Voltages",{v3_3:num("3.3 V rail",undefined,undefined,undefined,"V"),v5:num("5 V rail",undefined,undefined,undefined,"V"),v12:num("12 V rail",undefined,undefined,undefined,"V")}),receiverConfidencePercent:num("Receiver confidence",0,100,undefined,"%"),crcErrorCount:integer("CRC errors"),gpsStatus:select("GPS status",["synchronized","unsynchronized","unavailable"])});monitoring.required=false;monitoring.nullable=true;monitoring.initial=structuredClone(NOI_BAI_TRAINING_MONITORING) as unknown as JsonValue;
const sensor=(slot:"A"|"B"):ValueSchema=>({...obj(`Sensor ${slot}`,{id:text("ID cảm biến"),sensorLabel:select("Sensor slot",[slot]),status:select("QCMS status",SENSOR_STATUSES),ipAddress:text("IPv4 kết nối (phải khớp profile)"),name:text("Tên hiển thị"),monitoring,dataProfile:adsbProfileSchema}),nullable:true,initial:{id:`sensor-new-${slot}`,sensorLabel:slot,status:"green",ipAddress:getDefaultAdsbConfig().sensorDataProfile!.network.ip,name:getDefaultAdsbConfig().sensorDataProfile!.sensorName,dataProfile:getDefaultAdsbConfig().sensorDataProfile} as unknown as JsonValue});
const site=obj("Site",{id:text("ID site"),name:text("Tên site"),sensorA:sensor("A"),sensorB:sensor("B")});
site.initial={id:"site-new",name:"Site mới",sensorA:null,sensorB:null};
export const adsbSitesSchema=arr("Site và cảm biến",site,8);
export const adsbEventSchema={...arr("Nhật ký QCMS ban đầu",obj("Event",{timestamp:text("Timestamp"),type:select("Loại",["snmp","qcms","selfmon","error","line"]),message:text("Nội dung",false)}),1000),nullable:true};
adsbEventSchema.item!.initial={timestamp:"",type:"qcms",message:""};
export const adsbRecordedSchema=arr("Native actions",obj("Action",{step:num("Step",1,Number.MAX_SAFE_INTEGER,1),kind:select("Kind",["menu-selection","value-input"]),menuId:text("Menu ID"),menuTitle:text("Menu title"),input:text("Input",false),resultLabel:text("Result label",false),timestamp:num("Timestamp")}),1000);
