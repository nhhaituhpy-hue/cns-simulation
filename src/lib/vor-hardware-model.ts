import type {
  EquipmentComponent,
  EquipmentDiagram,
  EquipmentLink,
  EquipmentPoint,
} from "./equipment-diagram-types";

type LinkOptions = Pick<EquipmentLink, "label" | "labelPosition" | "route" | "direction">;

function component(
  diagramId: string,
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
    id: `vor-${id}`,
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
    id: `vor-${id}`,
    fromComponentId: `vor-${from}`,
    toComponentId: `vor-${to}`,
    kind,
    ...options,
  };
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
  link("ant-mon1", "field-monitor-antenna", "monitor-1", "rf"),
  link("ant-mon2", "field-monitor-antenna", "monitor-2", "rf"),
  link("mon1-rms", "monitor-1", "rms", "monitor", { label: "Current data" }),
  link("mon2-rms", "monitor-2", "rms", "monitor", { label: "Current data" }),
  link("mon1-lcu", "monitor-1", "lcu", "monitor", { label: "Alarm" }),
  link("mon2-lcu", "monitor-2", "lcu", "monitor", { label: "Alarm" }),
  link("pmdt-rms", "pmdt", "rms", "data", { direction: "bidirectional" }),
  link("rms-lcu", "rms", "lcu", "control", { direction: "bidirectional" }),
  link("rms-if", "rms", "interface-card", "control"),
  link("if-rcsu", "interface-card", "rcsu", "control", { direction: "bidirectional" }),
  link("bcps1-lv", "bcps-1", "lvps", "power"),
  link("bcps2-lv", "bcps-2", "lvps", "power"),
];

const txId = "vor-transmitter-rf";
const txComponents = [
  component(txId, "carrier-antenna", "CARRIER ANT", "Carrier Antenna", "Antenna", 50, 3, "Phát thành phần CSB/carrier của tín hiệu DVOR.", { width: 10, height: 5 }),
  component(txId, "commutator", "COMM CTRL", "Commutator Controller CCA", "Antenna Switching", 70, 8, "Nhận tín hiệu chuyển mạch từ Audio Generator và điều khiển PIN diode của các commutator bank.", { width: 12, height: 6 }),
  component(txId, "rf-monitor", "RF MON", "RF Monitor", "Monitoring", 32, 69, "Nhận các mẫu RF carrier/sideband để đo công suất phát, công suất phản hồi và tính VSWR.", { width: 11, height: 7 }),
  component(txId, "directional-coupler-30db", "30 dB", "Carrier Directional Coupler 30 dB", "RF Sampling", 50, 69, "Lấy mẫu công suất thuận và phản xạ của tuyến carrier cho RF Monitor.", { width: 8, height: 5 }),
  component(txId, "carrier-switch", "RF SW C", "Carrier RF Switch", "RF Switching", 50, 80, "Chọn Carrier Amplifier TX1 hoặc TX2 đưa lên Carrier Antenna.", { width: 8, height: 6 }),
  component(txId, "rms-serial", "RMS SERIAL", "RMS Serial Data Interface", "Data Interface", 50, 96, "Nhận dữ liệu nối tiếp từ hai Audio Generator để RMS giám sát transmitter.", { width: 11, height: 5 }),
  component(txId, "sideband-antennas", "48 SBO ANT", "Sideband Antenna Array", "Antenna", 94, 46, "Nhận bốn tín hiệu sideband qua 48 cáp để tạo trường quay DVOR.", { width: 10, height: 9 }),

  component(txId, "antenna-bank-1", "BANK 1", "Commutator Antenna Bank 1", "Antenna Switching", 68, 62, "Phân phối Sideband 1 tới đúng nhóm anten theo thời điểm chuyển mạch.", { width: 8, height: 5 }),
  component(txId, "antenna-bank-2", "BANK 2", "Commutator Antenna Bank 2", "Antenna Switching", 68, 50, "Phân phối Sideband 2 tới đúng nhóm anten theo thời điểm chuyển mạch.", { width: 8, height: 5 }),
  component(txId, "antenna-bank-3", "BANK 3", "Commutator Antenna Bank 3", "Antenna Switching", 68, 38, "Phân phối Sideband 3 tới đúng nhóm anten theo thời điểm chuyển mạch.", { width: 8, height: 5 }),
  component(txId, "antenna-bank-4", "BANK 4", "Commutator Antenna Bank 4", "Antenna Switching", 68, 26, "Phân phối Sideband 4 tới đúng nhóm anten theo thời điểm chuyển mạch.", { width: 8, height: 5 }),
  component(txId, "sideband-switch-1", "RF SW SB1", "Sideband 1 RF Switch", "RF Switching", 50, 62, "Chọn Sideband 1 từ transmitter đang hoạt động.", { width: 8, height: 5 }),
  component(txId, "sideband-switch-2", "RF SW SB2", "Sideband 2 RF Switch", "RF Switching", 50, 50, "Chọn Sideband 2 từ transmitter đang hoạt động.", { width: 8, height: 5 }),
  component(txId, "sideband-switch-3", "RF SW SB3", "Sideband 3 RF Switch", "RF Switching", 50, 38, "Chọn Sideband 3 từ transmitter đang hoạt động.", { width: 8, height: 5 }),
  component(txId, "sideband-switch-4", "RF SW SB4", "Sideband 4 RF Switch", "RF Switching", 50, 26, "Chọn Sideband 4 từ transmitter đang hoạt động.", { width: 8, height: 5 }),

  component(txId, "audio-1", "AUDIO 1", "Audio Generator TX1", "TX1", 9, 91, "Tạo 30 Hz, 1020 Hz, voice, SIN/COS và Biphase; đồng thời phát tín hiệu chuyển mạch commutator.", { width: 11, height: 6 }),
  component(txId, "synth-1", "SYNTH 1", "Synthesizer TX1", "TX1", 9, 80, "Tạo carrier RF, LSB tại tần số đài −9960 Hz và USB tại tần số đài +9960 Hz.", { width: 10, height: 6 }),
  component(txId, "carrier-amp-1", "CARRIER AMP 1", "Carrier Amplifier TX1", "TX1", 27, 80, "Khuếch đại tín hiệu CSB/carrier của transmitter 1.", { width: 11, height: 6 }),
  component(txId, "tx1-sideband-1", "SB1 · LSB", "Sideband Generator 1 TX1", "TX1", 27, 62, "Điều chế LSB bằng tín hiệu SIN đã chỉnh lưu và SIN Biphase.", { width: 11, height: 5 }),
  component(txId, "tx1-sideband-2", "SB2 · LSB", "Sideband Generator 2 TX1", "TX1", 27, 50, "Điều chế LSB bằng tín hiệu COS đã chỉnh lưu và COS Biphase.", { width: 11, height: 5 }),
  component(txId, "tx1-sideband-3", "SB3 · USB", "Sideband Generator 3 TX1", "TX1", 27, 38, "Điều chế USB bằng tín hiệu SIN đã chỉnh lưu và SIN Biphase.", { width: 11, height: 5 }),
  component(txId, "tx1-sideband-4", "SB4 · USB", "Sideband Generator 4 TX1", "TX1", 27, 26, "Điều chế USB bằng tín hiệu COS đã chỉnh lưu và COS Biphase.", { width: 11, height: 5 }),

  component(txId, "audio-2", "AUDIO 2", "Audio Generator TX2", "TX2", 91, 91, "Tạo các tín hiệu âm tần, Biphase và chuyển mạch cho transmitter dự phòng.", { width: 11, height: 6 }),
  component(txId, "synth-2", "SYNTH 2", "Synthesizer TX2", "TX2", 91, 80, "Tạo carrier RF cùng các tín hiệu LSB/USB cho transmitter 2.", { width: 10, height: 6 }),
  component(txId, "carrier-amp-2", "CARRIER AMP 2", "Carrier Amplifier TX2", "TX2", 73, 80, "Khuếch đại tín hiệu CSB/carrier của transmitter 2.", { width: 11, height: 6 }),
  component(txId, "tx2-sideband-1", "SB1 · LSB", "Sideband Generator 1 TX2", "TX2", 84, 62, "Nhánh Sideband 1 dự phòng sử dụng LSB.", { width: 11, height: 5 }),
  component(txId, "tx2-sideband-2", "SB2 · LSB", "Sideband Generator 2 TX2", "TX2", 84, 50, "Nhánh Sideband 2 dự phòng sử dụng LSB.", { width: 11, height: 5 }),
  component(txId, "tx2-sideband-3", "SB3 · USB", "Sideband Generator 3 TX2", "TX2", 84, 38, "Nhánh Sideband 3 dự phòng sử dụng USB.", { width: 11, height: 5 }),
  component(txId, "tx2-sideband-4", "SB4 · USB", "Sideband Generator 4 TX2", "TX2", 84, 26, "Nhánh Sideband 4 dự phòng sử dụng USB.", { width: 11, height: 5 }),
];

const txLinks: EquipmentLink[] = [
  link("tx1-synth-carrier", "synth-1", "carrier-amp-1", "rf", { label: "CW / CSB", route: [point(14, 80), point(21, 80)] }),
  link("tx1-carrier-switch", "carrier-amp-1", "carrier-switch", "rf", { route: [point(32.5, 80), point(46, 80)] }),
  link("tx2-synth-carrier", "synth-2", "carrier-amp-2", "rf", { label: "CW / CSB", route: [point(86, 80), point(78.5, 80)] }),
  link("tx2-carrier-switch", "carrier-amp-2", "carrier-switch", "rf", { route: [point(67.5, 80), point(54, 80)] }),
  link("carrier-switch-coupler", "carrier-switch", "directional-coupler-30db", "rf", { label: "Carrier RF", route: [point(50, 77), point(50, 71.5)] }),
  link("coupler-carrier-antenna", "directional-coupler-30db", "carrier-antenna", "rf", { label: "CSB", labelPosition: point(52, 15), route: [point(50, 66.5), point(50, 5.5)] }),
  link("coupler-forward-monitor", "directional-coupler-30db", "rf-monitor", "monitor", { label: "Forward −30 dB", route: [point(46, 68), point(40, 68), point(40, 67), point(37.5, 67)] }),
  link("coupler-reflected-monitor", "directional-coupler-30db", "rf-monitor", "monitor", { label: "Reflected −30 dB", route: [point(46, 70), point(39, 70), point(39, 71), point(37.5, 71)] }),

  link("tx1-synth-sb1", "synth-1", "tx1-sideband-1", "rf", { label: "LSB −9960 Hz", labelPosition: point(17, 65), route: [point(9, 77), point(15, 77), point(15, 62), point(21.5, 62)] }),
  link("tx1-synth-sb2", "synth-1", "tx1-sideband-2", "rf", { route: [point(9, 77), point(15, 77), point(15, 50), point(21.5, 50)] }),
  link("tx1-synth-sb3", "synth-1", "tx1-sideband-3", "rf", { label: "USB +9960 Hz", labelPosition: point(17, 41), route: [point(9, 77), point(15, 77), point(15, 38), point(21.5, 38)] }),
  link("tx1-synth-sb4", "synth-1", "tx1-sideband-4", "rf", { route: [point(9, 77), point(15, 77), point(15, 26), point(21.5, 26)] }),
  link("tx2-synth-sb1", "synth-2", "tx2-sideband-1", "rf", { route: [point(91, 77), point(94, 77), point(94, 66), point(89.5, 66), point(89.5, 62)] }),
  link("tx2-synth-sb2", "synth-2", "tx2-sideband-2", "rf", { route: [point(91, 77), point(95, 77), point(95, 54), point(89.5, 54), point(89.5, 50)] }),
  link("tx2-synth-sb3", "synth-2", "tx2-sideband-3", "rf", { route: [point(91, 77), point(96, 77), point(96, 42), point(89.5, 42), point(89.5, 38)] }),
  link("tx2-synth-sb4", "synth-2", "tx2-sideband-4", "rf", { route: [point(91, 77), point(97, 77), point(97, 30), point(89.5, 30), point(89.5, 26)] }),

  link("tx1-audio-sb1", "audio-1", "tx1-sideband-1", "modulation", { label: "SIN + Biphase", labelPosition: point(5, 63), route: [point(6, 88), point(4, 88), point(4, 62), point(21.5, 62)] }),
  link("tx1-audio-sb2", "audio-1", "tx1-sideband-2", "modulation", { label: "COS + Biphase", labelPosition: point(6, 51), route: [point(7, 88), point(5, 88), point(5, 50), point(21.5, 50)] }),
  link("tx1-audio-sb3", "audio-1", "tx1-sideband-3", "modulation", { route: [point(8, 88), point(6, 88), point(6, 38), point(21.5, 38)] }),
  link("tx1-audio-sb4", "audio-1", "tx1-sideband-4", "modulation", { route: [point(9, 88), point(7, 88), point(7, 26), point(21.5, 26)] }),
  link("tx2-audio-sb1", "audio-2", "tx2-sideband-1", "modulation", { route: [point(94, 88), point(98, 88), point(98, 62), point(89.5, 62)] }),
  link("tx2-audio-sb2", "audio-2", "tx2-sideband-2", "modulation", { route: [point(93, 88), point(97, 88), point(97, 50), point(89.5, 50)] }),
  link("tx2-audio-sb3", "audio-2", "tx2-sideband-3", "modulation", { route: [point(92, 88), point(96, 88), point(96, 38), point(89.5, 38)] }),
  link("tx2-audio-sb4", "audio-2", "tx2-sideband-4", "modulation", { route: [point(91, 88), point(95, 88), point(95, 26), point(89.5, 26)] }),

  ...([1, 2, 3, 4] as const).flatMap((band) => {
    const y = 74 - band * 12;
    return [
      link(`tx1-sb${band}-switch`, `tx1-sideband-${band}`, `sideband-switch-${band}`, "rf", { route: [point(32.5, y), point(46, y)] }),
      link(`tx2-sb${band}-switch`, `tx2-sideband-${band}`, `sideband-switch-${band}`, "rf", { route: [point(78.5, y), point(78.5, y + 4), point(55, y + 4), point(55, y), point(54, y)] }),
      link(`switch${band}-bank${band}`, `sideband-switch-${band}`, `antenna-bank-${band}`, "rf", { label: `SB${band}`, route: [point(54, y), point(64, y)] }),
      link(`bank${band}-array`, `antenna-bank-${band}`, "sideband-antennas", "rf", { route: [point(72, y), point(89, y)] }),
      link(`switch${band}-monitor`, `sideband-switch-${band}`, "rf-monitor", "monitor", { label: `SB${band} sample`, labelPosition: point(41, y - 1), route: [point(46, y), point(41, y), point(41, 65 + band), point(37.5, 65 + band)] }),
      link(`comm-bank${band}`, "commutator", `antenna-bank-${band}`, "control", { route: [point(70, 11), point(74 + band, 11), point(74 + band, y), point(72, y)] }),
    ];
  }),

  link("audio1-commutator", "audio-1", "commutator", "control", { label: "RS422 switching", labelPosition: point(48, 13), route: [point(9, 94), point(2, 94), point(2, 13), point(64, 13), point(64, 8)] }),
  link("audio2-commutator", "audio-2", "commutator", "control", { route: [point(91, 94), point(98, 94), point(98, 10), point(76, 10), point(76, 8)] }),
  link("audio1-synth1", "audio-1", "synth-1", "modulation", { label: "30 Hz / voice / ident", labelPosition: point(13, 86), route: [point(11, 88), point(11, 83)] }),
  link("audio2-synth2", "audio-2", "synth-2", "modulation", { route: [point(89, 88), point(89, 83)] }),
  link("audio1-rms", "audio-1", "rms-serial", "data", { label: "Serial data", labelPosition: point(29, 95), route: [point(14.5, 93), point(44.5, 93), point(44.5, 96)] }),
  link("audio2-rms", "audio-2", "rms-serial", "data", { route: [point(85.5, 93), point(55.5, 93), point(55.5, 96)] }),
];

export const VOR_EQUIPMENT_DIAGRAMS: EquipmentDiagram[] = [
  {
    id: overviewId,
    title: "System Overview",
    components: overviewComponents,
    links: overviewLinks,
    description: "Điều khiển, giám sát, giao diện bảo dưỡng và các nhánh nguồn chính của hệ thống DVOR 1150A.",
  },
  {
    id: txId,
    title: "Transmitter / RF Path",
    components: txComponents,
    links: txLinks,
    canvas: { widthRem: 64, heightRem: 40 },
    description: "Cấu trúc transmitter kép: carrier/CSB, bốn nhánh sideband LSB/USB, RF switching, commutator banks và các tuyến lấy mẫu RF.",
    groups: [
      { id: "vor-tx1-group", label: "Transmitter 1", bounds: { x: 1, y: 18, width: 34, height: 78 } },
      { id: "vor-tx2-group", label: "Transmitter 2", bounds: { x: 65, y: 18, width: 34, height: 78 } },
      { id: "vor-rf-distribution-group", label: "RF switching / antenna distribution", bounds: { x: 44, y: 18, width: 34, height: 68 } },
    ],
  },
];
