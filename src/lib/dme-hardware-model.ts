import type { EquipmentComponent, EquipmentDiagram, EquipmentLink } from "./equipment-diagram-types";

const diagramId = "dme-dual-high-power";
function component(id: string, shortName: string, name: string, subsystem: string, x: number, y: number, functionDescription: string): EquipmentComponent {
  return { id: `dme-${id}`, diagramId, shortName, name, subsystem, position: { x, y }, functionDescription };
}
function link(id: string, from: string, to: string, kind: EquipmentLink["kind"], label?: string): EquipmentLink {
  return { id: `dme-${id}`, fromComponentId: `dme-${from}`, toComponentId: `dme-${to}`, kind, ...(label ? { label } : {}) };
}

const components = [
  component("antenna", "ANTENNA", "DME Antenna", "RF", 50, 5, "Phát đáp DME và thu tín hiệu interrogation."),
  component("coupler", "COUPLER", "Directional Coupler / Circulator", "RF", 50, 17, "Tách mẫu công suất và định tuyến đường phát/thu."),
  component("rf-switch", "RF SWITCH", "Transmit RF Switch", "RF", 50, 30, "Chọn nhánh transmitter 1 hoặc 2 đưa lên anten/load."),
  component("load", "LOAD", "Load / Attenuator", "RF", 50, 43, "Tải giả và suy hao phục vụ chuyển mạch/kiểm tra."),
  component("lna", "LNA", "Low-noise Amplifier", "Receiver", 64, 30, "Khuếch đại tín hiệu interrogation thu được."),
  component("lpa-synth-1", "LPA/SYNTH 1", "Low Power Amplifier / Synthesizer TX1", "TX1", 12, 30, "Tạo và khuếch đại mức thấp tín hiệu RF TX1."),
  component("hpa-1", "HPA 1", "High Power Amplifier TX1", "TX1", 29, 30, "Khuếch đại công suất cao cho đường phát TX1."),
  component("lpa-synth-2", "LPA/SYNTH 2", "Low Power Amplifier / Synthesizer TX2", "TX2", 88, 30, "Tạo và khuếch đại mức thấp tín hiệu RF TX2."),
  component("hpa-2", "HPA 2", "High Power Amplifier TX2", "TX2", 71, 30, "Khuếch đại công suất cao cho đường phát TX2."),
  component("monitor-1", "MON/INT 1", "Monitor / Interrogator / Synthesizer 1", "Monitoring", 26, 51, "Giám sát đường phát và tạo tín hiệu test kênh 1."),
  component("monitor-2", "MON/INT 2", "Monitor / Interrogator / Synthesizer 2", "Monitoring", 74, 51, "Giám sát đường phát và tạo tín hiệu test kênh 2."),
  component("rtc-1", "RTC 1", "Receiver / Transmitter Controller 1", "Control", 26, 68, "Xử lý interrogation, timing và điều khiển transmitter 1."),
  component("rtc-2", "RTC 2", "Receiver / Transmitter Controller 2", "Control", 74, 68, "Xử lý interrogation, timing và điều khiển transmitter 2."),
  component("rms", "RMS", "Remote Monitoring System", "Control", 43, 84, "Thu thập trạng thái, log và giao tiếp PMDT."),
  component("lcu", "LCU", "Local Control Unit", "Control", 66, 84, "Điều khiển tại chỗ và chọn transmitter."),
  component("pmdt", "PMDT", "Portable Maintenance Data Terminal", "Maintenance", 19, 84, "Giao diện bảo dưỡng DME."),
  component("bcps", "BCPS 1/2", "Battery Charger Power Supplies", "Power", 84, 84, "Cấp 48 VDC và sạc battery cho hai nhánh."),
  component("interface-card", "IF CARD", "Interface Circuit Card", "Interface", 43, 96, "Giao tiếp RCSU, thiết bị đồng vị trí và Ethernet."),
];
const links = [
  link("ant-coupler", "antenna", "coupler", "rf"), link("coupler-switch", "coupler", "rf-switch", "rf"), link("coupler-lna", "coupler", "lna", "rf"),
  link("lpa1-hpa1", "lpa-synth-1", "hpa-1", "rf"), link("hpa1-switch", "hpa-1", "rf-switch", "rf"), link("lpa2-hpa2", "lpa-synth-2", "hpa-2", "rf"), link("hpa2-switch", "hpa-2", "rf-switch", "rf"),
  link("switch-load", "rf-switch", "load", "rf"), link("hpa1-mon1", "hpa-1", "monitor-1", "monitor"), link("hpa2-mon2", "hpa-2", "monitor-2", "monitor"),
  link("mon1-rtc1", "monitor-1", "rtc-1", "control"), link("mon2-rtc2", "monitor-2", "rtc-2", "control"), link("lna-rtc1", "lna", "rtc-1", "rf"), link("lna-rtc2", "lna", "rtc-2", "rf"),
  link("rtc1-rms", "rtc-1", "rms", "data"), link("rtc2-rms", "rtc-2", "rms", "data"), link("pmdt-rms", "pmdt", "rms", "data"), link("rms-lcu", "rms", "lcu", "control"),
  link("bcps-rms", "bcps", "rms", "power"), link("rms-if", "rms", "interface-card", "data"),
];

export const DME_EQUIPMENT_DIAGRAMS: EquipmentDiagram[] = [
  { id: diagramId, title: "Dual High Power Overview", components, links },
];
