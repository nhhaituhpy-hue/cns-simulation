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
  /** Setup observed in this capture, not the procedure or a signal limit. */
  scopeSettings?: readonly string[];
  /** Static screenshot readouts, never live telemetry or tolerances. */
  observedReadings?: readonly string[];
}

export interface Dme320TestPoint {
  id: string;
  label: string;
  description: string;
  signalType?: string;
  nominal?: string;
  tolerance?: string;
  instrument?: string;
  conditions?: readonly string[];
  source?: string;
  waveforms?: readonly Dme320WaveformReference[];
}

export interface Dme320AdjustmentReference {
  id: string;
  label: string;
  control: string;
  instrument: string;
  target: string;
  conditions: readonly string[];
  source: string;
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
  adjustments?: readonly Dme320AdjustmentReference[];
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
  alt: "Ảnh manual: LOG VIDEO tại RXU trên CH1, hai cặp interrogation/reply khi RF loopback On; CH2 là trigger từ MON",
  caption: "RXU LOG VIDEO — CH1, interrogation/reply khi loopback; ảnh tham chiếu một phép đo, không phải waveform của pin trigger MON",
  source: "MOPIENS 310/320 DME Technical Manual, Figure 6-4, trang 6-8 (PDF 294), Rev. B/2019-08-19; đấu đo tại PDF 291–293.",
  scopeSettings: ["Ảnh: Diagram2: Ch1 / Ch1Wfm1; 10 µs/div; 1 V/div; DC 1 MΩ.", "Ảnh: Trigger Auto / Edge, source Ch2. Thủ tục PDF 293 yêu cầu Single, 2 V/div: không đồng nhất setup ảnh với thủ tục."],
  observedReadings: ["Cursor t1 = 4.32 µs; t2 = 54.32 µs; Δt = 50 µs; 1/Δt = 20 kHz (nghịch đảo khoảng cursor, không phải PRF).", "V1 = 4.8435 V; V2 = 7.6453 V; ΔV = 2.8018 V. Chỉ là số đọc trên ảnh, không phải nominal/dung sai hoặc số đo live."],
};

const noIndicators: readonly string[] = [];
const noControls: readonly string[] = [];
const noTestPoints: readonly Dme320TestPoint[] = [];

const powerRail = (id: string, label: string, tolerance: string, source: string): Dme320TestPoint => ({
  id, label,
  description: "2 mm tip jack đỏ; đo điện áp rail so với GND của chính module.",
  signalType: "Điện áp DC", nominal: `${label}DC`, tolerance,
  instrument: "DMM/DVM và test leads (§6.5.9)",
  conditions: ["Đầu đen vào GND, đầu đỏ vào tip jack rail; đo riêng từng module/TX.",
    ...(id === "+28V_TP" ? ["Bảng DC/DC tại PDF 310 không có hàng +28 V; ±1.4 V thuộc AC/DC VOLT trên PMU, không chuyển sang rail này."] : [])],
  source,
});

const commonPoint = (source: string): Dme320TestPoint => ({
  id: "GND", label: "Common (GND)", description: "Điểm common của module; không phải một rail cấp nguồn độc lập.",
  signalType: "Mass tham chiếu", nominal: "Tham chiếu cho phép đo, không phải số đọc live",
  tolerance: "Không áp dụng; không có dung sai GND riêng trong nguồn",
  instrument: "DMM/DVM: đầu đo âm; không có phép đo GND độc lập được chỉ định",
  conditions: ["Dùng GND của chính module theo thủ tục đo nguồn; không suy ra điện áp earth/chassis."], source,
});

const auxiliaryPowerSource = "MOPIENS 310/320 DME Technical Manual, Table 3-10 / Figure 3-45, trang 3-40 (PDF 120), Rev. B/2022-05-10; §6.5.9, trang 6-24–6-26 (PDF 310–312), Rev. B/2019-08-19.";
const transponderPowerSource = "MOPIENS 310/320 DME Technical Manual, Tables 3-2/3-3 / Figure 3-18, trang 3-19 (PDF 99), Rev. B/2022-05-10; §6.5.9, trang 6-24–6-27 (PDF 310–313), Rev. B/2019-08-19.";
const pmuPowerSource = "MOPIENS 310/320 DME Technical Manual, §6.5.9 / Figure 6-16, trang 6-24–6-26 (PDF 310–312), Rev. B/2019-08-19; mâu thuẫn Table 3-13, trang 3-46 (PDF 126), Rev. B/2022-05-10.";

const undocumentedPoint = (id: string, label: string, description: string, signalType: string, source: string): Dme320TestPoint => ({
  id, label, description, signalType,
  nominal: "Chưa có nominal được xác minh tại điểm này",
  tolerance: "Chưa có dung sai được xác minh tại điểm này",
  instrument: "Oscilloscope và probe phù hợp tín hiệu; manual không chỉ định máy đo/setup riêng tại điểm này",
  conditions: ["Chỉ xác minh định danh/chức năng theo nguồn; không suy từ tên tín hiệu ra mức điện áp, thời gian hoặc dạng sóng chuẩn."], source,
});

const tcuPointSource = "MOPIENS 310/320 DME Technical Manual, Figure 3-21, trang 3-22 (PDF 102), Rev. B/2022-05-10.";
const monitorPointSource = "MOPIENS 310/320 DME Technical Manual, Figure 3-29 (MON Rev. D or later), trang 3-26 (PDF 106), Rev. B/2022-05-10.";
const rfgPointSource = "MOPIENS 310/320 DME Technical Manual, Figure 3-32, trang 3-29 (PDF 109), Rev. B/2022-05-10; mô tả §3.3.3, trang 3-27–3-28 (PDF 107–108).";

const readonlyReference = "Chỉ đọc: mô tả manual phục vụ đào tạo; không chạy Run/Apply, thay cấu hình, nối thiết bị thật hoặc ghi engine/store từ sơ đồ.";
const calibrationSource = "MOPIENS 310/320 DME Technical Manual, §4.4.7.1 Calibration, trang 4-80–4-88 (PDF 222–230), Rev. B/2019-08-19.";
const calibrationContext = [readonlyReference, "Theo wizard Maintenance → Calibration → Start. Setup Figure 4-98/PDF 223 liệt kê peak sensor R&S ERP-Z81 hoặc tương đương, attenuator 50 dB/50 Ω/250 W, coupler 30 dB và cáp N 50 Ω có loss đã biết; không coi đây là hệ số coupling chung cho mọi tuyến.", "Kết thúc một transponder: Changeover rồi lặp đủ quy trình cho transponder còn lại (PDF 230). Không suy giới hạn từ các số mẫu trong screenshot hoặc tự dựng hàm calibration."] as const;
const calibrationReferences: readonly Dme320AdjustmentReference[] = [
  {
    id: "calibration-step-1", label: "Step 1 — Transmitter Drive Level Optimization",
    control: "PMDT Maintenance → Calibration → Start → Step 1 → Run",
    instrument: "PMDT; setup calibration Figure 4-98, không nêu máy đo/giới hạn riêng cho Step 1",
    target: "Hoàn tất drive-level optimization, xác nhận green tick; chưa có giới hạn drive-level số được xác minh",
    conditions: calibrationContext, source: `${calibrationSource} Figures 4-99/4-100, trang 4-82–4-83 (PDF 224–225).`,
  },
  {
    id: "calibration-step-2", label: "Step 2 — Transmitter Power Output Calibration",
    control: "PMDT Calibration → Step 2 → Calibration (W) → Run; Initialize nếu cần",
    instrument: "Precision peak power meter; setup Figure 4-98/PDF 223",
    target: "Nhập công suất peak đo thực (W) để tính internal scale factor; không nhập nominal thay measurement",
    conditions: [...calibrationContext, "So với setting Station Setup → Basic → Power Output: thường 1000 W cho DME 320, 100 W cho DME 310; không mặc định 100 W của ảnh cho DME 320.", "Trong ±5% của setting có thể Skip Step 2. ±5% là điều kiện skip calibration, khác ±1 dB của RF power maintenance check."],
    source: `${calibrationSource} Figure 4-101 / Table 4-25, trang 4-83 (PDF 225).`,
  },
  {
    id: "calibration-step-3", label: "Step 3 — Transponder Processing Delay Compensation",
    control: "PMDT Calibration → Step 3 → Calibration (µs) → Run; Initialize nếu cần",
    instrument: "Accurate oscilloscope; RXU LOG VIDEO với MON trigger theo §6.5.2",
    target: "Nhập sai lệch so Current Setpoint, không phải toàn bộ delay đo. Ví dụ manual: setpoint 50.5 µs, đo 50.6 µs → error 0.1 µs",
    conditions: [...calibrationContext, "Chỉ thực hiện Step 3 khi Step 1 hoặc Step 2 đã thực hiện; Step 3 dành cho manual compensation, thường có thể bỏ để dùng auto.", "Current Setpoint gồm nominal X 50 µs / Y 56 µs và Delay Offset tại Station Setup. Đo chính xác trước khi tính compensation; không phát minh hàm truyền hoặc phạm vi của factor."],
    source: `${calibrationSource} Figures 4-102/4-103 / Table 4-26, trang 4-83–4-85 (PDF 225–227); §6.5.2, PDF 291–294.`,
  },
  {
    id: "calibration-step-4", label: "Step 4 — Auto Time Delay Calibration",
    control: "PMDT Calibration → Step 4 → Run",
    instrument: "PMDT / mạch calibration nội bộ; không nêu máy đo ngoài riêng cho bước này",
    target: "Tự bù internal delay; chờ green tick trước khi tiếp tục, không có giới hạn factor được công bố ở bước này",
    conditions: [...calibrationContext, "Bắt buộc chạy Step 4 nếu Step 3 đã Skip; không coi nút Skip trên ảnh là cho phép bỏ cả hai bước."],
    source: `${calibrationSource} Figure 4-104, trang 4-85 (PDF 227).`,
  },
  {
    id: "calibration-step-5", label: "Step 5 — Monitor Interrogation Level Calibration",
    control: "PMDT Calibration → Step 5 → MON1 Run, MON2 Run",
    instrument: "PMDT / internal calibration; không nêu máy đo ngoài riêng cho bước này",
    target: "Run lần lượt MON1 và MON2, xác nhận green ticks; chưa có nominal/dung sai factor được xác minh",
    conditions: calibrationContext, source: `${calibrationSource} Figure 4-105, trang 4-85 (PDF 227).`,
  },
  {
    id: "calibration-step-6", label: "Step 6 — Time Delay Monitor Reading Calibration",
    control: "PMDT Calibration → Step 6 → MON1 Run, MON2 Run",
    instrument: "PMDT / internal calibration; không nêu máy đo ngoài riêng cho bước này",
    target: "Hiệu chuẩn số đọc MON1/MON2, chờ green ticks; không đồng nhất với processing-delay compensation Step 3/4",
    conditions: calibrationContext, source: `${calibrationSource} Figure 4-106, trang 4-86 (PDF 228).`,
  },
  {
    id: "calibration-step-7", label: "Step 7 — ERP Monitor Reading Calibration",
    control: "PMDT Calibration → Step 7 → MON1 Run, MON2 Run",
    instrument: "PMDT và antenna phù hợp có hai monitor ports",
    target: "Hiệu chuẩn số đọc ERP của MON1/MON2, xác nhận green ticks; không có target W cố định trong bước này",
    conditions: [...calibrationContext, "Phải có antenna phù hợp với hai monitor port nối tới thiết bị trước khi Run lần lượt hai MON."],
    source: `${calibrationSource} Figure 4-107, trang 4-86 (PDF 228).`,
  },
  {
    id: "calibration-step-8", label: "Step 8 — VSWR Monitor Reading Calibration",
    control: "PMDT Calibration → Step 8 → Load/Open → MON1 Run, MON2 Run",
    instrument: "PMDT; tải 50 Ω phù hợp; setup theo manual đầy đủ",
    target: "Hiệu chuẩn MON1/MON2 ở Load rồi Open, xác nhận green ticks; không gán VSWR giả cho số đọc",
    conditions: [...calibrationContext, "Manual dùng 50 Ω Load và Open; không thực hiện Short trong quy trình này.", "Làm từng MON ở mỗi điều kiện; sau Open nối lại antenna feeder trước bước tiếp theo.", "Checkbox RF off được mô tả là có thể thử nhưng không bảo đảm luôn hoạt động. Đây không phải hướng dẫn thao tác RF công suất cao thực tế qua simulator."],
    source: `${calibrationSource} Figure 4-108, trang 4-86–4-87 (PDF 228–229).`,
  },
  {
    id: "calibration-step-9", label: "Step 9 — Power Output Monitor Reading Calibration",
    control: "PMDT Calibration → Step 9 → MON1/MON2 Peak Power (W) → Run",
    instrument: "Accurate peak power meter; setup Figure 4-98/PDF 223",
    target: "So số đọc MON1/MON2 với peak power đo thực; nhập giá trị thực (W) để hiệu chuẩn internal scale factor của số đọc monitor",
    conditions: [...calibrationContext, "Thực hiện cả MON1 và MON2 nếu số đọc không chính xác; không nhầm Step 9 reading calibration với Step 2 transmitter output calibration.", "Table 4-27 không nêu dung sai số đọc, không lấy factor 0.48/0.51 trên ảnh làm giới hạn hoặc hàm truyền."],
    source: `${calibrationSource} Figure 4-109 / Table 4-27, trang 4-87–4-88 (PDF 229–230).`,
  },
  {
    id: "calibration-step-10", label: "Step 10 — Receiver Threshold Calibration",
    control: "PMDT Calibration → Step 10 → Monitor MON1/Run, MON2/Run → Next",
    instrument: "PMDT / internal receiver-threshold calibration; không nêu máy đo ngoài riêng cho bước này",
    target: "Current Setpoint là Receiver Sensitivity Level cấu hình tại Station Setup; Run hai MON, chờ green ticks rồi Next",
    conditions: [...calibrationContext, "Ảnh Figure 4-110 nói calibration chỉ khả dụng ở Standby TXP và thực hiện Changeover; không hiểu screenshot TXP2/-81 dBm là mặc định DME 320.", "DME 320 sensitivity tham chiếu -91 dBm; giá trị -81 dBm trên ảnh là low-power, không phải chuẩn high-power."],
    source: `${calibrationSource} Figure 4-110 / Table 4-28, trang 4-88 (PDF 230); startup §9.6, trang 9-8 (PDF 402).`,
  },
];

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
    adjustments: calibrationReferences,
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
      {
        id: "TP9", label: "CAN TxD (TTL)",
        description: "Test pin/turret terminal: CAN TxD theo Figure 3-41, không xác nhận là rail nguồn.",
        signalType: "CAN TxD, TTL theo hình; chức năng mâu thuẫn với bảng",
        instrument: "Oscilloscope và probe phù hợp tín hiệu logic; manual không chỉ định model cho pin này",
        nominal: "Chưa xác minh mức điện áp logic",
        tolerance: "Chưa có dung sai được xác minh",
        conditions: ["Figure 3-41 ghi CAN TxD, TTL; Table 3-7 lại ghi DC +5 V rail tại TP9. Không dùng nhãn +5 V làm chuẩn đo cho pin CAN.", "Xác nhận revision/schematic của SCU trước khi nối máy đo; không đồng nhất TxD TTL với CAN-H/CAN-L."],
        source: "MOPIENS 310/320 DME Technical Manual, Figure 3-41 và Table 3-7, trang 3-37 (PDF 117), Rev. B/2022-05-10.",
      },
      {
        id: "TP16", label: "CAN RxD (TTL)",
        description: "Test pin/turret terminal cho CAN RxD TTL theo Figure 3-41; ô mô tả Table 3-7 để trống.",
        signalType: "CAN RxD, TTL theo hình",
        instrument: "Oscilloscope và probe phù hợp tín hiệu logic; manual không chỉ định model cho pin này",
        nominal: "Chưa xác minh mức điện áp logic", tolerance: "Chưa có dung sai được xác minh",
        conditions: ["Table 3-7 không mô tả chức năng TP16; dùng định danh hình nhưng giữ giới hạn chưa biết.", "Không phải phép đo differential CAN-H/CAN-L."],
        source: "MOPIENS 310/320 DME Technical Manual, Figure 3-41 và Table 3-7, trang 3-37 (PDF 117), Rev. B/2022-05-10.",
      },
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
      powerRail("+5V_TP", "+5 V", "±0.25 V", auxiliaryPowerSource),
      powerRail("+15V_TP", "+15 V", "±0.75 V", auxiliaryPowerSource),
      powerRail("-15V_TP", "-15 V", "±0.75 V", auxiliaryPowerSource),
      { ...commonPoint(auxiliaryPowerSource), description: "2 mm tip jack đen cho common (GND)." },
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
      undocumentedPoint("LOG VIDEO WIDE", "Log Video Wide", "BNC test connector của nhánh video băng rộng; không áp giới hạn system delay của LOG VIDEO normal.", "Log-video envelope băng rộng", "MOPIENS 310/320 DME Technical Manual, §3.2.3 / Figure 3-8, trang 3-7–3-9 (PDF 87–89), Rev. B/2022-05-10."),
      undocumentedPoint("ON CH DET", "On Channel Detected", "BNC test connector chỉ thị on-channel; mức điện áp/timing riêng chưa xác minh.", "Tín hiệu phát hiện on-channel", "MOPIENS 310/320 DME Technical Manual, §3.2.3 / Figure 3-8, trang 3-8–3-9 (PDF 88–89), Rev. B/2022-05-10."),
      {
        id: "LOG VIDEO", label: "Log Video (Normal)", description: "BNC test connector RXU: đo system delay trên video chứa interrogation và reply khi bật RF loopback.",
        signalType: "Log-video envelope; phép đo khoảng thời gian system delay",
        nominal: "System delay: X 50 µs; Y 56 µs", tolerance: "System delay: ±0.5 µs",
        instrument: "Oscilloscope Tektronix TDS 3012 hoặc tương đương; probe 10X/100 MHz; cáp BNC 50 Ω",
        conditions: ["RXU LOG VIDEO → CH1; MON INTERROGATION TRIGGER → CH2 (Rev. C/prior: Sync Random Trigger; Rev. D/later: Interrogation Trigger).", "PMDT RF Loopback (TX to RX) On/Apply trong phép đo, Off/Apply sau khi đo.", "Thủ tục: 10 µs/div, 2 V/div, trigger CH2/Single; thu đồng thời hai cặp xung.", "Đo giữa điểm trên cạnh lên thấp hơn peak 0.7 V của xung đầu mỗi cặp; không đo peak-to-peak hoặc từ pin trigger đến reply.", "Dung sai chỉ cho khoảng thời gian theo thủ tục; ảnh Figure 6-4 không quy định mức điện áp nominal, không đại diện mọi trạng thái."],
        source: "MOPIENS 310/320 DME Technical Manual, Figure 3-8, trang 3-9 (PDF 89), Rev. B/2022-05-10; §6.5.2 / Figures 6-1–6-4, trang 6-5–6-8 (PDF 291–294), Rev. B/2019-08-19.",
        waveforms: [systemDelayWaveform],
      },
    ],
    faceplate: "rxu",
    adjustments: [{
      id: "receiver-sensitivity-check", label: "Receiver Sensitivity Check — DME 320",
      control: "PMDT Advanced Control → Monitor Interrogation; Transponder Status",
      instrument: "PMDT / internal interrogation generator; không yêu cầu máy đo ngoài trong thủ tục này",
      target: "Baseline DME 320 -91 dBm; cột tolerance: < -91 dBm. DME 310 dùng -81 dBm, không tráo hai cấu hình",
      conditions: [readonlyReference, "Bypass monitors, tắt Squitter và IDENT Keying. PDF 306/307 đều ghi MON2: Manual, đầu tiên 0 pp/s rồi 100 pp/s, mức -91 dBm cho 320; không tự sửa MON2 thành MON1.", "Kiểm Transmission Rate ≥70 pp/s trên Transponder Status; Changeover và lặp lại cho standby transponder.", "Tiêu đề thủ tục in Low Power nhưng bước tiếp có chỉ dẫn 320 rõ ràng; giữ khác biệt và không biến số mẫu screenshot thành giới hạn."],
      source: "MOPIENS 310/320 DME Technical Manual, §6.5.7 / Figures 6-9–6-11, trang 6-20–6-21 (PDF 306–307), Rev. B/2019-08-19.",
    }],
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
    testPoints: [{
      id: "REPLY ENV", label: "Reply Envelope / Detected Video", description: "BNC REPLY ENV của HPA; J7 theo mô tả PDF 91 và bảng bảo dưỡng, tín hiệu detect không phải cổng RF công suất.",
      signalType: "Detected reply envelope của DME 320 high-power",
      nominal: "Rise 2.0 µs; duration 3.5 µs; decay 2.5 µs; spacing X 12 µs / Y 30 µs",
      tolerance: "Rise <3.0 µs; duration ±0.5 µs; decay <3.5 µs; spacing <0.10 µs (ký hiệu gốc)",
      instrument: "Oscilloscope Tektronix TDS 3012 hoặc tương đương; cáp BNC 50 Ω; probe 10X/100 MHz trong danh mục",
      conditions: ["DME 320 high-power dùng HPA J7; TXU J2 cho phép đo pulse shape/spacing là nhánh low-power DME 310, không tráo điểm đo.", "Shape: CH1, 1 µs/div; chỉnh vertical để vừa lưới. Rise 10%→90%, duration 50% cạnh lên→50% cạnh xuống, decay 90%→10%.", "Spacing: CH1, 2 µs/div; giữa hai điểm 50% trên cạnh lên của hai xung trong cặp.", "Bảng spacing in <0.10 µs ở cột tolerance; giữ nguyên, không tự đổi sang ±0.10 µs. PDF 300 gọi nhầm dòng duration là rise time; giữ định nghĩa 50%→50% đúng ngữ cảnh.", "Không có nominal điện áp envelope hoặc hệ số V→W được xác minh."],
      source: "MOPIENS 310/320 DME Technical Manual, §3.2.4 / Figure 3-11, trang 3-11–3-12 (PDF 91–92), Rev. B/2022-05-10; §§6.5.4–6.5.5, trang 6-12–6-17 (PDF 298–303), Rev. B/2019-08-19.",
    }],
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
      {
        id: "DETECTED VIDEO", label: "Detected Video", description: "BNC envelope TXU; §6.5.6 dùng TXU J2 đo pulse count, không thay HPA khi đo shape high-power.",
        signalType: "Detected envelope; đếm pulse pairs qua frequency counter",
        nominal: "Reply pulse-pair rate: 700 pp/s (bảng §6.5.6)", tolerance: ">700 pp/s",
        instrument: "Frequency counter ≥1.5 GHz, Keysight 53131A option 015 hoặc tương đương; cáp BNC 50 Ω",
        conditions: ["Nối DETECTED VIDEO tới counter; lấy số đếm xung chia 2 để ra pulse-pair rate theo PDF 305.", "§6.5.6 chỉ định TXU J2; không tự chuyển pulse-count sang HPA J7. Riêng shape/spacing high-power đo HPA, TXU J2 trong các mục đó là DME 310 low-power.", "700 pp/s là standard của check; >700 pp/s là tolerance in nguyên văn, không đổi thành ≥. 800 pp/s ở startup PDF 402 chỉ là khuyến nghị, không thay giới hạn này.", "Không có nominal điện áp hoặc hàm V→W được xác minh tại BNC."],
        source: "MOPIENS 310/320 DME Technical Manual, Figure 3-15, trang 3-17 (PDF 97), Rev. B/2022-05-10; §6.5.6, trang 6-18–6-19 (PDF 304–305), Rev. B/2019-08-19.",
      },
      {
        id: "FREQ.", label: "Transmit Frequency", description: "BNC FREQ. trên Figure 3-15; §6.5.10 gọi TX FREQ.",
        signalType: "RF frequency sample", nominal: "Tần số được ấn định cho trạm", tolerance: "±0.001%",
        instrument: "Frequency counter ≥1.5 GHz, Keysight 53131A option 015 hoặc tương đương; cáp BNC 50 Ω",
        conditions: ["Nối TX FREQ trên TXU tới đầu vào counter phù hợp; đọc riêng TX1/TX2.", "Dải PLL 960–1215 MHz, bước 0.1 MHz ở PDF 96 là khả năng synthesizer, không phải nominal cố định của mọi trạm hoặc mức RF tại BNC."],
        source: "MOPIENS 310/320 DME Technical Manual, §3.2.5 / Figure 3-15, trang 3-16–3-17 (PDF 96–97), Rev. B/2022-05-10; §6.5.10 / Figure 6-20, trang 6-28–6-29 (PDF 314–315), Rev. B/2019-08-19.",
      },
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
      powerRail("+5V_TP", "+5 V", "±0.25 V", transponderPowerSource),
      powerRail("+8V_TP", "+8 V", "±0.4 V", transponderPowerSource),
      powerRail("+15V_TP", "+15 V", "±0.75 V", transponderPowerSource),
      powerRail("-15V_TP", "-15 V", "±0.75 V", transponderPowerSource),
      powerRail("+28V_TP", "+28 V", "Chưa có dung sai trong bảng bảo dưỡng §6.5.9", transponderPowerSource),
      powerRail("+50V_TP", "+50 V", "±2.5 V", transponderPowerSource),
      { ...commonPoint(transponderPowerSource), description: "2 mm tip jack đen cho common (GND)." },
    ],
    faceplate: "dcdc",
    adjustments: [
      {
        id: "ADJ1", label: "ADJ1 — +28 V output", control: "ADJ1 / VR101",
        instrument: "DMM/DVM tại +28V_TP so GND",
        target: "+28 V nominal; chưa có dung sai +28 V DC/DC trong bảng §6.5.9",
        conditions: [readonlyReference, "Table 3-2 chỉ xác minh chức năng chỉnh +28 V. Không xác minh chiều xoay, số vòng, dải hoặc quan hệ góc–điện áp; không áp dung sai PMU AC/DC VOLT."],
        source: transponderPowerSource,
      },
      {
        id: "ADJ2", label: "ADJ2 — +50 V output", control: "ADJ2 / VR121",
        instrument: "DMM/DVM tại +50V_TP so GND",
        target: "+50 V nominal; ±2.5 V theo bảng kiểm tra nguồn §6.5.9",
        conditions: [readonlyReference, "Table 3-2 ghi VOR/DME only. Không xác minh chiều xoay, số vòng, dải hoặc quan hệ góc–điện áp; ±2.5 V là dung sai check, không phải dải hành trình vít."],
        source: transponderPowerSource,
      },
    ],
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
      undocumentedPoint("TOA PULSE", "TOA Pulse", "Test point timing time-of-arrival.", "Timing pulse", tcuPointSource),
      undocumentedPoint("DECODED", "Decoded", "Test point pulse đã decode.", "Decoded pulse", tcuPointSource),
      undocumentedPoint("DEAD TIME", "Dead Time", "Test point dead-time; không lấy setting 60 µs làm nominal tại pin.", "Dead-time signal", tcuPointSource),
      undocumentedPoint("GAUSSIAN PULSE", "Gaussian Pulse", "Test point waveform điều chế Gaussian; không phải đầu ra RF envelope HPA.", "Gaussian modulation", tcuPointSource),
      undocumentedPoint("RECTANGULAR PULSE", "Rectangular Pulse", "Test point điều chế chữ nhật.", "Rectangular modulation", tcuPointSource),
      { ...commonPoint(tcuPointSource), description: "Test point GND theo Figure 3-21; hình không chỉ định kích thước jack.", nominal: "Mass tham chiếu, không phải nominal tín hiệu", instrument: "Probe reference phù hợp khi đo TCU; manual không nêu phép đo GND riêng", conditions: ["Figure 3-21 chỉ xác minh điểm GND; không có quy trình hoặc dung sai điện áp riêng tại điểm này."] },
      undocumentedPoint("RX INHIBIT", "RX Inhibit", "Test point RX Inhibit phía dưới FPGA ISP.", "Receiver-inhibit signal", tcuPointSource),
      undocumentedPoint("LDES", "LDES", "Test point LDES; setting echo suppression không chứng minh timing/điện áp pin.", "Long-distance echo-suppression signal", tcuPointSource),
      undocumentedPoint("ID CODE", "ID Code", "Test point ID Code; khác ID Pulse.", "Identity code signal", tcuPointSource),
      undocumentedPoint("ID PULSE", "Identity Pulse", "Test point ID Pulse; không tự áp tần số hoặc duty cycle của ID Code.", "Identity pulse", tcuPointSource),
      undocumentedPoint("SQUITTER", "Squitter", "Test point Squitter; không lấy minimum pulse-rate setting làm nominal tại pin.", "Squitter timing signal", tcuPointSource),
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
      undocumentedPoint("FPGA STATUS", "FPGA Status", "Test point FPGA_STATUS trên MON Rev. D+.", "Status signal, chưa xác minh timing", monitorPointSource),
      undocumentedPoint("MCU STATUS", "MCU Status", "Test point MCU_STATUS trên MON Rev. D+.", "Status signal, chưa xác minh timing", monitorPointSource),
      undocumentedPoint("INTG PULSE", "INTG Pulse", "Điểm đo mang nhãn INTG PULSE trên panel MON; khác INTERROGATION TRIGGER. Manual không giải nghĩa INTG.", "Nhãn INTG PULSE; chưa xác minh chức năng", monitorPointSource),
      undocumentedPoint("INPUT ENVELOPE", "Input Envelope", "Test point INPUT ENVELOPE; nguồn hình không quy định mức chuẩn hoặc V→W.", "Envelope signal", monitorPointSource),
      {
        ...undocumentedPoint("INTERROGATION TRIGGER", "Interrogation Trigger", "Test point MON cung cấp timing reference cho scope CH2; video hai cặp xung được đo riêng trên RXU CH1.", "Interrogation timing reference", monitorPointSource),
        conditions: ["Nối probe từ MON sang CH2, RXU LOG VIDEO sang CH1; chọn trigger source CH2 theo §6.5.2.", "MON Rev. C/prior dùng Sync (Random Trigger); panel Rev. D/later dùng INTERROGATION TRIGGER, không phải INTG PULSE.", "Figure 6-4 là trace RXU CH1, không phải waveform pin này. Không có nominal/dung sai độ trễ pin→reply được xác minh."],
        source: `${monitorPointSource} §6.5.2 / Figure 6-2, trang 6-6–6-7 (PDF 292–293), Rev. B/2019-08-19.`,
      },
      undocumentedPoint("IDENT", "Identification", "Test point IDENT trên MON Rev. D+.", "Identification signal", monitorPointSource),
    ],
    faceplate: "mon",
    adjustments: [
      {
        id: "monitor-alarm-delay-check", label: "Monitor Alarm Delay Check",
        control: "PMDT Executive Monitor Setup → MON Action Delay; Monitor Certification → Time Delay → Test",
        instrument: "PMDT / Monitor Certification Result",
        target: "Alarm Delay time: 4.0 s ±0.4 s khi MON Action Delay đã đặt 4.0 s",
        conditions: [readonlyReference, "Bypass monitors; đặt Executive MON Action Delay 4.0 s, Time Delay stimulus 49.4 µs rồi Test, kiểm Result.", "49.4 µs là stimulus của ví dụ quanh 50 µs, không phải system delay nominal hoặc giới hạn chung; manual không ghi phạm vi kênh, không tự áp cho Y 56 µs hoặc cấu hình Delay Offset khác."],
        source: "MOPIENS 310/320 DME Technical Manual, §6.5.11 / Figure 6-21, trang 6-30–6-31 (PDF 316–317), Rev. B/2019-08-19.",
      },
      {
        id: "bite-certification-check", label: "BITE Certification Check",
        control: "PMDT Monitor Self-Test Readings",
        instrument: "PMDT / trạng thái MON1 và MON2",
        target: "MON status indicated correctly: kết quả NORMAL và ERRONEOUS test interrogations đều all green cho MON1/MON2; không có tolerance số",
        conditions: [readonlyReference, "Bypass monitors và xem cả NORMAL lẫn ERRONEOUS interrogations. All green là đánh giá đúng test BITE, không phải mọi tín hiệu erroneous đều ở giới hạn vận hành.", "Không dùng các số đọc trên screenshot làm nominal/dung sai pin MON hoặc phép đo live."],
        source: "MOPIENS 310/320 DME Technical Manual, §6.5.12 / Figures 6-22/6-23, trang 6-32–6-33 (PDF 318–319), Rev. B/2019-08-19.",
      },
    ],
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
      {
        ...undocumentedPoint("68 MHz OSC", "68 MHz oscillator frequency", "BNC connector theo Figure 3-32.", "Oscillator RF sample", rfgPointSource),
        nominal: "68 MHz theo nhãn Figure 3-32; tần số thực theo revision chưa xác nhận",
        instrument: "Frequency counter phù hợp 68 MHz; manual không chỉ định instrument/setup riêng tại BNC này",
        conditions: ["Figure 3-32 ghi 68 MHz, nhưng mô tả PDF 107–108 có TCXO 63 MHz và cả 68 MHz; giữ mâu thuẫn, không dùng ±0.001% của TX FREQ cho RFG."],
      },
      undocumentedPoint("PULSE DETECT", "Pulse Detect", "Một Test point Pulse Detect theo Figure 3-32, không tách thành TXP1/TXP2 khi hình không nêu.", "Detected pulse; comparator TTL được mô tả nhưng chưa xác minh mức tại pin", rfgPointSource),
      {
        ...undocumentedPoint("RFG FREQ.", "RFG Frequency", "BNC connector RFG Frequency (J4 theo PDF 107); không phải TX FREQ của TXU.", "RF frequency sample từ RFG", rfgPointSource),
        instrument: "Frequency counter phù hợp dải RF; manual không chỉ định instrument/setup hoặc dung sai riêng tại BNC này",
      },
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
      {
        id: "ACDC VOLT", label: "AC/DC Voltage", description: "Tip jack ACDC VOLT tại đầu vào giám sát AC/DC của PMU, không phải rail +5/±15 V.",
        signalType: "Điện áp DC", nominal: "+28 VDC", tolerance: "±1.4 V",
        instrument: "DMM/DVM và test leads (§6.5.9)",
        conditions: ["Đầu đen vào GND trên PMU, đầu đỏ vào ACDC VOLT theo PDF 311.", "Không nhầm test jack với nút chọn ACDC VOLT/DC V của display; không phải telemetry mô phỏng."], source: pmuPowerSource,
      },
      {
        id: "BATT VOLT", label: "Battery Voltage", description: "Test point BATT VOLT theo Figure 6-16; không phải nút chọn display BATT V.",
        signalType: "Điện áp DC battery", nominal: "Theo battery/điều kiện sạc; chưa xác minh giá trị cố định tại jack",
        tolerance: "Chưa có dung sai đo tại jack BATT VOLT trong §6.5.9",
        instrument: "DMM/DVM phù hợp nguồn DC; manual không nêu quy trình đo riêng cho BATT VOLT",
        conditions: ["Figure 6-16 ghi T/P BATT VOLT; không tự áp dung sai AC/DC hoặc coi ngưỡng alarm/cutoff là dung sai jack.", "Ngưỡng điển hình 22 V alarm / 20 V cutoff ở §3.5.2 là giá trị preset, không phải nominal phép đo."],
        source: `${pmuPowerSource} §3.5.2, trang 3-44–3-45 (PDF 124–125).`,
      },
      commonPoint(pmuPowerSource),
    ],
    faceplate: "pmu",
    notes: ["Table 3-13 (Rev. B/2022-05-10) ghi +5V_TP/+15V_TP/-15V_TP/GND, mâu thuẫn Figure 6-16 và thủ tục §6.5.9 (Rev. B/2019-08-19). Catalog đo bảo dưỡng dùng ACDC VOLT/BATT VOLT/GND theo hình và thủ tục, không khẳng định bảng đã được hãng sửa.", "Ba T/P phía trên khác năm nút chọn display TEMP/DC V/DC I/BATT V/BATT I; không biến số hiển thị mẫu thành dữ liệu live."],
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
    adjustments: [{
      id: "rf-power-output-check", label: "RF Peak Power Output Check",
      control: "1DC3 coupled port → attenuator → peak power sensor; Power Viewer Plus offset",
      instrument: "Wideband peak power sensor R&S ERP-Z81 hoặc tương đương; PC Power Viewer Plus; attenuator 20 dB/50 Ω/5 W continuous và cáp N 50 Ω có loss đã biết (§6.5.3)",
      target: "ANT (J2): công suất được ấn định ±1 dB; đọc qua tuyến sample đã bù loss, không có một mức W cố định cho mọi trạm",
      conditions: [readonlyReference, "Chọn Figure 6-5 cho s/n ≤00022, Figure 6-6 cho s/n ≥00023; thủ tục dùng 1DC3 coupled port, không phải DETECTED VIDEO BNC.", "Offset dùng coupling thực và attenuation thực đo bằng network analyzer cộng cable loss; manual ghi nominal 30 dB +20 dB, trong khi catalog RF có nhãn 27 dB. Không hardcode coupling chung hoặc cộng bù hai lần.", "Setup calibration §4.4.7.1 dùng attenuator khác (50 dB/250 W) nên không tráo với setup maintenance này; thông số rating/đấu nối thật cần quy trình an toàn đầy đủ."],
      source: "MOPIENS 310/320 DME Technical Manual, §6.5.3 / Figures 6-5/6-6, trang 6-9–6-11 (PDF 295–297), Rev. B/2019-08-19; calibration setup Figure 4-98, PDF 223.",
    }],
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
