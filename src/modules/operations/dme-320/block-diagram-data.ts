export type Dme320CabinetSurface = "front" | "rear";

export type Dme320BlockId =
  | "pmdt"
  | "remote-control"
  | "lmi"
  | "csp"
  | "scu"
  | "emu"
  | "dcdc-a"
  | "modem"
  | "ifb"
  | "dpx-msc"
  | "rxu"
  | "hpa"
  | "txu"
  | "dcdc"
  | "tcu"
  | "fan"
  | "mon"
  | "rfg"
  | "rf-detector"
  | "pmu"
  | "acdc"
  | "battery"
  | "circulator"
  | "directional-coupler"
  | "coaxial-relay"
  | "dummy-load"
  | "lpf"
  | "vswr-monitor"
  | "lightning-arrester"
  | "antenna";

export type Dme320CabinetKind =
  | "display"
  | "control"
  | "card"
  | "amplifier"
  | "power"
  | "rf"
  | "rear";

export type Dme320FaceplateKind =
  | "lmi"
  | "csp"
  | "scu"
  | "emu"
  | "rxu"
  | "hpa"
  | "txu"
  | "dcdc"
  | "tcu"
  | "mon"
  | "rfg"
  | "dcdc-a"
  | "fan"
  | "pmu"
  | "acdc"
  | "ifb"
  | "rear-rf";

export interface Dme320CabinetHotspot {
  id: string;
  surface: Dme320CabinetSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  assemblyId: string;
  shortLabel: string;
  kind: Dme320CabinetKind;
}

export interface Dme320DiagramOccurrence {
  id: string;
  componentId: string;
  targetCabinetHotspotIds: readonly string[];
}

export interface Dme320WaveformReference {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  source: string;
}

export interface Dme320TestPoint {
  id: string;
  label: string;
  description: string;
  waveforms?: readonly Dme320WaveformReference[];
}

export interface Dme320BlockDefinition {
  id: Dme320BlockId;
  shortName: string;
  name: string;
  assemblyIds: readonly string[];
  partNumber?: string;
  description: string;
  manualReference: string;
  cabinetHotspots: readonly Dme320CabinetHotspot[];
  diagramOccurrences: readonly Dme320DiagramOccurrence[];
  indicators: readonly string[];
  controls: readonly string[];
  testPoints: readonly Dme320TestPoint[];
  faceplate?: Dme320FaceplateKind;
  notes?: readonly string[];
}

const hotspot = (
  id: string,
  surface: Dme320CabinetSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  assemblyId: string,
  shortLabel: string,
  kind: Dme320CabinetKind,
): Dme320CabinetHotspot => ({
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
): Dme320DiagramOccurrence => ({
  id: `occ-${componentId}`,
  componentId,
  targetCabinetHotspotIds,
});

const front = {
  lmi: hotspot("front-lmi", "front", 520, 78, 154, 145, "1A6", "LMI", "display"),
  csp: hotspot("front-csp", "front", 108, 70, 58, 172, "1A1A1", "CSP", "control"),
  scu1: hotspot("front-scu-1", "front", 172, 70, 28, 172, "1A1A4", "SCU 1", "card"),
  scu2: hotspot("front-scu-2", "front", 204, 70, 28, 172, "1A1A5", "SCU 2", "card"),
  emu: hotspot("front-emu", "front", 236, 70, 28, 172, "1A1A6", "EMU", "card"),
  dcdcA1: hotspot("front-dcdc-a-1", "front", 268, 70, 28, 172, "1A1A7", "DC/DC-A 1", "power"),
  dcdcA2: hotspot("front-dcdc-a-2", "front", 300, 70, 28, 172, "1A1A8", "DC/DC-A 2", "power"),
  modem1: hotspot("front-modem-1", "front", 332, 70, 28, 172, "1A1A9", "MODEM 1", "card"),
  modem2: hotspot("front-modem-2", "front", 364, 70, 28, 172, "1A1A10", "MODEM 2", "card"),
  tx1Fan: hotspot("front-tx1-fan", "front", 108, 266, 364, 14, "1A2A9", "FAN TX1", "power"),
  tx1Dpx: hotspot("front-tx1-dpx", "front", 108, 286, 52, 214, "1A2A1", "DPX-MSC 1", "rf"),
  tx1Rxu: hotspot("front-tx1-rxu", "front", 164, 286, 36, 214, "1A2A2", "RXU 1", "card"),
  tx1Hpa: hotspot("front-tx1-hpa", "front", 204, 286, 68, 214, "1A2A3", "HPA 1", "amplifier"),
  tx1Txu: hotspot("front-tx1-txu", "front", 276, 286, 38, 214, "1A2A4", "TXU 1", "card"),
  tx1Dcdc: hotspot("front-tx1-dcdc", "front", 318, 286, 50, 214, "1A2A5", "DC/DC 1", "power"),
  tx1Tcu: hotspot("front-tx1-tcu", "front", 372, 286, 30, 214, "1A2A6", "TCU 1", "card"),
  tx1Rfg: hotspot("front-tx1-rfg", "front", 406, 286, 30, 214, "1A2A7", "RFG 1", "card"),
  tx1Mon: hotspot("front-tx1-mon", "front", 440, 286, 32, 214, "1A2A8", "MON 1", "card"),
  tx2Fan: hotspot("front-tx2-fan", "front", 108, 536, 364, 14, "1A3A9", "FAN TX2", "power"),
  tx2Dpx: hotspot("front-tx2-dpx", "front", 108, 556, 52, 214, "1A3A1", "DPX-MSC 2", "rf"),
  tx2Rxu: hotspot("front-tx2-rxu", "front", 164, 556, 36, 214, "1A3A2", "RXU 2", "card"),
  tx2Hpa: hotspot("front-tx2-hpa", "front", 204, 556, 68, 214, "1A3A3", "HPA 2", "amplifier"),
  tx2Txu: hotspot("front-tx2-txu", "front", 276, 556, 38, 214, "1A3A4", "TXU 2", "card"),
  tx2Dcdc: hotspot("front-tx2-dcdc", "front", 318, 556, 50, 214, "1A3A5", "DC/DC 2", "power"),
  tx2Tcu: hotspot("front-tx2-tcu", "front", 372, 556, 30, 214, "1A3A6", "TCU 2", "card"),
  tx2Rfg: hotspot("front-tx2-rfg", "front", 406, 556, 30, 214, "1A3A7", "RFG 2", "card"),
  tx2Mon: hotspot("front-tx2-mon", "front", 440, 556, 32, 214, "1A3A8", "MON 2", "card"),
  pmu1: hotspot("front-pmu-1", "front", 154, 824, 122, 100, "1A4A1", "PMU 1", "power"),
  pmu2: hotspot("front-pmu-2", "front", 282, 824, 122, 100, "1A4A2", "PMU 2", "power"),
  acdc1: hotspot("front-acdc-1", "front", 164, 944, 116, 52, "1A5A1", "AC/DC 1", "power"),
  acdc2: hotspot("front-acdc-2", "front", 286, 944, 116, 52, "1A5A2", "AC/DC 2", "power"),
} as const;

const rear = {
  ifb: hotspot("rear-ifb", "rear", 194, 68, 304, 104, "1A7", "IFB", "rear"),
  dummyLoad: hotspot("rear-dummy-load", "rear", 514, 68, 92, 104, "1RT1", "RF LOAD", "rf"),
  rfDetector1: hotspot("rear-rf-detector-1", "rear", 224, 188, 80, 82, "1A9", "RF DET 1", "rf"),
  rfDetector2: hotspot("rear-rf-detector-2", "rear", 312, 188, 80, 82, "1A10", "RF DET 2", "rf"),
  tx1Backplane: hotspot("rear-tx1-backplane", "rear", 194, 294, 304, 168, "1A2A10/11", "TX1 BP", "rear"),
  circulator1: hotspot("rear-circulator-1", "rear", 514, 302, 92, 72, "1CIR1", "CIRCULATOR 1", "rf"),
  coupler1: hotspot("rear-coupler-1", "rear", 514, 388, 92, 58, "1DC1", "COUPLER 1", "rf"),
  vswr: hotspot("rear-vswr-monitor", "rear", 194, 476, 96, 64, "1A8", "VSWR MON", "rf"),
  lpf: hotspot("rear-lpf", "rear", 302, 476, 68, 64, "1FL1", "LPF", "rf"),
  relay: hotspot("rear-coax-relay", "rear", 382, 476, 76, 64, "1RY1", "COAX RELAY", "rf"),
  coupler3: hotspot("rear-coupler-3", "rear", 514, 476, 92, 64, "1DC3", "27 dB COUPLER", "rf"),
  tx2Backplane: hotspot("rear-tx2-backplane", "rear", 194, 570, 304, 168, "1A3A10/11", "TX2 BP", "rear"),
  circulator2: hotspot("rear-circulator-2", "rear", 514, 578, 92, 72, "1CIR2", "CIRCULATOR 2", "rf"),
  coupler2: hotspot("rear-coupler-2", "rear", 514, 664, 92, 58, "1DC2", "COUPLER 2", "rf"),
  lightning: hotspot("rear-lightning-arrester", "rear", 514, 756, 92, 70, "1AR1", "LIGHTNING", "rf"),
} as const;

const systemDelayWaveform: Dme320WaveformReference = {
  src: "/equipment/dme-320/waveforms/figure-6-4-interrogation-reply.webp",
  width: 880,
  height: 500,
  alt: "Dạng sóng interrogation và reply dùng đo system delay DME 320",
  caption: "Interrogation / Reply - System delay",
  source: "MOPIENS 300 DME Technical Manual, Figure 6-4, PDF page 294",
};

const noIndicators: readonly string[] = [];
const noControls: readonly string[] = [];
const noTestPoints: readonly Dme320TestPoint[] = [];

export const DME_320_BLOCKS: readonly Dme320BlockDefinition[] = [
  {
    id: "pmdt",
    shortName: "PMDT",
    name: "Portable Maintenance Data Terminal",
    assemblyIds: [],
    description: "Máy tính bảo dưỡng cục bộ/từ xa kết nối qua IFB để cấu hình, giám sát và thực hiện các thủ tục bảo dưỡng DME.",
    manualReference: "Figure 3-1 và Figure 3-33; IFB Figure 3-56.",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-pmdt"), occurrence("control-pmdt")],
    indicators: noIndicators,
    controls: ["USB-B tới IFB", "Ethernet RJ-45 tới IFB", "RS-232 qua DSUB-9"],
    testPoints: noTestPoints,
  },
  {
    id: "remote-control",
    shortName: "RCU/RSU",
    name: "Remote Control and Status System",
    assemblyIds: [],
    description: "Hệ thống điều khiển/hiển thị trạng thái từ xa, liên lạc với thiết bị thông qua IFB và SCU.",
    manualReference: "Figure 3-1, Figure 3-33 và Figure 3-56.",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-remote"), occurrence("control-remote")],
    indicators: noIndicators,
    controls: ["Ethernet hoặc modem", "RS-232", "Các đường trạng thái và điều khiển từ xa"],
    testPoints: noTestPoints,
  },
  {
    id: "lmi",
    shortName: "LMI",
    name: "Local Maintenance Interface",
    assemblyIds: ["1A6"],
    partNumber: "0130-7530",
    description: "Giao diện bảo dưỡng tại tủ với màn hình cảm ứng TFT 10,2 inch; hiển thị trạng thái thiết bị, nguồn, môi trường và cấu hình TX/monitor.",
    manualReference: "Figure 1-6; Figure 3-34 và Figure 3-35, PDF page 111.",
    cabinetHotspots: [front.lmi],
    diagramOccurrences: [occurrence("overview-lmi", [front.lmi.id]), occurrence("control-lmi", [front.lmi.id])],
    indicators: ["NORMAL - xanh", "WARNING - vàng", "ALARM - đỏ", "MAINT - trạng thái bảo dưỡng"],
    controls: ["Màn hình cảm ứng 10,2 inch", "Khóa 3 vị trí LOCAL / REMOTE / MAINT", "Giao tiếp IFB/USB, IFB/Ethernet và RS-232"],
    testPoints: noTestPoints,
    faceplate: "lmi",
  },
  {
    id: "csp",
    shortName: "CSP",
    name: "Control and Status Panel",
    assemblyIds: ["1A1A1"],
    partNumber: "0330-7560",
    description: "Panel điều khiển và trạng thái trung tâm. Mỗi transmitter có năm nút điều khiển và các đèn trạng thái; panel cũng hiển thị monitor, changeover, nguồn và môi trường.",
    manualReference: "Figure 1-6; Figure 3-36 đến Figure 3-38, PDF pages 113-115.",
    cabinetHotspots: [front.csp],
    diagramOccurrences: [occurrence("overview-csp", [front.csp.id]), occurrence("control-csp", [front.csp.id])],
    indicators: ["TX1/TX2 MAIN và ON ANT", "LOAD và FAULT", "MONITOR EXEC/STBY - NORMAL/WARNING/ALARM", "CHANGEOVER, ANT FAULT, INTERLOCKED, AC MAIN, ON BAT, ENVIRONMENT, TxD/RxD"],
    controls: ["MAIN, ON ANT, POWER, ENABLE cho TX1/TX2", "MONITOR BYPASS", "RESET", "LAMP TEST", "SILENCE", "VOLUME dạng vít chỉnh"],
    testPoints: noTestPoints,
    faceplate: "csp",
  },
  {
    id: "scu",
    shortName: "SCU",
    name: "System Controller Unit",
    assemblyIds: ["1A1A4", "1A1A5"],
    partNumber: "0130-7520",
    description: "Hai SCU thực hiện changeover transmitter, trao đổi lệnh/trạng thái với TCU và MON qua CAN, đồng thời nối CSP, LMI, RCU và PMDT.",
    manualReference: "Figure 3-33; Figure 3-39 đến Figure 3-41; Tables 3-5 đến 3-8, PDF pages 115-117.",
    cabinetHotspots: [front.scu1, front.scu2],
    diagramOccurrences: [occurrence("overview-scu", [front.scu1.id, front.scu2.id]), occurrence("control-scu", [front.scu1.id, front.scu2.id])],
    indicators: ["POWER - xanh", "FAULT - đỏ", "MASTER - xanh khi SCU được chọn master"],
    controls: ["RESET - khởi động lại và khởi tạo SCU", "MCU ISP 10-pin", "CPLD ISP 14-pin"],
    testPoints: [
      { id: "TP9", label: "CAN TxD / +5 V rail", description: "Turret terminal trên mặt panel; bảng manual xác định kiểm tra rail +5 V." },
      { id: "TP16", label: "CAN RxD", description: "Turret terminal cho đường nhận CAN TTL." },
    ],
    faceplate: "scu",
    notes: ["Assembly ID vật lý lấy theo Figure 1-6. Phần mô tả Figure 3-1 dùng cách đánh số revision cũ hơn."],
  },
  {
    id: "emu",
    shortName: "EMU",
    name: "Environmental Monitor Unit",
    assemblyIds: ["1A1A6"],
    partNumber: "0130-7540",
    description: "Thu nhận cảm biến nhiệt độ, khói và xâm nhập; đưa trạng thái môi trường về SCU qua CAN và IFB.",
    manualReference: "Figure 1-6; Figure 3-33 và Figure 3-42, PDF pages 110 và 118.",
    cabinetHotspots: [front.emu],
    diagramOccurrences: [occurrence("overview-emu", [front.emu.id]), occurrence("control-emu", [front.emu.id])],
    indicators: ["POWER", "FAULT", "Các trạng thái sensor/environment"],
    controls: ["Đầu vào temperature, smoke và intrusion sensor", "CAN tới SCU", "I2C/terminal block qua IFB"],
    testPoints: noTestPoints,
    faceplate: "emu",
  },
  {
    id: "dcdc-a",
    shortName: "DC/DC-A",
    name: "Auxiliary DC/DC Converter",
    assemblyIds: ["1A1A7", "1A1A8"],
    partNumber: "0130-7720",
    description: "Chuyển đổi nguồn +28 V thành +5 V, +15 V và -15 V cho auxiliary electronics; giám sát dòng/áp và báo BITE về SCU.",
    manualReference: "Figure 3-43 đến Figure 3-45; Tables 3-9 và 3-10, PDF pages 119-120.",
    cabinetHotspots: [front.dcdcA1, front.dcdcA2],
    diagramOccurrences: [occurrence("overview-dcdc-a", [front.dcdcA1.id, front.dcdcA2.id]), occurrence("power-dcdc-a", [front.dcdcA1.id, front.dcdcA2.id])],
    indicators: ["POWER - xanh", "FAULT - đỏ", "BITE OK - xanh theo nhãn vật lý Figure 3-45"],
    controls: noControls,
    testPoints: [
      { id: "+5V_TP", label: "+5 V", description: "Tip jack đỏ kiểm tra rail +5 V." },
      { id: "+15V_TP", label: "+15 V", description: "Tip jack đỏ kiểm tra rail +15 V." },
      { id: "-15V_TP", label: "-15 V", description: "Tip jack đỏ kiểm tra rail -15 V." },
      { id: "GND", label: "Common", description: "Tip jack đen cho mass chung." },
    ],
    faceplate: "dcdc-a",
    notes: ["Table 3-9 gọi LED thứ ba là OUTPUT, nhưng nhãn trực tiếp trên mặt panel Figure 3-45 là BITE OK; explorer ưu tiên nhãn vật lý."],
  },
  {
    id: "modem",
    shortName: "MODEM",
    name: "Communication Modem",
    assemblyIds: ["1A1A9", "1A1A10"],
    partNumber: "0130-7420",
    description: "Hai modem hỗ trợ các đường truyền PMDT/RCU và giao tiếp từ xa thông qua IFB.",
    manualReference: "Figure 1-6; Figure 3-33; Figure 3-46 và Figure 3-47.",
    cabinetHotspots: [front.modem1, front.modem2],
    diagramOccurrences: [occurrence("overview-modem", [front.modem1.id, front.modem2.id]), occurrence("control-modem", [front.modem1.id, front.modem2.id])],
    indicators: ["Power/communication state trên module"],
    controls: ["Modem line tới IFB", "Interface tới SCU/PMDT/RCU"],
    testPoints: noTestPoints,
  },
  {
    id: "ifb",
    shortName: "IFB",
    name: "Interface Board",
    assemblyIds: ["1A7"],
    partNumber: "0130-3410",
    description: "Khối giao tiếp và chống surge tập trung cho LMI, PMDT, RCU, modem, SCU, EMU và các sensor ngoài tủ.",
    manualReference: "Figure 1-8 Rev. A; Figure 3-55 và Figure 3-56, PDF pages 129-130.",
    cabinetHotspots: [rear.ifb],
    diagramOccurrences: [occurrence("overview-ifb", [rear.ifb.id]), occurrence("control-ifb", [rear.ifb.id])],
    indicators: noIndicators,
    controls: ["USB-B", "RJ-45 Ethernet", "DSUB-9 RS-232", "I2C terminal block", "Tip/Ring modem terminal block", "Surge protection"],
    testPoints: noTestPoints,
    faceplate: "ifb",
  },
  {
    id: "dpx-msc",
    shortName: "DPX-MSC",
    name: "Duplexer - Mute Switch - Combiner",
    assemblyIds: ["1A2A1", "1A3A1"],
    partNumber: "0330-7120",
    description: "Hoàn thiện chức năng T/R duplexing cùng circulator, giảm rò TX vào RX và kết hợp các đường monitor/RF theo tuyến transmitter tương ứng.",
    manualReference: "Figure 3-2 đến Figure 3-4; RF path Figure 3-54.",
    cabinetHotspots: [front.tx1Dpx, front.tx2Dpx],
    diagramOccurrences: [
      occurrence("overview-tx1-dpx", [front.tx1Dpx.id]), occurrence("overview-tx2-dpx", [front.tx2Dpx.id]),
      occurrence("txrf-tx1-dpx", [front.tx1Dpx.id]), occurrence("txrf-tx2-dpx", [front.tx2Dpx.id]),
    ],
    indicators: noIndicators,
    controls: ["TX input/output", "RX path", "RFG 1/RFG 2 monitor paths", "Mute switch/combiner"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "rxu",
    shortName: "RXU",
    name: "Receiver Unit",
    assemblyIds: ["1A2A2", "1A3A2"],
    partNumber: "0330-7180",
    description: "Thu và xử lý interrogation, tạo các tín hiệu log-video/detect đưa tới TCU để xác nhận interrogation hợp lệ.",
    manualReference: "Figure 3-5 đến Figure 3-8, PDF pages 86-89.",
    cabinetHotspots: [front.tx1Rxu, front.tx2Rxu],
    diagramOccurrences: [
      occurrence("overview-tx1-rxu", [front.tx1Rxu.id]), occurrence("overview-tx2-rxu", [front.tx2Rxu.id]),
      occurrence("txrf-tx1-rxu", [front.tx1Rxu.id]), occurrence("txrf-tx2-rxu", [front.tx2Rxu.id]),
    ],
    indicators: ["POWER - xanh", "PULSES - xanh khi có pulse"],
    controls: noControls,
    testPoints: [
      { id: "LOG VIDEO WIDE", label: "Log Video Wide", description: "BNC test connector." },
      { id: "ON CH DET", label: "On Channel Detected", description: "BNC test connector." },
      { id: "LOG VIDEO", label: "Log Video (Normal)", description: "BNC test connector." },
    ],
    faceplate: "rxu",
  },
  {
    id: "hpa",
    shortName: "HPA",
    name: "High Power Amplifier",
    assemblyIds: ["1A2A3", "1A3A3"],
    partNumber: "0330-7150",
    description: "Khuếch đại RF công suất cao của cấu hình DME 320. Mạch bảo vệ phản xạ và nhiệt độ khóa pulse modulation để bảo vệ tầng công suất.",
    manualReference: "Figure 3-9 đến Figure 3-11, PDF pages 90-92; cấu hình high-power Figure 3-2.",
    cabinetHotspots: [front.tx1Hpa, front.tx2Hpa],
    diagramOccurrences: [
      occurrence("overview-tx1-hpa", [front.tx1Hpa.id]), occurrence("overview-tx2-hpa", [front.tx2Hpa.id]),
      occurrence("txrf-tx1-hpa", [front.tx1Hpa.id]), occurrence("txrf-tx2-hpa", [front.tx2Hpa.id]),
    ],
    indicators: ["POWER - xanh", "RF ON - xanh", "RVS FAULT - đỏ"],
    controls: ["RF input từ TXU", "RF output tới circulator/DPX-MSC", "Temperature và reverse-power protection"],
    testPoints: [{ id: "REPLY ENV", label: "Detected Video", description: "BNC connector cho envelope reply đã detect." }],
    faceplate: "hpa",
    notes: ["Trang này cố định cấu hình DME 320 high-power; không dùng tuyến TXU/J2 trực tiếp của DME 310.", "Figure 1-6 ghi P/N 0330-7150; Figure 3-1/3-2 của revision kỹ thuật mới hơn ghi 0332-7150. Faceplate giữ nhãn cabinet để khớp vị trí vật lý."],
  },
  {
    id: "txu",
    shortName: "TXU",
    name: "Transmitter Unit",
    assemblyIds: ["1A2A4", "1A3A4"],
    partNumber: "0330-7140",
    description: "Sinh carrier reference, binary modulation, LO cho RXU và điều khiển công suất. Với DME 320, TXU đưa khoảng +46,2 dBm tới HPA.",
    manualReference: "Figure 3-12 đến Figure 3-15, PDF pages 93-97.",
    cabinetHotspots: [front.tx1Txu, front.tx2Txu],
    diagramOccurrences: [
      occurrence("overview-tx1-txu", [front.tx1Txu.id]), occurrence("overview-tx2-txu", [front.tx2Txu.id]),
      occurrence("txrf-tx1-txu", [front.tx1Txu.id]), occurrence("txrf-tx2-txu", [front.tx2Txu.id]),
    ],
    indicators: ["POWER - xanh", "RF ON - xanh", "PLL FAIL - đỏ", "TXU FAULT - đỏ"],
    controls: ["PLL 960-1215 MHz, bước 0,1 MHz", "AGC output", "Reverse-power và over-temperature shutdown"],
    testPoints: [
      { id: "DETECTED VIDEO", label: "Detected Video", description: "BNC connector đo envelope output." },
      { id: "FREQ.", label: "Transmit Frequency", description: "BNC connector đo tần số phát." },
    ],
    faceplate: "txu",
  },
  {
    id: "dcdc",
    shortName: "DC/DC",
    name: "Transponder DC/DC Converter",
    assemblyIds: ["1A2A5", "1A3A5"],
    partNumber: "0330-7710",
    description: "Tạo các rail nguồn cho transponder/monitor, bao gồm +5 V, +8 V, ±15 V, +28 V và +50 V; hỗ trợ BITE và chỉnh +28/+50 V.",
    manualReference: "Figure 3-16 đến Figure 3-18; Tables 3-1 đến 3-3, PDF pages 98-99.",
    cabinetHotspots: [front.tx1Dcdc, front.tx2Dcdc],
    diagramOccurrences: [
      occurrence("overview-tx1-dcdc", [front.tx1Dcdc.id]), occurrence("overview-tx2-dcdc", [front.tx2Dcdc.id]),
      occurrence("power-dcdc-1", [front.tx1Dcdc.id]), occurrence("power-dcdc-2", [front.tx2Dcdc.id]),
    ],
    indicators: ["POWER - xanh", "FAULT - đỏ", "BITE OK - xanh"],
    controls: ["ADJ1 - chỉnh +28 V", "ADJ2 - chỉnh +50 V"],
    testPoints: [
      { id: "+5V_TP", label: "+5 V", description: "Tip jack đỏ." },
      { id: "+8V_TP", label: "+8 V", description: "Tip jack đỏ." },
      { id: "+15V_TP", label: "+15 V", description: "Tip jack đỏ." },
      { id: "-15V_TP", label: "-15 V", description: "Tip jack đỏ." },
      { id: "+28V_TP", label: "+28 V", description: "Tip jack đỏ." },
      { id: "+50V_TP", label: "+50 V", description: "Tip jack đỏ." },
      { id: "GND", label: "Common", description: "Tip jack đen." },
    ],
    faceplate: "dcdc",
  },
  {
    id: "tcu",
    shortName: "TCU",
    name: "Transponder Control Unit",
    assemblyIds: ["1A2A6", "1A3A6"],
    partNumber: "0130-7570",
    description: "Điều khiển receiver/transmitter, tạo timing Gaussian/rectangular/identity/squitter và nạp dữ liệu tần số cho PLL TXU/RXU.",
    manualReference: "Figure 3-19 đến Figure 3-21, PDF pages 100-102.",
    cabinetHotspots: [front.tx1Tcu, front.tx2Tcu],
    diagramOccurrences: [
      occurrence("overview-tx1-tcu", [front.tx1Tcu.id]), occurrence("overview-tx2-tcu", [front.tx2Tcu.id]),
      occurrence("txrf-tx1-tcu", [front.tx1Tcu.id]), occurrence("txrf-tx2-tcu", [front.tx2Tcu.id]),
      occurrence("control-tcu", [front.tx1Tcu.id, front.tx2Tcu.id]),
    ],
    indicators: ["POWER - xanh", "TCU FAULT - đỏ", "CW ALERT - vàng"],
    controls: ["RESET", "MCU ISP 14-pin", "FPGA ISP 10-pin"],
    testPoints: [
      { id: "TOA PULSE", label: "TOA Pulse", description: "Test point timing time-of-arrival." },
      { id: "DECODED", label: "Decoded", description: "Test point pulse đã decode." },
      { id: "DEAD TIME", label: "Dead Time", description: "Test point khoảng dead time." },
      { id: "GAUSSIAN PULSE", label: "Gaussian Pulse", description: "Test point waveform điều chế Gaussian." },
      { id: "RECTANGULAR PULSE", label: "Rectangular Pulse", description: "Test point pulse chữ nhật." },
      { id: "ID PULSE", label: "Identity Pulse", description: "Test point pulse nhận dạng." },
    ],
    faceplate: "tcu",
    notes: ["Figure 1-6 ghi P/N 0130-7570 trong khi Figure 3-1/3-2 ghi 0330-7570; explorer giữ nhãn cabinet vật lý."],
  },
  {
    id: "fan",
    shortName: "FAN",
    name: "Transponder Cooling Fan Unit",
    assemblyIds: ["1A2A9", "1A3A9"],
    partNumber: "0130-7910",
    description: "Tạo luồng khí làm mát cho từng transponder subrack và đưa trạng thái quạt về hệ thống giám sát.",
    manualReference: "Figure 3-22 và Figure 3-23, PDF page 103.",
    cabinetHotspots: [front.tx1Fan, front.tx2Fan],
    diagramOccurrences: [occurrence("overview-fan", [front.tx1Fan.id, front.tx2Fan.id]), occurrence("power-fan", [front.tx1Fan.id, front.tx2Fan.id])],
    indicators: ["POWER", "FAN status/fault"],
    controls: ["Cooling airflow for TXP1/TXP2 subracks"],
    testPoints: noTestPoints,
    faceplate: "fan",
  },
  {
    id: "mon",
    shortName: "MON",
    name: "Monitor Unit - Rev. D or later",
    assemblyIds: ["1A2A8", "1A3A8"],
    partNumber: "0130-7550",
    description: "Mỗi MON giám sát cả hai transmitter: system delay, reply efficiency, frequency, pulse shape, power/VSWR, identification và integrity; báo alarm qua SCU/CSP.",
    manualReference: "Figure 3-24 đến Figure 3-29; dùng panel Rev. D or later tại PDF page 106.",
    cabinetHotspots: [front.tx1Mon, front.tx2Mon],
    diagramOccurrences: [
      occurrence("overview-mon1", [front.tx1Mon.id]), occurrence("overview-mon2", [front.tx2Mon.id]),
      occurrence("monitor-mon1", [front.tx1Mon.id]), occurrence("monitor-mon2", [front.tx2Mon.id]),
    ],
    indicators: ["POWER - xanh", "MON FAULT - đỏ", "ALARM - đỏ, nhấp nháy khi standby monitor alarm", "WARNING - vàng", "INTEGRITY - đỏ", "ANTENNA FAULT - đỏ"],
    controls: ["RESET", "MCU ISP 14-pin", "FPGA ISP 10-pin"],
    testPoints: [
      { id: "FPGA STATUS", label: "FPGA Status", description: "Test point trên panel Rev. D+." },
      { id: "MCU STATUS", label: "MCU Status", description: "Test point trên panel Rev. D+." },
      { id: "INTG PULSE", label: "Integrity Pulse", description: "Test point integrity." },
      { id: "INPUT ENVELOPE", label: "Input Envelope", description: "Test point envelope từ RF detector/RFG." },
      { id: "INTERROGATION TRIGGER", label: "Interrogation Trigger", description: "Trigger dùng cùng reply trigger khi đo system delay.", waveforms: [systemDelayWaveform] },
      { id: "IDENT", label: "Identification", description: "Test point identification pulse." },
    ],
    faceplate: "mon",
    notes: ["Figure 3-24 ghi nhầm MON1 là 1A2A6; Figure 1-6 và các phần cabinet xác nhận MON1 = 1A2A8. Figure 1-6 ghi P/N 0130-7550, còn Figure 3-1/3-24 ghi 0330-7550."],
  },
  {
    id: "rfg",
    shortName: "RFG",
    name: "RF Generator",
    assemblyIds: ["1A2A7", "1A3A7"],
    partNumber: "0330-7190",
    description: "Tạo và chuyển mạch các tín hiệu RF interrogation/calibration/response cho MON; cung cấp detector và reference 68 MHz.",
    manualReference: "Figure 3-30 đến Figure 3-32, PDF pages 107-109.",
    cabinetHotspots: [front.tx1Rfg, front.tx2Rfg],
    diagramOccurrences: [
      occurrence("overview-rfg1", [front.tx1Rfg.id]), occurrence("overview-rfg2", [front.tx2Rfg.id]),
      occurrence("monitor-rfg1", [front.tx1Rfg.id]), occurrence("monitor-rfg2", [front.tx2Rfg.id]),
    ],
    indicators: ["POWER - xanh", "RF ON - xanh", "PLL FAIL - đỏ"],
    controls: ["RF switching do MON điều khiển", "Calibration và interrogation output"],
    testPoints: [
      { id: "68 MHz OSC", label: "68 MHz oscillator frequency", description: "BNC connector." },
      { id: "PULSE DETECT", label: "Pulse Detect", description: "Test point pulse detect." },
      { id: "RFG FREQ.", label: "RFG Frequency", description: "BNC connector." },
    ],
    faceplate: "rfg",
    notes: ["Mặt panel Figure 3-32 ghi 68 MHz OSC; phần văn bản liền kề có chỗ ghi 63 MHz. Explorer ưu tiên nhãn vật lý 68 MHz."],
  },
  {
    id: "rf-detector",
    shortName: "RF DET",
    name: "RF Detector",
    assemblyIds: ["1A9", "1A10"],
    partNumber: "0330-7330",
    description: "Hai detector lấy mẫu tuyến antenna và đưa envelope riêng về MON1/MON2 để giám sát tín hiệu phát thực tế.",
    manualReference: "Figure 3-1; Figure 3-24; Figure 3-54; Figure 1-8 Rev. A.",
    cabinetHotspots: [rear.rfDetector1, rear.rfDetector2],
    diagramOccurrences: [occurrence("overview-rf-detectors", [rear.rfDetector1.id, rear.rfDetector2.id]), occurrence("monitor-rf-detectors", [rear.rfDetector1.id, rear.rfDetector2.id])],
    indicators: noIndicators,
    controls: ["RF sample from antenna path", "Detected envelope outputs to MON1/MON2"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
    notes: ["Figure 3-54 và section 3.6.8 mâu thuẫn về việc 1A9/1A10 nối MON1 hay MON2; vì cả hai monitor đều giám sát cả hai transmitter, explorer chọn đồng thời cặp detector thay vì suy diễn one-to-one."],
  },
  {
    id: "pmu",
    shortName: "PMU",
    name: "Power Monitoring Unit",
    assemblyIds: ["1A4A1", "1A4A2"],
    partNumber: "0130-7730",
    description: "Hai PMU quản lý nguồn, giám sát AC/DC và battery, thực hiện OR-ing/backup và hiển thị điện áp, dòng, nhiệt độ trên LED 7 đoạn.",
    manualReference: "Figure 3-48 đến Figure 3-52; Tables 3-11 đến 3-13, PDF pages 122-126.",
    cabinetHotspots: [front.pmu1, front.pmu2],
    diagramOccurrences: [occurrence("overview-pmu", [front.pmu1.id, front.pmu2.id]), occurrence("power-pmu", [front.pmu1.id, front.pmu2.id])],
    indicators: ["Display xanh 4 digit", "AC FAIL - đỏ", "ON BATT - vàng", "CHARGING - vàng"],
    controls: ["TEMP", "DC V", "DC I", "BATT V", "BATT I"],
    testPoints: [
      { id: "+5V_TP", label: "+5 V", description: "Tip jack đỏ." },
      { id: "+15V_TP", label: "+15 V", description: "Tip jack đỏ." },
      { id: "-15V_TP", label: "-15 V", description: "Tip jack đỏ." },
      { id: "GND", label: "Common", description: "Tip jack đen." },
    ],
    faceplate: "pmu",
  },
  {
    id: "acdc",
    shortName: "AC/DC",
    name: "AC/DC Power Supply Unit",
    assemblyIds: ["1A5A1", "1A5A2"],
    partNumber: "3151-0016",
    description: "Nguồn COTS chuyển đổi 110/220 VAC thành 28 VDC, cấp rail chính và nạp battery; có bảo vệ quá áp/quá dòng.",
    manualReference: "Figure 3-48 và Figure 3-53, PDF pages 122 và 127.",
    cabinetHotspots: [front.acdc1, front.acdc2],
    diagramOccurrences: [occurrence("overview-acdc", [front.acdc1.id, front.acdc2.id]), occurrence("power-acdc", [front.acdc1.id, front.acdc2.id])],
    indicators: ["AC AVAILABLE"],
    controls: ["AC MAIN switch", "AC input", "28 VDC output to PMU"],
    testPoints: noTestPoints,
    faceplate: "acdc",
    notes: ["Figure 1-6 và section 3.1.5 xác nhận hai AC/DC 1A5A1/A2 được lắp. Figure 3-48 thể hiện thêm một block dự phòng bằng nét đứt; cabinet explorer chỉ dựng hai unit vật lý."],
  },
  {
    id: "battery",
    shortName: "BAT",
    name: "Backup Batteries",
    assemblyIds: [],
    description: "Hai battery được float-charge qua PMU và lập tức giữ rail 28 VDC khi mất AC mains.",
    manualReference: "Figure 3-48; PMU description section 3.5.2.",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-battery"), occurrence("power-battery")],
    indicators: noIndicators,
    controls: ["BATT 1/BATT 2 switch tại PMU subrack"],
    testPoints: noTestPoints,
  },
  {
    id: "circulator",
    shortName: "CIRC",
    name: "RF Circulator",
    assemblyIds: ["1CIR1", "1CIR2"],
    partNumber: "3152-0078",
    description: "Thực hiện T/R duplexing chính: chuyển RF từ TXU/HPA tới antenna path và interrogation từ antenna về DPX-MSC/RXU.",
    manualReference: "Figure 1-8 Rev. A; Figure 3-54 và Figure 3-57.",
    cabinetHotspots: [rear.circulator1, rear.circulator2],
    diagramOccurrences: [occurrence("txrf-circulator1", [rear.circulator1.id]), occurrence("txrf-circulator2", [rear.circulator2.id])],
    indicators: noIndicators,
    controls: ["TX input", "Antenna/common port", "RX/DPX-MSC port"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "directional-coupler",
    shortName: "COUPLER",
    name: "Directional Coupler",
    assemblyIds: ["1DC1", "1DC2", "1DC3"],
    partNumber: "3152-0102",
    description: "Lấy mẫu công suất forward/reflected cho RXU, monitor và VSWR; 1DC3 là coupler 27 dB trên tuyến chung antenna.",
    manualReference: "Figure 1-8 Rev. A; Figure 3-54 và Figure 3-58.",
    cabinetHotspots: [rear.coupler1, rear.coupler2, rear.coupler3],
    diagramOccurrences: [
      occurrence("txrf-coupler1", [rear.coupler1.id]), occurrence("txrf-coupler2", [rear.coupler2.id]),
      occurrence("txrf-coupler3", [rear.coupler3.id]), occurrence("monitor-couplers", [rear.coupler1.id, rear.coupler2.id, rear.coupler3.id]),
    ],
    indicators: noIndicators,
    controls: ["27 dB sample ports", "Forward/reflected sampling"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "coaxial-relay",
    shortName: "DPDT",
    name: "Coaxial Changeover Relay",
    assemblyIds: ["1RY1"],
    partNumber: "3152-0083",
    description: "Relay DPDT chọn tuyến transmitter chính tới antenna hoặc dummy load theo lệnh changeover của SCU.",
    manualReference: "Figure 1-8 Rev. A và Figure 3-54.",
    cabinetHotspots: [rear.relay],
    diagramOccurrences: [occurrence("overview-relay", [rear.relay.id]), occurrence("txrf-relay", [rear.relay.id])],
    indicators: noIndicators,
    controls: ["Changeover control từ SCU", "TX1/TX2 antenna/load routing"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "dummy-load",
    shortName: "LOAD",
    name: "RF Termination / Dummy Load",
    assemblyIds: ["1RT1"],
    partNumber: "3152-0101",
    description: "Tải giả nhận RF của transmitter standby hoặc tuyến không được chọn bởi coaxial relay.",
    manualReference: "Figure 1-8 Rev. A và Figure 3-54.",
    cabinetHotspots: [rear.dummyLoad],
    diagramOccurrences: [occurrence("txrf-dummy-load", [rear.dummyLoad.id])],
    indicators: noIndicators,
    controls: ["RF termination path from DPDT relay"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "lpf",
    shortName: "LPF",
    name: "Low Pass Filter",
    assemblyIds: ["1FL1"],
    partNumber: "3139-0079",
    description: "Lọc hài trên tuyến RF chung trước antenna và VSWR monitor.",
    manualReference: "Figure 1-8 Rev. A; Figure 3-54 và Figure 3-61.",
    cabinetHotspots: [rear.lpf],
    diagramOccurrences: [occurrence("txrf-lpf", [rear.lpf.id])],
    indicators: noIndicators,
    controls: ["RF input/output"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "vswr-monitor",
    shortName: "VSWR",
    name: "VSWR Monitor",
    assemblyIds: ["1A8"],
    partNumber: "0130-7310",
    description: "So sánh mẫu forward/reflected từ directional coupler và cung cấp hai đường giám sát riêng tới MON1/MON2.",
    manualReference: "Figure 1-8 Rev. A; Figure 3-54; Figure 3-59 và Figure 3-60.",
    cabinetHotspots: [rear.vswr],
    diagramOccurrences: [occurrence("overview-vswr", [rear.vswr.id]), occurrence("txrf-vswr", [rear.vswr.id]), occurrence("monitor-vswr", [rear.vswr.id])],
    indicators: ["VSWR/alarm status đưa tới monitor"],
    controls: ["Forward sample input", "Reflected sample input", "MON1/MON2 outputs"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "lightning-arrester",
    shortName: "ARRESTER",
    name: "Lightning Arrester",
    assemblyIds: ["1AR1"],
    description: "Bảo vệ xung sét trên tuyến RF ngay trước cáp antenna.",
    manualReference: "Figure 3-54.",
    cabinetHotspots: [rear.lightning],
    diagramOccurrences: [occurrence("txrf-lightning", [rear.lightning.id])],
    indicators: noIndicators,
    controls: ["RF in/out và earth bonding"],
    testPoints: noTestPoints,
    faceplate: "rear-rf",
  },
  {
    id: "antenna",
    shortName: "ANT",
    name: "DME Antenna",
    assemblyIds: [],
    description: "Antenna chung phát reply và thu interrogation; mẫu RF được đưa qua detector/VSWR tới cả hai monitor.",
    manualReference: "Figure 3-1 và Figure 3-54.",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("overview-antenna"), occurrence("txrf-antenna"), occurrence("monitor-antenna")],
    indicators: noIndicators,
    controls: ["Common RF feeder"],
    testPoints: noTestPoints,
  },
];

export const DME_320_BLOCK_BY_ID = new Map(
  DME_320_BLOCKS.map((block) => [block.id, block] as const),
);

export const DME_320_COMPONENT_TO_BLOCK = new Map(
  DME_320_BLOCKS.flatMap((block) =>
    block.diagramOccurrences.map((item) => [item.componentId, block.id] as const),
  ),
);

export const DME_320_HOTSPOT_TO_BLOCK = new Map(
  DME_320_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.map((item) => [item.id, block.id] as const),
  ),
);
