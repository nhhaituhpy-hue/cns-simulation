import type {
  EquipmentComponent,
  EquipmentDiagram,
  EquipmentLink,
  EquipmentPoint,
} from "./equipment-diagram-types";

const diagramId = "dme-dual-high-power";
type LinkOptions = Pick<EquipmentLink, "label" | "labelPosition" | "route" | "direction">;

function component(
  id: string,
  shortName: string,
  name: string,
  subsystem: string,
  x: number,
  y: number,
  functionDescription: string,
  size?: { width: number; height: number },
): EquipmentComponent {
  return {
    id: `dme-${id}`,
    diagramId,
    shortName,
    name,
    subsystem,
    position: { x, y },
    functionDescription,
    ...(size ? { size } : {}),
  };
}

function point(x: number, y: number): EquipmentPoint {
  return { x, y };
}

function link(
  id: string,
  from: string,
  to: string,
  kind: EquipmentLink["kind"],
  options: Partial<LinkOptions> = {},
): EquipmentLink {
  return {
    id: `dme-${id}`,
    fromComponentId: `dme-${from}`,
    toComponentId: `dme-${to}`,
    kind,
    ...options,
  };
}

const components = [
  component("antenna", "ANTENNA", "DME Antenna", "RF", 50, 3, "Thu tín hiệu interrogation từ máy bay và phát tín hiệu reply DME.", { width: 9, height: 5 }),
  component("coupler", "COUPLER 30 dB", "Directional Coupler 30 dB", "RF Sampling", 50, 10, "Lấy mẫu suy hao 30 dB của công suất thuận/phản xạ để hai monitor đo công suất và VSWR.", { width: 10, height: 5 }),
  component("circulator", "CIRCULATOR", "RF Circulator", "RF", 50, 18, "Tách hướng phát và thu giữa antenna, RF switch và low-noise amplifier.", { width: 9, height: 5 }),
  component("rf-switch", "RF SWITCH", "Transmit RF Switch", "RF", 50, 27, "Chọn nhánh high-power transmitter đang đưa ra antenna hoặc chuyển sang load.", { width: 9, height: 6 }),
  component("load", "LOAD / ATTEN", "Load / Attenuator", "RF Test", 50, 37, "Tải giả/suy hao dùng để giám sát transmitter ở chế độ dự phòng nóng.", { width: 9, height: 5 }),
  component("lna", "LNA", "Low-noise Amplifier", "Receiver", 61, 25, "Khuếch đại interrogation thu từ antenna trước khi phân phối tới RTC1 và RTC2.", { width: 8, height: 5 }),

  component("lpa-synth-1", "LPA / SYNTH 1", "Low Power Amplifier / Synthesizer TX1", "TX1", 10, 27, "Tạo tín hiệu reply RF mức thấp theo điều khiển của RTC1.", { width: 11, height: 6 }),
  component("hpa-1", "HPA 1", "High Power Amplifier TX1", "TX1 High Power", 27, 27, "Khuếch đại tín hiệu từ LPA/Synth 1 lên mức công suất cao trước RF switch.", { width: 10, height: 6 }),
  component("lpa-synth-2", "LPA / SYNTH 2", "Low Power Amplifier / Synthesizer TX2", "TX2", 90, 27, "Tạo tín hiệu reply RF mức thấp theo điều khiển của RTC2.", { width: 11, height: 6 }),
  component("hpa-2", "HPA 2", "High Power Amplifier TX2", "TX2 High Power", 73, 27, "Khuếch đại tín hiệu từ LPA/Synth 2 lên mức công suất cao trước RF switch.", { width: 10, height: 6 }),

  component("monitor-1", "MON / INT 1", "Monitor / Interrogator / Synthesizer 1", "Monitoring", 25, 47, "Tạo interrogation thử và liên tục phân tích reply của cả TX1 lẫn TX2.", { width: 13, height: 7 }),
  component("monitor-2", "MON / INT 2", "Monitor / Interrogator / Synthesizer 2", "Monitoring", 75, 47, "Kênh giám sát độc lập thứ hai; giám sát chéo cả hai transmitter.", { width: 13, height: 7 }),
  component("rtc-1", "RTC 1", "Receiver / Transmitter Controller 1", "TX1 Control", 25, 62, "Giải mã interrogation, tạo timing reply và điều khiển LPA/Synth 1.", { width: 12, height: 6 }),
  component("rtc-2", "RTC 2", "Receiver / Transmitter Controller 2", "TX2 Control", 75, 62, "Giải mã interrogation, tạo timing reply và điều khiển LPA/Synth 2.", { width: 12, height: 6 }),

  component("rms", "RMS", "Remote Monitoring System", "Control", 48, 76, "Thu thập trạng thái từ monitor/RTC, lưu log và trao đổi dữ liệu với PMDT/LCU.", { width: 11, height: 6 }),
  component("lcu", "LCU", "Local Control Unit", "Control", 69, 76, "Điều khiển vận hành tại chỗ, chọn transmitter và cung cấp Local Display RS232.", { width: 10, height: 6 }),
  component("pmdt", "PMDT", "Portable Maintenance Data Terminal", "Maintenance", 28, 76, "Giao diện bảo dưỡng dùng để khai thác dữ liệu RMS.", { width: 10, height: 6 }),

  component("tx-power-supply-1", "TX1 PS", "TX1 Power Supply", "Power", 7, 86, "Nguồn đầu vào cho BCPS1 của nhánh transmitter 1.", { width: 9, height: 5 }),
  component("battery-1", "48 V BAT 1", "48 V Battery Bank 1", "Power", 7, 94, "Nguồn 48 V dự phòng cho nhánh TX1.", { width: 9, height: 5 }),
  component("bcps-1", "BCPS 1", "Battery Charger Power Supply 1", "Power", 22, 90, "Sạc battery và cấp 48 VDC cho TX1, Monitor1 và RTC1.", { width: 10, height: 6 }),
  component("tx-power-supply-2", "TX2 PS", "TX2 Power Supply", "Power", 93, 86, "Nguồn đầu vào cho BCPS2 của nhánh transmitter 2.", { width: 9, height: 5 }),
  component("battery-2", "48 V BAT 2", "48 V Battery Bank 2", "Power", 93, 94, "Nguồn 48 V dự phòng cho nhánh TX2.", { width: 9, height: 5 }),
  component("bcps-2", "BCPS 2", "Battery Charger Power Supply 2", "Power", 78, 90, "Sạc battery và cấp 48 VDC cho TX2, Monitor2 và RTC2.", { width: 10, height: 6 }),
  component("interface-card", "IF CARD", "Interface Circuit Card", "Interface", 50, 89, "Giao tiếp hai đường 48 VDC, thiết bị đồng vị trí, RCSU và Ethernet.", { width: 10, height: 6 }),
  component("co-located", "CO-LOCATED", "Co-located ILS / VOR Interface", "Interface", 36, 96, "Trao đổi interlock/trạng thái với hệ thống ILS hoặc VOR đồng vị trí.", { width: 10, height: 5 }),
  component("rcsu", "RCSU", "Remote Control and Status Unit", "Interface", 64, 96, "Kết nối điều khiển và trạng thái từ xa.", { width: 9, height: 5 }),
  component("ethernet", "ETHERNET", "Ethernet Port", "Interface", 50, 98, "Cổng Ethernet của Interface Circuit Card.", { width: 8, height: 4 }),
];

const links: EquipmentLink[] = [
  link("tx1-lpa-hpa", "lpa-synth-1", "hpa-1", "rf", { label: "Low-power RF", route: [point(15.5, 27), point(22, 27)] }),
  link("tx1-hpa-switch", "hpa-1", "rf-switch", "rf", { label: "High-power reply", labelPosition: point(37, 25), route: [point(32, 27), point(45.5, 27)] }),
  link("tx2-lpa-hpa", "lpa-synth-2", "hpa-2", "rf", { label: "Low-power RF", route: [point(84.5, 27), point(78, 27)] }),
  link("tx2-hpa-switch", "hpa-2", "rf-switch", "rf", { label: "High-power reply", labelPosition: point(63, 25), route: [point(68, 27), point(54.5, 27)] }),
  link("switch-circulator", "rf-switch", "circulator", "rf", { label: "TX reply", route: [point(50, 24), point(50, 20.5)] }),
  link("circulator-coupler", "circulator", "coupler", "rf", { direction: "bidirectional", route: [point(50, 15.5), point(50, 12.5)] }),
  link("coupler-antenna", "coupler", "antenna", "rf", { direction: "bidirectional", label: "Antenna RF", route: [point(50, 7.5), point(50, 5.5)] }),
  link("circulator-lna", "circulator", "lna", "rf", { label: "Interrogation RX", labelPosition: point(59, 17), route: [point(54.5, 18), point(61, 18), point(61, 22.5)] }),
  link("switch-load", "rf-switch", "load", "rf", { label: "Standby test", route: [point(50, 30), point(50, 34.5)] }),

  link("lna-rtc1", "lna", "rtc-1", "rf", { label: "Interrogation", labelPosition: point(48, 58), route: [point(61, 27.5), point(61, 56), point(31, 56), point(31, 62)] }),
  link("lna-rtc2", "lna", "rtc-2", "rf", { route: [point(61, 27.5), point(61, 56), point(69, 56), point(69, 62)] }),
  link("rtc1-lpa1", "rtc-1", "lpa-synth-1", "control", { label: "Reply timing / control", labelPosition: point(12, 56), route: [point(19, 62), point(12, 62), point(12, 30)] }),
  link("rtc2-lpa2", "rtc-2", "lpa-synth-2", "control", { route: [point(81, 62), point(88, 62), point(88, 30)] }),

  link("coupler-monitor1", "coupler", "monitor-1", "monitor", { label: "Forward / reflected −30 dB", labelPosition: point(34, 14), route: [point(45, 10), point(38, 10), point(38, 41), point(25, 41), point(25, 43.5)] }),
  link("coupler-monitor2", "coupler", "monitor-2", "monitor", { route: [point(55, 10), point(62, 10), point(62, 41), point(75, 41), point(75, 43.5)] }),
  link("load-monitor1", "load", "monitor-1", "monitor", { label: "Load sample", labelPosition: point(40, 39), route: [point(45.5, 37), point(40, 37), point(40, 45), point(31.5, 45)] }),
  link("load-monitor2", "load", "monitor-2", "monitor", { route: [point(54.5, 37), point(60, 37), point(60, 45), point(68.5, 45)] }),
  link("hpa1-monitor1", "hpa-1", "monitor-1", "monitor", { label: "TX1 sample", route: [point(27, 30), point(27, 43.5)] }),
  link("hpa1-monitor2", "hpa-1", "monitor-2", "monitor", { label: "Cross-monitor TX1", labelPosition: point(50, 42), route: [point(32, 29), point(36, 29), point(36, 42), point(68.5, 42), point(68.5, 45)] }),
  link("hpa2-monitor2", "hpa-2", "monitor-2", "monitor", { label: "TX2 sample", route: [point(73, 30), point(73, 43.5)] }),
  link("hpa2-monitor1", "hpa-2", "monitor-1", "monitor", { label: "Cross-monitor TX2", labelPosition: point(50, 52), route: [point(68, 29), point(64, 29), point(64, 52), point(31.5, 52), point(31.5, 47)] }),
  link("monitor1-rtc1", "monitor-1", "rtc-1", "control", { label: "Test interrogation", route: [point(25, 50.5), point(25, 59)] }),
  link("monitor1-rtc2", "monitor-1", "rtc-2", "control", { route: [point(31.5, 48), point(44, 48), point(44, 58), point(69, 58), point(69, 62)] }),
  link("monitor2-rtc2", "monitor-2", "rtc-2", "control", { route: [point(75, 50.5), point(75, 59)] }),
  link("monitor2-rtc1", "monitor-2", "rtc-1", "control", { route: [point(68.5, 50), point(56, 50), point(56, 60), point(31, 60), point(31, 62)] }),

  link("monitor1-rms", "monitor-1", "rms", "data", { route: [point(25, 50.5), point(25, 70), point(43, 70), point(43, 76)] }),
  link("monitor2-rms", "monitor-2", "rms", "data", { route: [point(75, 50.5), point(75, 68), point(53, 68), point(53, 76)] }),
  link("rtc1-rms", "rtc-1", "rms", "data", { route: [point(31, 62), point(38, 62), point(38, 73), point(43, 73), point(43, 76)] }),
  link("rtc2-rms", "rtc-2", "rms", "data", { route: [point(69, 62), point(62, 62), point(62, 73), point(53, 73), point(53, 76)] }),
  link("pmdt-rms", "pmdt", "rms", "data", { direction: "bidirectional", label: "PMDT", route: [point(33, 76), point(42.5, 76)] }),
  link("rms-lcu", "rms", "lcu", "data", { direction: "bidirectional", route: [point(53.5, 76), point(64, 76)] }),
  link("lcu-rtc1", "lcu", "rtc-1", "control", { route: [point(69, 73), point(69, 67), point(31, 67), point(31, 62)] }),
  link("lcu-rtc2", "lcu", "rtc-2", "control", { route: [point(69, 73), point(75, 73), point(75, 65)] }),

  link("tx1ps-bcps1", "tx-power-supply-1", "bcps-1", "power", { route: [point(11.5, 86), point(17, 86), point(17, 88), point(17, 90)] }),
  link("battery1-bcps1", "battery-1", "bcps-1", "power", { route: [point(11.5, 94), point(17, 94), point(17, 92), point(17, 90)] }),
  link("tx2ps-bcps2", "tx-power-supply-2", "bcps-2", "power", { route: [point(88.5, 86), point(83, 86), point(83, 88), point(83, 90)] }),
  link("battery2-bcps2", "battery-2", "bcps-2", "power", { route: [point(88.5, 94), point(83, 94), point(83, 92), point(83, 90)] }),
  link("bcps1-lpa1", "bcps-1", "lpa-synth-1", "power", { label: "48 VDC TX1", labelPosition: point(3, 70), route: [point(22, 87), point(3, 87), point(3, 27), point(4.5, 27)] }),
  link("bcps1-hpa1", "bcps-1", "hpa-1", "power", { route: [point(22, 87), point(18, 87), point(18, 32), point(27, 32), point(27, 30)] }),
  link("bcps1-monitor1", "bcps-1", "monitor-1", "power", { route: [point(22, 87), point(20, 87), point(20, 50.5)] }),
  link("bcps1-rtc1", "bcps-1", "rtc-1", "power", { route: [point(22, 87), point(24, 87), point(24, 65)] }),
  link("bcps2-lpa2", "bcps-2", "lpa-synth-2", "power", { label: "48 VDC TX2", labelPosition: point(97, 70), route: [point(78, 87), point(97, 87), point(97, 27), point(95.5, 27)] }),
  link("bcps2-hpa2", "bcps-2", "hpa-2", "power", { route: [point(78, 87), point(82, 87), point(82, 32), point(73, 32), point(73, 30)] }),
  link("bcps2-monitor2", "bcps-2", "monitor-2", "power", { route: [point(78, 87), point(80, 87), point(80, 50.5)] }),
  link("bcps2-rtc2", "bcps-2", "rtc-2", "power", { route: [point(78, 87), point(76, 87), point(76, 65)] }),
  link("bcps1-interface", "bcps-1", "interface-card", "power", { label: "48 VDC", route: [point(27, 90), point(45, 90)] }),
  link("bcps2-interface", "bcps-2", "interface-card", "power", { route: [point(73, 90), point(55, 90)] }),
  link("interface-colocated", "interface-card", "co-located", "data", { direction: "bidirectional", route: [point(45, 92), point(41, 92), point(41, 96)] }),
  link("interface-rcsu", "interface-card", "rcsu", "data", { direction: "bidirectional", route: [point(55, 92), point(59, 92), point(59, 96)] }),
  link("interface-ethernet", "interface-card", "ethernet", "data", { label: "Ethernet", route: [point(50, 92), point(50, 96)] }),
];

export const DME_EQUIPMENT_DIAGRAMS: EquipmentDiagram[] = [
  {
    id: diagramId,
    title: "Dual High Power Overview",
    components,
    links,
    canvas: { widthRem: 64, heightRem: 42 },
    description: "Cấu hình Model 1118A/1119A Dual High Power cố định: mỗi nhánh có HPA đặt giữa LPA/Synth và RF Switch; hai monitor giám sát chéo cả hai transmitter.",
    groups: [
      { id: "dme-tx1-group", label: "Transmitter / Monitor 1", bounds: { x: 1, y: 21, width: 35, height: 47 } },
      { id: "dme-common-rf-group", label: "Common RF / antenna", bounds: { x: 42, y: 1, width: 26, height: 42 } },
      { id: "dme-tx2-group", label: "Transmitter / Monitor 2", bounds: { x: 64, y: 21, width: 35, height: 47 } },
      { id: "dme-control-power-group", label: "RMS / LCU / power / interfaces", bounds: { x: 1, y: 69, width: 98, height: 30 } },
    ],
  },
];
