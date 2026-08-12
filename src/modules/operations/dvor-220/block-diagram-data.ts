export type Dvor220CabinetSurface = "front" | "rear" | "asu";

export type Dvor220BlockId =
  | "lmi"
  | "csp"
  | "tsg"
  | "scu"
  | "emu"
  | "niu"
  | "dcdc-aux"
  | "modem"
  | "vau"
  | "ifb"
  | "rf-divider"
  | "sma-lsb"
  | "cma"
  | "sma-usb"
  | "dcdc-tx"
  | "msg"
  | "syn"
  | "mon"
  | "fan"
  | "pdc"
  | "power-switch-panel"
  | "pmu"
  | "acdc"
  | "battery"
  | "asu"
  | "asu-if"
  | "asu-tm"
  | "asu-sm-cos-lo"
  | "asu-sm-cos-hi"
  | "asu-sm-sin-lo"
  | "asu-sm-sin-hi"
  | "asu-power-monitor"
  | "carrier-antenna"
  | "sideband-antennas"
  | "field-monitor-antennas"
  | "pmdt"
  | "remote-control";

export type Dvor220CabinetKind =
  | "display"
  | "control"
  | "card"
  | "amplifier"
  | "power"
  | "rf"
  | "rear"
  | "asu";

export type Dvor220FaceplateKind =
  | "lmi"
  | "csp"
  | "card"
  | "dcdc-aux"
  | "sma"
  | "cma"
  | "dcdc-tx"
  | "msg"
  | "syn"
  | "mon"
  | "fan"
  | "pdc"
  | "power-switch"
  | "pmu"
  | "acdc"
  | "asu";

export interface Dvor220CabinetHotspot {
  id: string;
  surface: Dvor220CabinetSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  assemblyId: string;
  shortLabel: string;
  kind: Dvor220CabinetKind;
}

export interface Dvor220DiagramOccurrence {
  id: string;
  componentId: string;
  targetCabinetHotspotIds: readonly string[];
}

export interface Dvor220WaveformReference {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  source: string;
}

export interface Dvor220TestPoint {
  id: string;
  label: string;
  description: string;
  waveforms?: readonly Dvor220WaveformReference[];
}

export interface Dvor220BlockDefinition {
  id: Dvor220BlockId;
  shortName: string;
  name: string;
  assemblyIds: readonly string[];
  partNumber?: string;
  description: string;
  manualReference: string;
  cabinetHotspots: readonly Dvor220CabinetHotspot[];
  diagramOccurrences: readonly Dvor220DiagramOccurrence[];
  indicators: readonly string[];
  controls: readonly string[];
  testPoints: readonly Dvor220TestPoint[];
  faceplate?: Dvor220FaceplateKind;
  notes?: readonly string[];
}

const hotspot = (
  id: string,
  surface: Dvor220CabinetSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  assemblyId: string,
  shortLabel: string,
  kind: Dvor220CabinetKind,
): Dvor220CabinetHotspot => ({
  id,
  surface,
  x,
  y,
  width,
  height,
  assemblyId,
  shortLabel,
  kind,
});

const occurrence = (
  componentId: string,
  targetCabinetHotspotIds: readonly string[] = [],
): Dvor220DiagramOccurrence => ({
  id: `occ-${componentId}`,
  componentId,
  targetCabinetHotspotIds,
});

const front = {
  lmi: hotspot("front-lmi", "front", 514, 92, 134, 142, "1A6", "LMI", "display"),
  csp: hotspot("front-csp", "front", 105, 72, 55, 176, "1A1A1", "CSP", "control"),
  tsg: hotspot("front-tsg", "front", 164, 72, 21, 176, "1A1A2", "TSG", "card"),
  scu1: hotspot("front-scu-1", "front", 188, 72, 22, 176, "1A1A3", "SCU 1", "card"),
  scu2: hotspot("front-scu-2", "front", 213, 72, 22, 176, "1A1A4", "SCU 2", "card"),
  emu: hotspot("front-emu", "front", 238, 72, 22, 176, "1A1A5", "EMU", "card"),
  niu1: hotspot("front-niu-1", "front", 263, 72, 22, 176, "1A1A6", "NIU 1", "card"),
  niu2: hotspot("front-niu-2", "front", 288, 72, 22, 176, "1A1A7", "NIU 2", "card"),
  dcdcAux1: hotspot("front-dcdc-aux-1", "front", 313, 72, 22, 176, "1A1A8", "DC/DC-A 1", "power"),
  dcdcAux2: hotspot("front-dcdc-aux-2", "front", 338, 72, 22, 176, "1A1A9", "DC/DC-A 2", "power"),
  modem1: hotspot("front-modem-1", "front", 363, 72, 22, 176, "1A1A10", "MODEM 1", "card"),
  modem2: hotspot("front-modem-2", "front", 388, 72, 22, 176, "1A1A11", "MODEM 2", "card"),
  vau: hotspot("front-vau", "front", 413, 72, 27, 176, "1A1A12", "VAU", "card"),
  tx1Fan: hotspot("front-tx1-fan", "front", 105, 262, 335, 12, "1A2A8", "FAN TX1", "power"),
  tx1SmaLsb: hotspot("front-tx1-sma-lsb", "front", 105, 280, 56, 198, "1A2A1", "LSB SMA", "amplifier"),
  tx1Cma: hotspot("front-tx1-cma", "front", 165, 280, 68, 198, "1A2A2", "CMA", "amplifier"),
  tx1SmaUsb: hotspot("front-tx1-sma-usb", "front", 237, 280, 56, 198, "1A2A3", "USB SMA", "amplifier"),
  tx1Dcdc: hotspot("front-tx1-dcdc", "front", 297, 280, 44, 198, "1A2A4", "DC/DC", "power"),
  tx1Msg: hotspot("front-tx1-msg", "front", 345, 280, 29, 198, "1A2A5", "MSG", "card"),
  tx1Syn: hotspot("front-tx1-syn", "front", 378, 280, 29, 198, "1A2A6", "SYN", "card"),
  tx1Mon: hotspot("front-tx1-mon", "front", 411, 280, 29, 198, "1A2A7", "MON 1", "card"),
  pdc: hotspot("front-pdc", "front", 105, 500, 335, 82, "1A8A1", "PDC", "rf"),
  tx2Fan: hotspot("front-tx2-fan", "front", 105, 592, 335, 12, "1A3A8", "FAN TX2", "power"),
  tx2SmaLsb: hotspot("front-tx2-sma-lsb", "front", 105, 610, 56, 198, "1A3A1", "LSB SMA", "amplifier"),
  tx2Cma: hotspot("front-tx2-cma", "front", 165, 610, 68, 198, "1A3A2", "CMA", "amplifier"),
  tx2SmaUsb: hotspot("front-tx2-sma-usb", "front", 237, 610, 56, 198, "1A3A3", "USB SMA", "amplifier"),
  tx2Dcdc: hotspot("front-tx2-dcdc", "front", 297, 610, 44, 198, "1A3A4", "DC/DC", "power"),
  tx2Msg: hotspot("front-tx2-msg", "front", 345, 610, 29, 198, "1A3A5", "MSG", "card"),
  tx2Syn: hotspot("front-tx2-syn", "front", 378, 610, 29, 198, "1A3A6", "SYN", "card"),
  tx2Mon: hotspot("front-tx2-mon", "front", 411, 610, 29, 198, "1A3A7", "MON 2", "card"),
  powerSwitch: hotspot("front-power-switch", "front", 105, 836, 90, 84, "1A4", "POWER PANEL", "control"),
  pmu1: hotspot("front-pmu-1", "front", 200, 836, 118, 84, "1A4A1", "PMU 1", "power"),
  pmu2: hotspot("front-pmu-2", "front", 322, 836, 118, 84, "1A4A2", "PMU 2", "power"),
  acdc1: hotspot("front-acdc-1", "front", 105, 930, 63, 34, "1A5A1", "AC/DC 1", "power"),
  acdc2: hotspot("front-acdc-2", "front", 172, 930, 63, 34, "1A5A2", "AC/DC 2", "power"),
  acdc3: hotspot("front-acdc-3", "front", 239, 930, 63, 34, "1A5A3", "AC/DC 3", "power"),
  acdc4: hotspot("front-acdc-4", "front", 306, 930, 63, 34, "1A5A4", "AC/DC 4", "power"),
  acdc5: hotspot("front-acdc-5", "front", 373, 930, 67, 34, "1A5A5", "AC/DC 5", "power"),
} as const;

const rear = {
  ifb: hotspot("rear-ifb", "rear", 176, 84, 248, 88, "1A7", "IFB", "rear"),
  divider: hotspot("rear-rf-divider", "rear", 176, 188, 248, 82, "1PD1", "QUINT 3-WAY", "rf"),
} as const;

const asu = {
  shell: hotspot("asu-shell", "asu", 72, 42, 456, 45, "2A1", "ASU", "asu"),
  interface: hotspot("asu-interface", "asu", 108, 112, 142, 116, "2A1A1", "ASU-IF", "asu"),
  toggle: hotspot("asu-toggle", "asu", 282, 112, 142, 116, "2A1A2", "TM", "rf"),
  cosLo: hotspot("asu-sm-cos-lo", "asu", 108, 286, 142, 168, "2A1A3", "SM COS LO", "rf"),
  cosHi: hotspot("asu-sm-cos-hi", "asu", 282, 286, 142, 168, "2A1A4", "SM COS HI", "rf"),
  sinLo: hotspot("asu-sm-sin-lo", "asu", 108, 486, 142, 168, "2A1A5", "SM SIN LO", "rf"),
  sinHi: hotspot("asu-sm-sin-hi", "asu", 282, 486, 142, 168, "2A1A6", "SM SIN HI", "rf"),
  powerMonitor: hotspot("asu-power-monitor", "asu", 108, 730, 316, 142, "2A1A7", "POWER MONITOR", "rf"),
} as const;

const waveforms = {
  smaCos: {
    src: "/equipment/dvor-220/waveforms/figure-7-5-sma-j5-cos-env.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng tại J5 COS ENV của SMA",
    caption: "J5 COS ENV",
    source: "Manual Figure 7-5, PDF page 471",
  },
  smaSin: {
    src: "/equipment/dvor-220/waveforms/figure-7-6-sma-j6-sin-env.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng tại J6 SIN ENV của SMA",
    caption: "J6 SIN ENV",
    source: "Manual Figure 7-6, PDF page 472",
  },
  cmaEnv: {
    src: "/equipment/dvor-220/waveforms/figure-7-8-cma-j2-env.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng thông thường tại J2 ENV của CMA",
    caption: "J2 ENV - trạng thái thông thường",
    source: "Manual Figure 7-8, PDF page 474",
  },
  cmaIdent: {
    src: "/equipment/dvor-220/waveforms/figure-7-9-cma-j2-env-ident.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng tại J2 ENV của CMA khi phát Ident",
    caption: "J2 ENV - Ident key down",
    source: "Manual Figure 7-9, PDF page 475",
  },
  msgCarrier: {
    src: "/equipment/dvor-220/waveforms/figure-7-12-msg-tp49-carrier.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng Carrier tại TP49 của MSG",
    caption: "TP49 Carrier",
    source: "Manual Figure 7-12, PDF page 478",
  },
  msgCarrierIdent: {
    src: "/equipment/dvor-220/waveforms/figure-7-13-msg-tp49-carrier-ident.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng Carrier tại TP49 của MSG khi phát Ident",
    caption: "TP49 Carrier - Ident key down",
    source: "Manual Figure 7-13, PDF page 478",
  },
  msgUsb: {
    src: "/equipment/dvor-220/waveforms/figure-7-14-msg-usb-cos-sin.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng USB COS và USB SIN của MSG",
    caption: "TP61 USB COS / TP63 USB SIN",
    source: "Manual Figure 7-14, PDF page 479",
  },
  msgLsb: {
    src: "/equipment/dvor-220/waveforms/figure-7-15-msg-lsb-cos-sin.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng LSB COS và LSB SIN của MSG",
    caption: "TP62 LSB COS / TP64 LSB SIN",
    source: "Manual Figure 7-15, PDF page 479",
  },
  monAm: {
    src: "/equipment/dvor-220/waveforms/figure-7-18-mon-tp51-am-30hz.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng AM 30 Hz tại TP51 của MON",
    caption: "TP51 AM 30 Hz",
    source: "Manual Figure 7-18, PDF page 483",
  },
  monBaseband: {
    src: "/equipment/dvor-220/waveforms/figure-7-19-mon-tp49-baseband.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng baseband tại TP49 của MON",
    caption: "TP49 Baseband",
    source: "Manual Figure 7-19, PDF page 483",
  },
  monFm: {
    src: "/equipment/dvor-220/waveforms/figure-7-20-mon-tp48-fm-30hz.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng FM 30 Hz tại TP48 của MON",
    caption: "TP48 FM 30 Hz",
    source: "Manual Figure 7-20, PDF page 484",
  },
  monIdent: {
    src: "/equipment/dvor-220/waveforms/figure-7-21-mon-tp47-identification.webp",
    width: 800,
    height: 480,
    alt: "Dạng sóng Identification tại TP47 của MON",
    caption: "TP47 Identification",
    source: "Manual Figure 7-21, PDF page 484",
  },
} as const satisfies Record<string, Dvor220WaveformReference>;

export const DVOR_220_BLOCKS: readonly Dvor220BlockDefinition[] = [
  {
    id: "lmi",
    shortName: "LMI",
    name: "Local Maintenance Interface",
    assemblyIds: ["1A6"],
    partNumber: "0130-7530",
    description: "Giao diện bảo dưỡng tại chỗ dùng màn hình cảm ứng 10,2 inch để hiển thị trạng thái, số đo và điều khiển hệ thống.",
    manualReference: "Manual §3.2.2 và §4.2.1; Figures 3-8 đến 3-10, Figure 4-1 (PDF 101-103, 188).",
    cabinetHotspots: [front.lmi],
    diagramOccurrences: [occurrence("overview-lmi", [front.lmi.id]), occurrence("control-lmi", [front.lmi.id])],
    indicators: ["NORMAL - xanh", "WARNING - hổ phách", "ALARM - đỏ", "MAINT - xanh lam"],
    controls: ["Màn hình TFT cảm ứng 10,2 inch", "Keylock LOCAL / REM / MAINT", "LAN và USB qua LMI-IF"],
    testPoints: [],
    faceplate: "lmi",
  },
  {
    id: "csp",
    shortName: "CSP",
    name: "Control Status Panel",
    assemblyIds: ["1A1A1"],
    partNumber: "0230-7560",
    description: "Panel dự phòng bằng nút nhấn và LED để điều khiển máy phát, bypass monitor, reset, lamp test và theo dõi trạng thái thiết bị.",
    manualReference: "Manual §3.2.3 và §4.2.2; Figures 3-11 đến 3-13, Figure 4-2; Tables 4-3 đến 4-6 (PDF 104-106, 191-193).",
    cabinetHotspots: [front.csp],
    diagramOccurrences: [occurrence("overview-csp", [front.csp.id]), occurrence("control-csp", [front.csp.id])],
    indicators: ["MAIN, ON ANT, LOAD, FAULT, POWER và ENABLE cho TX1/TX2", "NORMAL, WARNING, ALARM và BYPASS cho hai MON", "CHANGEOVER, ANT FAULT, AC MAIN, ON BAT, ENVIRONMENT, TxD và RxD"],
    controls: ["Chọn MAIN và ON ANT", "POWER / ENABLE cho CMA và SMA", "BYPASS", "RESET, LAMP TEST, SILENCE", "VOLUME là biến trở xoay"],
    testPoints: [],
    faceplate: "csp",
  },
  {
    id: "tsg",
    shortName: "TSG",
    name: "Test Signal Generator",
    assemblyIds: ["1A1A2"],
    partNumber: "0230-7440",
    description: "Tạo tuần tự tín hiệu điều chế DVOR bình thường và tín hiệu lỗi để kiểm tra tính toàn vẹn của hai monitor.",
    manualReference: "Manual §3.2.7, Figures 3-18/3-19; §7.2.7, Figure 7-1 (PDF 111-112, 465).",
    cabinetHotspots: [front.tsg],
    diagramOccurrences: [occurrence("overview-tsg", [front.tsg.id]), occurrence("monitor-tsg", [front.tsg.id]), occurrence("control-tsg", [front.tsg.id])],
    indicators: ["POWER - xanh", "FAULT - đỏ", "PLL FAULT - đỏ"],
    controls: ["RESET", "MCU JTAG/Download", "CPLD JTAG/Download"],
    testPoints: [{ id: "BNC", label: "VOR RF Signal", description: "Ngõ ra RF thử cấp đến quint 3-way divider." }],
    faceplate: "card",
  },
  {
    id: "scu",
    shortName: "SCU",
    name: "System Controller Unit",
    assemblyIds: ["1A1A3", "1A1A4"],
    partNumber: "0130-7520",
    description: "Hai bộ điều khiển dự phòng thu thập CAN bus, xử lý voting monitor và phát lệnh changeover hoặc shutdown.",
    manualReference: "Manual §3.2.8, Figures 3-20 đến 3-23; §7.2.8, Figure 7-2 (PDF 114-117, 466).",
    cabinetHotspots: [front.scu1, front.scu2],
    diagramOccurrences: [
      occurrence("overview-scu", [front.scu1.id, front.scu2.id]),
      occurrence("txrf-scu", [front.scu1.id, front.scu2.id]),
      occurrence("monitor-scu", [front.scu1.id, front.scu2.id]),
      occurrence("asu-scu", [front.scu1.id, front.scu2.id]),
      occurrence("power-scu", [front.scu1.id, front.scu2.id]),
      occurrence("control-scu", [front.scu1.id, front.scu2.id]),
    ],
    indicators: ["POWER - xanh", "FAULT - đỏ", "MASTER/SLAVE - xanh"],
    controls: ["RESET", "MCU/CPLD JTAG", "CAN, UART và Ethernet nội bộ"],
    testPoints: [
      { id: "TP", label: "CAN TxD TTL", description: "Theo dõi dữ liệu phát trên CAN transceiver." },
      { id: "TP", label: "CAN RxD TTL", description: "Theo dõi dữ liệu thu trên CAN transceiver." },
    ],
    faceplate: "card",
  },
  {
    id: "emu",
    shortName: "EMU",
    name: "Environmental Monitor Unit",
    assemblyIds: ["1A1A5"],
    partNumber: "0130-7540",
    description: "Giám sát nhiệt độ, xâm nhập và khói; gửi trạng thái môi trường về SCU qua CAN bus.",
    manualReference: "Manual §3.2.9, Figures 3-24/3-25 (PDF 118-119).",
    cabinetHotspots: [front.emu],
    diagramOccurrences: [occurrence("overview-emu", [front.emu.id]), occurrence("control-emu", [front.emu.id])],
    indicators: ["POWER", "FAULT"],
    controls: ["Đầu vào cảm biến nhiệt độ", "Đầu vào smoke và intrusion", "CAN bus"],
    testPoints: [],
    faceplate: "card",
  },
  {
    id: "niu",
    shortName: "NIU",
    name: "Network Interface Unit",
    assemblyIds: ["1A1A6", "1A1A7"],
    partNumber: "0130-7550",
    description: "Cặp giao diện mạng tùy chọn cung cấp Ethernet LAN và SNMP cho truy cập giám sát từ xa.",
    manualReference: "Manual §3.2.10, Figures 3-26/3-27 (PDF 120).",
    cabinetHotspots: [front.niu1, front.niu2],
    diagramOccurrences: [occurrence("overview-niu", [front.niu1.id, front.niu2.id]), occurrence("control-niu", [front.niu1.id, front.niu2.id])],
    indicators: ["POWER", "FAULT", "LAN link/activity"],
    controls: ["Ethernet LAN", "USB/service", "Kết nối nội bộ đến SCU"],
    testPoints: [],
    faceplate: "card",
  },
  {
    id: "dcdc-aux",
    shortName: "DC/DC-A",
    name: "DC-to-DC Converter for AUX",
    assemblyIds: ["1A1A8", "1A1A9"],
    partNumber: "0130-7720",
    description: "Hai converter mắc song song dự phòng, tạo các điện áp DC cho auxiliary electronics subrack.",
    manualReference: "Manual §3.2.11, Figures 3-28/3-29; §7.2.10, Figure 7-3 (PDF 121-122, 468).",
    cabinetHotspots: [front.dcdcAux1, front.dcdcAux2],
    diagramOccurrences: [occurrence("overview-dcdc-aux", [front.dcdcAux1.id, front.dcdcAux2.id]), occurrence("power-dcdc-aux", [front.dcdcAux1.id, front.dcdcAux2.id])],
    indicators: ["POWER ON - xanh", "INPUT VOLTAGE FAULT - đỏ", "OUTPUT VOLTAGE FAULT"],
    controls: ["Nguồn vào +28 VDC", "Cấp nguồn redundant cho AUX"],
    testPoints: [
      { id: "TP", label: "+5 V", description: "Test jack đỏ." },
      { id: "TP", label: "+15 V", description: "Test jack đỏ." },
      { id: "TP", label: "-15 V", description: "Test jack đỏ." },
      { id: "TP", label: "GND", description: "Test jack đen." },
    ],
    faceplate: "dcdc-aux",
  },
  {
    id: "modem",
    shortName: "MODEM",
    name: "Dedicated Line / Dial-up Modem",
    assemblyIds: ["1A1A10", "1A1A11"],
    partNumber: "0130-7420",
    description: "Giao diện modem đường thuê riêng hoặc dial-up phục vụ PMDT và RCU từ xa.",
    manualReference: "Manual §3.2.12, Figures 3-30/3-31 (PDF 123).",
    cabinetHotspots: [front.modem1, front.modem2],
    diagramOccurrences: [occurrence("overview-modem", [front.modem1.id, front.modem2.id]), occurrence("control-modem", [front.modem1.id, front.modem2.id])],
    indicators: ["POWER", "TxD", "RxD", "Carrier/Link"],
    controls: ["RS-232", "Dedicated line / dial-up", "Cấu hình flow control"],
    testPoints: [],
    faceplate: "card",
  },
  {
    id: "vau",
    shortName: "VAU",
    name: "Voice Amplifier Unit",
    assemblyIds: ["1A1A12"],
    partNumber: "0130-7430",
    description: "Lọc dải 300-3000 Hz và khuếch đại audio voice đưa đến khối tạo điều chế.",
    manualReference: "Manual §3.2.13, Figures 3-32/3-33 (PDF 124).",
    cabinetHotspots: [front.vau],
    diagramOccurrences: [occurrence("overview-vau", [front.vau.id]), occurrence("control-vau", [front.vau.id])],
    indicators: ["POWER", "FAULT"],
    controls: ["Voice input", "Filtered audio output", "Level adjustment nội bộ"],
    testPoints: [],
    faceplate: "card",
  },
  {
    id: "ifb",
    shortName: "IFB",
    name: "Interface Board",
    assemblyIds: ["1A7"],
    partNumber: "0130-3410",
    description: "Điểm giao tiếp vật lý và chống surge giữa cabinet với voice, IDENT, cảm biến môi trường, LMI, mạng và thiết bị từ xa.",
    manualReference: "Manual §3.2.6, Figures 3-16/3-17 (PDF 108-110).",
    cabinetHotspots: [rear.ifb],
    diagramOccurrences: [occurrence("overview-ifb", [rear.ifb.id]), occurrence("control-ifb", [rear.ifb.id])],
    indicators: [],
    controls: ["Voice/IDENT", "Environmental sensors", "LAN/USB", "RS-232/Modem", "Surge protection"],
    testPoints: [],
  },
  {
    id: "rf-divider",
    shortName: "1PD1",
    name: "Quint 3-way RF Divider",
    assemblyIds: ["1PD1"],
    partNumber: "0230-7370",
    description: "Năm bộ chia 3 đường phân phối FFM1, FFM2, FFM3, standby transmitter và TSG đến hai monitor cùng cổng test.",
    manualReference: "Manual §3.2.5, Figures 3-14/3-15 (PDF 107).",
    cabinetHotspots: [rear.divider],
    diagramOccurrences: [occurrence("overview-divider", [rear.divider.id]), occurrence("monitor-divider", [rear.divider.id])],
    indicators: [],
    controls: ["FFM1", "FFM2", "FFM3", "Standby TX", "TSG", "Hai ngõ MON và một ngõ test cho mỗi đường"],
    testPoints: [],
  },
  {
    id: "sma-lsb",
    shortName: "LSB SMA",
    name: "Lower Sideband Modulation Amplifier",
    assemblyIds: ["1A2A1", "1A3A1"],
    partNumber: "0230-7160",
    description: "Điều chế và khuếch đại hai nhánh LSB COS/SIN; hai ngõ ra được đưa riêng đến PDC.",
    manualReference: "Manual §3.2.14, Figures 3-34 đến 3-36; §7.2.12, Figures 7-4 đến 7-6 (PDF 125-129, 470-472).",
    cabinetHotspots: [front.tx1SmaLsb, front.tx2SmaLsb],
    diagramOccurrences: [occurrence("overview-tx1-sma-lsb", [front.tx1SmaLsb.id]), occurrence("overview-tx2-sma-lsb", [front.tx2SmaLsb.id]), occurrence("txrf-tx1-sma-lsb", [front.tx1SmaLsb.id]), occurrence("txrf-tx2-sma-lsb", [front.tx2SmaLsb.id])],
    indicators: ["POWER - xanh", "COS RF ON / SIN RF ON - xanh", "COS FAULT / SIN FAULT - đỏ"],
    controls: ["Handle tháo LRU", "Hai ngõ monitor envelope BNC"],
    testPoints: [
      { id: "J5", label: "COS ENV", description: "Envelope COS; biên độ phụ thuộc power setting.", waveforms: [waveforms.smaCos] },
      { id: "J6", label: "SIN ENV", description: "Envelope SIN; biên độ phụ thuộc power setting.", waveforms: [waveforms.smaSin] },
    ],
    faceplate: "sma",
  },
  {
    id: "cma",
    shortName: "CMA",
    name: "Carrier Modulation Amplifier",
    assemblyIds: ["1A2A2", "1A3A2"],
    partNumber: "0230-7140",
    description: "Điều chế AM 30 Hz, voice/IDENT và khuếch đại carrier RF đến công suất phát yêu cầu.",
    manualReference: "Manual §3.2.15, Figures 3-37 đến 3-39; §7.2.13, Figures 7-7 đến 7-9 (PDF 130-132, 473-475).",
    cabinetHotspots: [front.tx1Cma, front.tx2Cma],
    diagramOccurrences: [occurrence("overview-tx1-cma", [front.tx1Cma.id]), occurrence("overview-tx2-cma", [front.tx2Cma.id]), occurrence("txrf-tx1-cma", [front.tx1Cma.id]), occurrence("txrf-tx2-cma", [front.tx2Cma.id])],
    indicators: ["POWER - xanh", "RF ON - xanh", "FAULT - đỏ"],
    controls: ["Handle tháo LRU", "ENV monitor BNC"],
    testPoints: [{ id: "J2", label: "ENV", description: "Carrier envelope; manual cung cấp dạng thường và khi Ident key down.", waveforms: [waveforms.cmaEnv, waveforms.cmaIdent] }],
    faceplate: "cma",
  },
  {
    id: "sma-usb",
    shortName: "USB SMA",
    name: "Upper Sideband Modulation Amplifier",
    assemblyIds: ["1A2A3", "1A3A3"],
    partNumber: "0230-7160",
    description: "Điều chế và khuếch đại hai nhánh USB COS/SIN; phần cứng và panel giống LSB SMA.",
    manualReference: "Manual §3.2.14, Figures 3-34 đến 3-36; §7.2.12, Figures 7-4 đến 7-6 (PDF 125-129, 470-472).",
    cabinetHotspots: [front.tx1SmaUsb, front.tx2SmaUsb],
    diagramOccurrences: [occurrence("overview-tx1-sma-usb", [front.tx1SmaUsb.id]), occurrence("overview-tx2-sma-usb", [front.tx2SmaUsb.id]), occurrence("txrf-tx1-sma-usb", [front.tx1SmaUsb.id]), occurrence("txrf-tx2-sma-usb", [front.tx2SmaUsb.id])],
    indicators: ["POWER - xanh", "COS RF ON / SIN RF ON - xanh", "COS FAULT / SIN FAULT - đỏ"],
    controls: ["Handle tháo LRU", "Hai ngõ monitor envelope BNC"],
    testPoints: [
      { id: "J5", label: "COS ENV", description: "Envelope COS; biên độ phụ thuộc power setting.", waveforms: [waveforms.smaCos] },
      { id: "J6", label: "SIN ENV", description: "Envelope SIN; biên độ phụ thuộc power setting.", waveforms: [waveforms.smaSin] },
    ],
    faceplate: "sma",
  },
  {
    id: "dcdc-tx",
    shortName: "DC/DC",
    name: "Transmitter DC-to-DC Converter",
    assemblyIds: ["1A2A4", "1A3A4"],
    partNumber: "0230-7710",
    description: "Chuyển đổi bus +28 VDC thành các rail nguồn cho transmitter/monitor subrack.",
    manualReference: "Manual §3.2.16, Figures 3-40/3-41; §7.2.14, Figure 7-10 (PDF 133-134, 476).",
    cabinetHotspots: [front.tx1Dcdc, front.tx2Dcdc],
    diagramOccurrences: [occurrence("overview-tx1-dcdc", [front.tx1Dcdc.id]), occurrence("overview-tx2-dcdc", [front.tx2Dcdc.id]), occurrence("txrf-tx1-dcdc", [front.tx1Dcdc.id]), occurrence("txrf-tx2-dcdc", [front.tx2Dcdc.id]), occurrence("power-dcdc-tx1", [front.tx1Dcdc.id]), occurrence("power-dcdc-tx2", [front.tx2Dcdc.id])],
    indicators: ["POWER ON - xanh", "INPUT VOLTAGE FAULT - đỏ", "OUTPUT VOLTAGE FAULT"],
    controls: ["Nguồn vào +28 VDC", "Hot-swap controller"],
    testPoints: [
      { id: "TP", label: "+5 V", description: "Test jack đỏ." },
      { id: "TP", label: "+8 V", description: "Test jack đỏ." },
      { id: "TP", label: "+15 V", description: "Test jack đỏ." },
      { id: "TP", label: "-15 V", description: "Test jack đỏ." },
      { id: "TP", label: "+28 V", description: "Test jack đỏ." },
      { id: "TP", label: "+50 V", description: "Test jack đỏ." },
      { id: "TP", label: "GND", description: "Test jack đen." },
    ],
    faceplate: "dcdc-tx",
  },
  {
    id: "msg",
    shortName: "MSG",
    name: "Modulation Signal Generator",
    assemblyIds: ["1A2A5", "1A3A5"],
    partNumber: "0130-7510",
    description: "Sinh modulation carrier/sideband bằng DDS, tạo 30 Hz sync và điều khiển chuỗi phát cùng quạt làm mát.",
    manualReference: "Manual §3.2.17, Figures 3-42 đến 3-44; §7.2.15, Figures 7-11 đến 7-15 (PDF 135-139, 477-479).",
    cabinetHotspots: [front.tx1Msg, front.tx2Msg],
    diagramOccurrences: [occurrence("overview-tx1-msg", [front.tx1Msg.id]), occurrence("overview-tx2-msg", [front.tx2Msg.id]), occurrence("txrf-tx1-msg", [front.tx1Msg.id]), occurrence("txrf-tx2-msg", [front.tx2Msg.id]), occurrence("control-msg", [front.tx1Msg.id, front.tx2Msg.id])],
    indicators: ["POWER - xanh", "FAULT - đỏ"],
    controls: ["RESET", "MCU JTAG", "CPLD JTAG", "30 Hz Sync BNC"],
    testPoints: [
      { id: "TP49", label: "Carrier Modulation Signal", description: "Carrier modulation thường và khi Ident key down.", waveforms: [waveforms.msgCarrier, waveforms.msgCarrierIdent] },
      { id: "TP61 / TP63", label: "USB COS / USB SIN", description: "Hai tín hiệu điều chế USB trực giao.", waveforms: [waveforms.msgUsb] },
      { id: "TP62 / TP64", label: "LSB COS / LSB SIN", description: "Hai tín hiệu điều chế LSB trực giao.", waveforms: [waveforms.msgLsb] },
    ],
    faceplate: "msg",
  },
  {
    id: "syn",
    shortName: "SYN",
    name: "Frequency Synthesizer",
    assemblyIds: ["1A2A6", "1A3A6"],
    partNumber: "0230-7130",
    description: "Tạo carrier và bốn tần số sideband từ TCXO, PLL và DDS; dải lập trình 108-118 MHz theo bước 50 kHz.",
    manualReference: "Manual §3.2.18, Figures 3-45 đến 3-50; §7.2.16, Figure 7-16 (PDF 140-145, 480-481).",
    cabinetHotspots: [front.tx1Syn, front.tx2Syn],
    diagramOccurrences: [occurrence("overview-tx1-syn", [front.tx1Syn.id]), occurrence("overview-tx2-syn", [front.tx2Syn.id]), occurrence("txrf-tx1-syn", [front.tx1Syn.id]), occurrence("txrf-tx2-syn", [front.tx2Syn.id])],
    indicators: ["POWER LED6 - xanh", "PLL FAIL LED7 - đỏ", "ERROR LED8 - đỏ"],
    controls: ["RESET", "Frequency coded switches", "MCU/CPLD service connectors"],
    testPoints: [
      { id: "J1", label: "CSB MON / Carrier Frequency", description: "Station carrier; mức tham khảo -5 dBm ±4 dB khi đo bằng power sensor." },
      { id: "J6", label: "40 MHz MON", description: "Reference 40 MHz từ TCXO." },
      { id: "TP33-TP36", label: "USB/LSB COS/SIN Frequency", description: "Các tần số sideband dùng khi kiểm tra định kỳ." },
    ],
    faceplate: "syn",
  },
  {
    id: "mon",
    shortName: "MON",
    name: "DVOR Monitor",
    assemblyIds: ["1A2A7", "1A3A7"],
    partNumber: "0230-7550",
    description: "Hai monitor độc lập xử lý RF từ field antenna, standby transmitter và TSG; phát warning/alarm về SCU.",
    manualReference: "Manual §3.2.19, Figures 3-51 đến 3-54; §7.2.17, Figures 7-17 đến 7-21 (PDF 146-148, 482-484).",
    cabinetHotspots: [front.tx1Mon, front.tx2Mon],
    diagramOccurrences: [occurrence("overview-mon1", [front.tx1Mon.id]), occurrence("overview-mon2", [front.tx2Mon.id]), occurrence("monitor-mon1", [front.tx1Mon.id]), occurrence("monitor-mon2", [front.tx2Mon.id]), occurrence("control-mon", [front.tx1Mon.id, front.tx2Mon.id])],
    indicators: ["POWER - xanh", "FAULT / INTEGRAL ALARM - đỏ", "INTEGRAL WARNING - hổ phách", "SECONDARY ALARM / STANDBY ALARM", "IDENTITY CODE - xanh"],
    controls: ["RESET", "MCU JTAG", "Zynq JTAG"],
    testPoints: [
      { id: "TP51", label: "AM 30 Hz", description: "Tín hiệu AM 30 Hz sau xử lý.", waveforms: [waveforms.monAm] },
      { id: "TP49", label: "Baseband", description: "Composite baseband monitor.", waveforms: [waveforms.monBaseband] },
      { id: "TP48", label: "FM 30 Hz", description: "Tín hiệu FM 30 Hz phục hồi.", waveforms: [waveforms.monFm] },
      { id: "TP47", label: "Identification", description: "Tín hiệu nhận dạng 1020 Hz/keying.", waveforms: [waveforms.monIdent] },
    ],
    faceplate: "mon",
  },
  {
    id: "fan",
    shortName: "FAN",
    name: "Transmitter Cooling Fan",
    assemblyIds: ["1A2A8", "1A3A8"],
    partNumber: "0130-7910",
    description: "Cụm bốn quạt làm mát CMA/SMA; MSG điều khiển on/off và thu fault từ từng motor.",
    manualReference: "Manual §3.2.20, Figures 3-55/3-56; §7.2.18, Figure 7-22 (PDF 149, 485).",
    cabinetHotspots: [front.tx1Fan, front.tx2Fan],
    diagramOccurrences: [occurrence("overview-tx1-fan", [front.tx1Fan.id]), occurrence("overview-tx2-fan", [front.tx2Fan.id]), occurrence("txrf-tx1-fan", [front.tx1Fan.id]), occurrence("txrf-tx2-fan", [front.tx2Fan.id])],
    indicators: ["POWER - xanh", "FAN 1/2/3/4 FAULT - đỏ"],
    controls: ["6-pin Molex power/control", "Manual/automatic control từ MSG/LMI/PMDT"],
    testPoints: [],
    faceplate: "fan",
  },
  {
    id: "pdc",
    shortName: "PDC",
    name: "Power Detector / Changeover",
    assemblyIds: ["1A8A1"],
    partNumber: "0233-7310",
    description: "Chọn TX1/TX2 vào aerial path, đưa máy chờ ra tải giả, đo power/VSWR/phase và tổng hợp tín hiệu standby cho monitor.",
    manualReference: "Manual §3.2.21, Figures 3-57 đến 3-63; §7.2.19, Figure 7-23 (PDF 150-158, 486).",
    cabinetHotspots: [front.pdc],
    diagramOccurrences: [occurrence("overview-pdc", [front.pdc.id]), occurrence("txrf-pdc", [front.pdc.id]), occurrence("monitor-pdc", [front.pdc.id]), occurrence("asu-pdc", [front.pdc.id]), occurrence("control-pdc", [front.pdc.id])],
    indicators: ["POWER LED trên PDC-IF"],
    controls: ["Coaxial relay carrier", "SCM sideband changeover", "CDM carrier detector", "Hai SDM USB/LSB", "PDC Interface Board"],
    testPoints: [
      { id: "J20", label: "LSB COS", description: "Coupled RF monitor port." },
      { id: "J21", label: "LSB SIN", description: "Coupled RF monitor port." },
      { id: "J22", label: "USB COS", description: "Coupled RF monitor port." },
      { id: "J23", label: "USB SIN", description: "Coupled RF monitor port." },
      { id: "J24", label: "CARRIER", description: "Coupled carrier monitor port." },
    ],
    faceplate: "pdc",
  },
  {
    id: "power-switch-panel",
    shortName: "POWER",
    name: "Power Switch and Indicator Panel",
    assemblyIds: ["1A4"],
    description: "Panel nguồn phía trước gồm đèn AC AVAILABLE và circuit breaker AC MAIN, BATT 1, BATT 2.",
    manualReference: "Manual §3.1.4, Figure 3-4; Figure 7-24 (PDF 98, 487).",
    cabinetHotspots: [front.powerSwitch],
    diagramOccurrences: [occurrence("power-switch-panel", [front.powerSwitch.id])],
    indicators: ["AC AVAILABLE"],
    controls: ["AC MAIN circuit breaker", "BATT 1 circuit breaker", "BATT 2 circuit breaker"],
    testPoints: [],
    faceplate: "power-switch",
  },
  {
    id: "pmu",
    shortName: "PMU",
    name: "Power Management Unit",
    assemblyIds: ["1A4A1", "1A4A2"],
    partNumber: "0130-7730",
    description: "Giám sát AC/DC, sạc/xả và bảo vệ battery; truyền voltage, current, temperature và fault về SCU qua CAN.",
    manualReference: "Manual §3.2.22, Figures 3-64/3-65; §7.2.20, Figure 7-24 (PDF 159-161, 487).",
    cabinetHotspots: [front.pmu1, front.pmu2],
    diagramOccurrences: [occurrence("overview-pmu", [front.pmu1.id, front.pmu2.id]), occurrence("power-pmu1", [front.pmu1.id]), occurrence("power-pmu2", [front.pmu2.id]), occurrence("control-pmu", [front.pmu1.id, front.pmu2.id])],
    indicators: ["7-segment information display", "ON BATT - hổ phách", "AC FAIL - đỏ", "BAT CHARGE - hổ phách", "PMU temperature/status LEDs"],
    controls: ["Nút chọn ACDC output current/voltage", "Battery output current/voltage", "RESET", "MCU JTAG"],
    testPoints: [
      { id: "TP", label: "GND", description: "Ground reference." },
      { id: "TP", label: "Battery Voltage", description: "Điện áp battery tại PMU." },
      { id: "TP", label: "AC/DC Voltage", description: "Điện áp đầu ra AC/DC." },
    ],
    faceplate: "pmu",
  },
  {
    id: "acdc",
    shortName: "AC/DC",
    name: "AC-to-DC Converter",
    assemblyIds: ["1A5A1", "1A5A2", "1A5A3", "1A5A4", "1A5A5"],
    partNumber: "3151-0016",
    description: "Các SMPS 1600 W đổi 85-265 VAC thành +28 VDC; cabinet hỗ trợ tối đa năm module để dự phòng.",
    manualReference: "Manual §3.2.23, Figures 3-66/3-67; §7.2.21, Figure 7-25 (PDF 162, 488).",
    cabinetHotspots: [front.acdc1, front.acdc2, front.acdc3, front.acdc4, front.acdc5],
    diagramOccurrences: [occurrence("overview-acdc", [front.acdc1.id, front.acdc3.id, front.acdc5.id]), occurrence("power-acdc1", [front.acdc1.id]), occurrence("power-acdc3", [front.acdc3.id]), occurrence("power-acdc5", [front.acdc5.id])],
    indicators: ["DC OK - xanh / DC FAIL - đỏ", "AC OK - xanh / AC FAIL - đỏ"],
    controls: ["Extraction handle", "Power supply release knob", "PMBus đến PMU"],
    testPoints: [],
    faceplate: "acdc",
  },
  {
    id: "battery",
    shortName: "BAT",
    name: "Backup Battery Bank",
    assemblyIds: ["BAT 1", "BAT 2"],
    description: "Hai nhánh battery ngoài cabinet cấp nguồn no-break song song với AC/DC và được PMU quản lý sạc/xả.",
    manualReference: "Manual §1.7.4, Figures 1-18/1-19 (PDF 46-47).",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-battery"), occurrence("power-battery1"), occurrence("power-battery2")],
    indicators: [],
    controls: ["Kết nối qua BATT 1/BATT 2 circuit breaker", "PMU charge/discharge control"],
    testPoints: [],
    notes: ["Battery bank nằm trong housing riêng bên ngoài equipment cabinet."],
  },
  {
    id: "asu",
    shortName: "ASU",
    name: "Antenna Switching Unit",
    assemblyIds: ["2A1"],
    partNumber: "0233-7210 / 0233-7211",
    description: "Cabinet tách rời nhận bốn sideband từ PDC, tạo commutation 30 Hz và phân phối đến 48 sideband antennas.",
    manualReference: "Manual §3.4.2, Figures 3-68 đến 3-71 (PDF 164-166).",
    cabinetHotspots: [asu.shell],
    diagramOccurrences: [occurrence("overview-asu", [asu.shell.id]), occurrence("txrf-asu", [asu.shell.id])],
    indicators: ["BITE", "Power monitor tùy chọn"],
    controls: ["ASU-IF", "Toggle Module", "Bốn Select Module", "Power Monitor tùy chọn"],
    testPoints: [],
    faceplate: "asu",
  },
  {
    id: "asu-if",
    shortName: "ASU-IF",
    name: "ASU Interface Board",
    assemblyIds: ["2A1A1"],
    partNumber: "0233-3230",
    description: "Nhận +28 V, 30 Hz ANT Sync và 1440 Hz switching clock; CPLD tạo mã chọn COS/SIN, USB/LSB cho 48 antenna.",
    manualReference: "Manual §3.4.2.2, Figures 3-72/3-73 (PDF 168).",
    cabinetHotspots: [asu.interface],
    diagramOccurrences: [occurrence("asu-interface", [asu.interface.id])],
    indicators: ["BITE logic"],
    controls: ["AUTO/MANUAL jumper", "UP/DOWN manual switches", "RS-485 sync/clock"],
    testPoints: [],
    faceplate: "card",
  },
  {
    id: "asu-tm",
    shortName: "TM",
    name: "ASU Toggle Module",
    assemblyIds: ["2A1A2"],
    partNumber: "0233-7240",
    description: "Toggle bốn đường USB/LSB COS/SIN trước khi cấp đến các Select Module theo nửa chu kỳ commutation.",
    manualReference: "Manual §3.4.2.3, Figure 3-75; Table 3-1 (PDF 170-171).",
    cabinetHotspots: [asu.toggle],
    diagramOccurrences: [occurrence("asu-toggle", [asu.toggle.id])],
    indicators: [],
    controls: ["PIN-diode RF switches", "Even/Odd toggle control"],
    testPoints: [],
  },
  {
    id: "asu-sm-cos-lo",
    shortName: "SM COS LO",
    name: "Select Module - COS Low Group",
    assemblyIds: ["2A1A3"],
    partNumber: "0233-7250",
    description: "Chọn một trong 12 antenna lẻ A1-A23 cho đường COS low group.",
    manualReference: "Manual §3.4.2.4, Figure 3-76; Table 3-2 (PDF 172-173).",
    cabinetHotspots: [asu.cosLo],
    diagramOccurrences: [occurrence("asu-sm-cos-lo", [asu.cosLo.id])],
    indicators: [], controls: ["1-of-12 PIN-diode selection"], testPoints: [],
  },
  {
    id: "asu-sm-cos-hi",
    shortName: "SM COS HI",
    name: "Select Module - COS High Group",
    assemblyIds: ["2A1A4"],
    partNumber: "0233-7250",
    description: "Chọn một trong 12 antenna lẻ A25-A47 cho đường COS high group.",
    manualReference: "Manual §3.4.2.4, Figure 3-76; Table 3-2 (PDF 172-173).",
    cabinetHotspots: [asu.cosHi],
    diagramOccurrences: [occurrence("asu-sm-cos-hi", [asu.cosHi.id])],
    indicators: [], controls: ["1-of-12 PIN-diode selection"], testPoints: [],
  },
  {
    id: "asu-sm-sin-lo",
    shortName: "SM SIN LO",
    name: "Select Module - SIN Low Group",
    assemblyIds: ["2A1A5"],
    partNumber: "0233-7250",
    description: "Chọn một trong 12 antenna chẵn A2-A24 cho đường SIN low group.",
    manualReference: "Manual §3.4.2.4, Figure 3-76; Table 3-2 (PDF 172-173).",
    cabinetHotspots: [asu.sinLo],
    diagramOccurrences: [occurrence("asu-sm-sin-lo", [asu.sinLo.id])],
    indicators: [], controls: ["1-of-12 PIN-diode selection"], testPoints: [],
  },
  {
    id: "asu-sm-sin-hi",
    shortName: "SM SIN HI",
    name: "Select Module - SIN High Group",
    assemblyIds: ["2A1A6"],
    partNumber: "0233-7250",
    description: "Chọn một trong 12 antenna chẵn A26-A48 cho đường SIN high group.",
    manualReference: "Manual §3.4.2.4, Figure 3-76; Table 3-2 (PDF 172-173).",
    cabinetHotspots: [asu.sinHi],
    diagramOccurrences: [occurrence("asu-sm-sin-hi", [asu.sinHi.id])],
    indicators: [], controls: ["1-of-12 PIN-diode selection"], testPoints: [],
  },
  {
    id: "asu-power-monitor",
    shortName: "PM",
    name: "ASU Power Monitor",
    assemblyIds: ["2A1A7"],
    description: "Tùy chọn đo forward/reverse carrier và sideband tại đầu vào ASU bằng line section, element xoay và panel meter.",
    manualReference: "Manual §3.4.2.5 (PDF 173); Figure 3-69 (PDF 164).",
    cabinetHotspots: [asu.powerMonitor],
    diagramOccurrences: [occurrence("asu-power-monitor", [asu.powerMonitor.id])],
    indicators: ["Analog RF power meter"],
    controls: ["Carrier/sideband selector", "Forward/reverse plug-in elements"],
    testPoints: [],
  },
  {
    id: "carrier-antenna",
    shortName: "CAR ANT",
    name: "Carrier Antenna",
    assemblyIds: ["2A6"],
    description: "Antenna trung tâm phát carrier có điều chế AM 30 Hz và IDENT.",
    manualReference: "Manual §1.8 và §3.4.3, Figures 1-21 đến 1-24, Figure 3-77 (PDF 50-55, 174).",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-carrier-antenna"), occurrence("txrf-carrier-antenna")],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "sideband-antennas",
    shortName: "48 SB ANT",
    name: "48 Sideband Antennas",
    assemblyIds: ["A1-A48"],
    description: "Bốn nhóm 12 antenna nhận COS hoặc SIN và được commutate theo 30 Hz để tạo hiệu ứng Doppler.",
    manualReference: "Manual §3.4.2/§3.4.3, Figures 3-70/3-71/3-77 (PDF 165-166, 174).",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-sideband-antennas"), occurrence("txrf-sideband-antennas"), occurrence("asu-sideband-antennas")],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "field-monitor-antennas",
    shortName: "FFM 1-3",
    name: "Field Monitor Antennas",
    assemblyIds: ["MON ANT 1", "MON ANT 2", "MON ANT 3"],
    description: "Tối đa ba field monitor antenna; FFM1 vào channel A liên tục, FFM2/FFM3 được ghép vào channel B theo time slice.",
    manualReference: "Manual §1.7.3, Figure 1-17 (PDF 45); §3.2.19 (PDF 146-148).",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-field-antennas"), occurrence("monitor-field-antennas")],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "pmdt",
    shortName: "PMDT",
    name: "Portable Maintenance Data Terminal",
    assemblyIds: [],
    description: "Máy tính bảo dưỡng kết nối local hoặc remote qua USB, LAN, modem hoặc IP network.",
    manualReference: "Manual §1.9.2 và Figure 1-20 (PDF 48, 57-59).",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-pmdt"), occurrence("control-pmdt")],
    indicators: [], controls: ["Local/remote connection", "Status, setup, maintenance và troubleshooting"], testPoints: [],
  },
  {
    id: "remote-control",
    shortName: "RCU / RSU",
    name: "Remote Control and Status System",
    assemblyIds: ["RCU", "RSU"],
    description: "Hệ thống điều khiển và hiển thị trạng thái từ xa kết nối qua modem hoặc IP network.",
    manualReference: "Manual §1.10, Figures 1-33 đến 1-35 (PDF 61-63).",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-remote"), occurrence("control-remote")],
    indicators: [], controls: ["Remote commands", "Alarm/status indications"], testPoints: [],
  },
] as const;

export const DVOR_220_BLOCK_BY_ID = new Map<Dvor220BlockId, Dvor220BlockDefinition>(
  DVOR_220_BLOCKS.map((block) => [block.id, block] as const),
);

export const DVOR_220_COMPONENT_TO_BLOCK = new Map<string, Dvor220BlockId>(
  DVOR_220_BLOCKS.flatMap((block) =>
    block.diagramOccurrences.map((item) => [item.componentId, block.id] as const),
  ),
);

export const DVOR_220_HOTSPOT_TO_BLOCK = new Map<string, Dvor220BlockId>(
  DVOR_220_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.map((item) => [item.id, block.id] as const),
  ),
);
