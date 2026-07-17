import type { EquipmentComponent, EquipmentDiagram, EquipmentLink } from "./equipment-diagram-types";

function component(diagramId: string, id: string, shortName: string, name: string, subsystem: string, x: number, y: number, functionDescription: string): EquipmentComponent {
  return { id: `vor-${id}`, diagramId, shortName, name, subsystem, position: { x, y }, functionDescription };
}

function link(id: string, from: string, to: string, kind: EquipmentLink["kind"], label?: string): EquipmentLink {
  return { id: `vor-${id}`, fromComponentId: `vor-${from}`, toComponentId: `vor-${to}`, kind, ...(label ? { label } : {}) };
}

const overviewId = "vor-system-overview";
const overviewComponents = [
  component(overviewId, "field-monitor-antenna", "FIELD ANT", "Field Monitor Antenna", "Monitoring", 50, 7, "Thu tín hiệu trường để hai monitor giám sát chất lượng phát xạ."),
  component(overviewId, "monitor-1", "MON 1", "Monitor 1", "Monitoring", 25, 24, "Đo các tham số VOR và đưa dữ liệu/cảnh báo về RMS và LCU."),
  component(overviewId, "monitor-2", "MON 2", "Monitor 2", "Monitoring", 75, 24, "Kênh monitor dự phòng/độc lập để xác nhận trạng thái hệ thống."),
  component(overviewId, "rms", "RMS", "Remote Monitoring System", "Control", 40, 45, "Thu thập dữ liệu, lưu log và cung cấp giao diện PMDT."),
  component(overviewId, "lcu", "LCU", "Local Control Unit", "Control", 67, 45, "Điều khiển tại chỗ, xử lý alarm indication và lệnh disable."),
  component(overviewId, "pmdt", "PMDT", "Portable Maintenance Data Terminal", "Maintenance", 15, 45, "Giao diện bảo dưỡng và khai thác dữ liệu RMS."),
  component(overviewId, "interface-card", "IF CARD", "Interface Circuit Card", "Interface", 37, 65, "Giao tiếp điều khiển từ xa với RCSU và thiết bị đồng vị trí."),
  component(overviewId, "rcsu", "RCSU", "Remote Control and Status Unit", "Interface", 16, 66, "Kết nối điều khiển/trạng thái từ xa."),
  component(overviewId, "bcps-1", "BCPS 1", "Battery Charger Power Supply 1", "Power", 61, 65, "Nguồn sạc và cấp nguồn cho nhánh thiết bị thứ nhất."),
  component(overviewId, "bcps-2", "BCPS 2", "Battery Charger Power Supply 2", "Power", 61, 84, "Nguồn sạc và cấp nguồn dự phòng."),
  component(overviewId, "lvps", "LV PS", "Low Voltage Power Supplies", "Power", 84, 74, "Tạo các đường nguồn +28, +12, -12 và +5 VDC."),
];
const overviewLinks = [
  link("ant-mon1", "field-monitor-antenna", "monitor-1", "rf"), link("ant-mon2", "field-monitor-antenna", "monitor-2", "rf"),
  link("mon1-rms", "monitor-1", "rms", "monitor", "Current data"), link("mon2-rms", "monitor-2", "rms", "monitor", "Current data"),
  link("mon1-lcu", "monitor-1", "lcu", "monitor", "Alarm"), link("mon2-lcu", "monitor-2", "lcu", "monitor", "Alarm"),
  link("pmdt-rms", "pmdt", "rms", "data"), link("rms-lcu", "rms", "lcu", "control"),
  link("rms-if", "rms", "interface-card", "control"), link("if-rcsu", "interface-card", "rcsu", "control"),
  link("bcps1-lv", "bcps-1", "lvps", "power"), link("bcps2-lv", "bcps-2", "lvps", "power"),
];

const txId = "vor-transmitter-rf";
const txComponents = [
  component(txId, "audio-1", "AUDIO 1", "Audio Generator TX1", "TX1", 12, 82, "Tạo tín hiệu âm tần điều chế cho transmitter 1."),
  component(txId, "synth-1", "SYNTH 1", "Synthesizer TX1", "TX1", 12, 62, "Tạo sóng mang RF chuẩn cho transmitter 1."),
  component(txId, "carrier-amp-1", "CARRIER 1", "Carrier Amplifier TX1", "TX1", 31, 62, "Khuếch đại sóng mang transmitter 1."),
  component(txId, "sideband-amp-1", "SBO 1-4", "Sideband Amplifiers TX1", "TX1", 31, 35, "Khuếch đại các nhánh sideband transmitter 1."),
  component(txId, "audio-2", "AUDIO 2", "Audio Generator TX2", "TX2", 88, 82, "Tạo tín hiệu âm tần điều chế cho transmitter 2."),
  component(txId, "synth-2", "SYNTH 2", "Synthesizer TX2", "TX2", 88, 62, "Tạo sóng mang RF chuẩn cho transmitter 2."),
  component(txId, "carrier-amp-2", "CARRIER 2", "Carrier Amplifier TX2", "TX2", 69, 62, "Khuếch đại sóng mang transmitter 2."),
  component(txId, "sideband-amp-2", "SBO 1-4", "Sideband Amplifiers TX2", "TX2", 69, 35, "Khuếch đại các nhánh sideband transmitter 2."),
  component(txId, "carrier-switch", "RF SW C", "Carrier RF Switch", "RF Switching", 50, 62, "Chọn carrier amplifier đang đưa ra anten."),
  component(txId, "sideband-switch", "RF SW SBO", "Sideband RF Switch Bank", "RF Switching", 50, 35, "Chọn các nhánh sideband từ transmitter hoạt động."),
  component(txId, "rf-monitor", "RF MON", "RF Monitor", "Monitoring", 24, 14, "Lấy mẫu carrier/sideband để monitor tham số RF."),
  component(txId, "commutator", "COMM CTRL", "Commutator Controller", "Antenna", 50, 14, "Điều khiển chuyển mạch các bank anten sideband."),
  component(txId, "sideband-antennas", "SBO BANKS", "Sideband Antenna Banks 1-4", "Antenna", 76, 14, "Phân phối tín hiệu tới 48 anten sideband."),
  component(txId, "carrier-antenna", "CARRIER ANT", "Carrier Antenna", "Antenna", 92, 14, "Phát thành phần carrier của tín hiệu DVOR."),
];
const txLinks = [
  link("a1-s1", "audio-1", "synth-1", "control"), link("s1-c1", "synth-1", "carrier-amp-1", "rf"), link("c1-csw", "carrier-amp-1", "carrier-switch", "rf"),
  link("a1-sbo1", "audio-1", "sideband-amp-1", "control"), link("sbo1-sws", "sideband-amp-1", "sideband-switch", "rf"),
  link("a2-s2", "audio-2", "synth-2", "control"), link("s2-c2", "synth-2", "carrier-amp-2", "rf"), link("c2-csw", "carrier-amp-2", "carrier-switch", "rf"),
  link("a2-sbo2", "audio-2", "sideband-amp-2", "control"), link("sbo2-sws", "sideband-amp-2", "sideband-switch", "rf"),
  link("csw-cant", "carrier-switch", "carrier-antenna", "rf"), link("sws-comm", "sideband-switch", "commutator", "rf"),
  link("comm-banks", "commutator", "sideband-antennas", "control"), link("csw-mon", "carrier-switch", "rf-monitor", "monitor"), link("sws-mon", "sideband-switch", "rf-monitor", "monitor"),
];

export const VOR_EQUIPMENT_DIAGRAMS: EquipmentDiagram[] = [
  { id: overviewId, title: "System Overview", components: overviewComponents, links: overviewLinks },
  { id: txId, title: "Transmitter / RF Path", components: txComponents, links: txLinks },
];
