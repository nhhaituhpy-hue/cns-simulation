export type Dme1119aCabinetSurface = "front" | "rear";

export type Dme1119aBlockId =
  | "antenna"
  | "directional-coupler"
  | "circulator"
  | "rf-switch"
  | "load-attenuator"
  | "preselector"
  | "low-noise-amplifier"
  | "lpa-synth-1"
  | "hpa-1"
  | "lpa-synth-2"
  | "hpa-2"
  | "monitor-1"
  | "monitor-2"
  | "rtc-1"
  | "rtc-2"
  | "rms"
  | "lcu"
  | "pmdt"
  | "tx-power-supply-1"
  | "battery-1"
  | "bcps-1"
  | "tx-power-supply-2"
  | "battery-2"
  | "bcps-2"
  | "interface-card"
  | "co-located"
  | "rcsu"
  | "ethernet"
  | "facilities"
  | "ac-monitor"
  | "status-panel"
  | "fan-controller";

export type Dme1119aCabinetKind =
  | "lcu"
  | "amplifier"
  | "card"
  | "power"
  | "rf"
  | "interface"
  | "control";

export type Dme1119aFaceplateKind =
  | "lcu"
  | "hpa"
  | "lpa"
  | "rtc"
  | "monitor"
  | "rms"
  | "facilities"
  | "bcps"
  | "interface"
  | "ac-monitor"
  | "power-supply"
  | "status-panel"
  | "fan-controller"
  | "rf-assembly";

export interface Dme1119aCabinetHotspot {
  id: string;
  surface: Dme1119aCabinetSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  assemblyId: string;
  shortLabel: string;
  kind: Dme1119aCabinetKind;
}

export interface Dme1119aDiagramOccurrence {
  id: string;
  componentId: string;
  targetCabinetHotspotIds: readonly string[];
}

export interface Dme1119aWaveformReference {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  source: string;
}

export interface Dme1119aTestPoint {
  id: string;
  label: string;
  description: string;
  waveforms?: readonly Dme1119aWaveformReference[];
}

export interface Dme1119aBlockDefinition {
  id: Dme1119aBlockId;
  shortName: string;
  name: string;
  assemblyIds: readonly string[];
  description: string;
  manualReference: string;
  cabinetHotspots: readonly Dme1119aCabinetHotspot[];
  diagramOccurrences: readonly Dme1119aDiagramOccurrence[];
  indicators: readonly string[];
  controls: readonly string[];
  testPoints: readonly Dme1119aTestPoint[];
  faceplate?: Dme1119aFaceplateKind;
  notes?: readonly string[];
}

const waveforms = {
  figure77: {
    src: "/equipment/dme-1119a/waveforms/figure-7-7-monitor-detected-video-lpa-detector.webp",
    width: 800,
    height: 570,
    alt: "Dạng sóng Monitor Detected Video và LPA Detector tại normal delay trigger",
    caption: "Monitor DETECTED VIDEO / LPA DETECTOR - Normal Delay Trigger",
    source: "Figure 7-7, PDF page 206, Manual 571118A-0001 Rev. M",
  },
  figure78: {
    src: "/equipment/dme-1119a/waveforms/figure-7-8-monitor-detected-video-rtc-low-video.webp",
    width: 800,
    height: 565,
    alt: "Dạng sóng Monitor Detected Video và RTC Low Video tại efficiency trigger",
    caption: "Monitor DETECTED VIDEO / RTC LOW VIDEO - Efficiency Trigger",
    source: "Figure 7-8, PDF page 206, Manual 571118A-0001 Rev. M",
  },
  figure79: {
    src: "/equipment/dme-1119a/waveforms/figure-7-9-monitor-detected-video-rtc-low-video.webp",
    width: 800,
    height: 570,
    alt: "Dạng sóng Monitor Detected Video và RTC Low Video tại normal delay trigger",
    caption: "Monitor DETECTED VIDEO / RTC LOW VIDEO - Normal Delay Trigger",
    source: "Figure 7-9, PDF page 207, Manual 571118A-0001 Rev. M",
  },
  figure710: {
    src: "/equipment/dme-1119a/waveforms/figure-7-10-monitor-forward-power-trigger.webp",
    width: 800,
    height: 590,
    alt: "Dạng sóng Monitor Detected Video tại forward power trigger",
    caption: "Monitor DETECTED VIDEO - Forward Power Trigger",
    source: "Figure 7-10, PDF page 207, Manual 571118A-0001 Rev. M",
  },
  figure711: {
    src: "/equipment/dme-1119a/waveforms/figure-7-11-monitor-reflected-power-trigger.webp",
    width: 800,
    height: 570,
    alt: "Dạng sóng Monitor Detected Video tại reflected power trigger",
    caption: "Monitor DETECTED VIDEO - Reflected Power Trigger",
    source: "Figure 7-11, PDF page 208, Manual 571118A-0001 Rev. M",
  },
  figure712: {
    src: "/equipment/dme-1119a/waveforms/figure-7-12-rtc-low-video-test-points.webp",
    width: 800,
    height: 600,
    alt: "Bốn dạng sóng RTC Low Video, IRQ TP13, Half Amp TP8 và Dead Time TP6",
    caption: "RTC LOW VIDEO / IRQ TP13 / HALF AMP TP8 / DEAD TIME TP6",
    source: "Figure 7-12, PDF page 208, Manual 571118A-0001 Rev. M",
  },
} as const satisfies Record<string, Dme1119aWaveformReference>;

const hotspot = (
  id: string,
  surface: Dme1119aCabinetSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  assemblyId: string,
  shortLabel: string,
  kind: Dme1119aCabinetKind,
): Dme1119aCabinetHotspot => ({
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
): Dme1119aDiagramOccurrence => ({
  id: `diagram-${componentId}`,
  componentId: `dme-${componentId}`,
  targetCabinetHotspotIds,
});

const front = {
  lcu: hotspot("front-lcu", "front", 54, 77, 324, 92, "1A1", "LCU", "lcu"),
  hpa1: hotspot("front-hpa-1", "front", 80, 169, 55, 180, "1A3", "HPA 1", "amplifier"),
  hpa2: hotspot("front-hpa-2", "front", 298, 169, 55, 180, "1A7", "HPA 2", "amplifier"),
  lpa1: hotspot("front-lpa-1", "front", 54, 349, 63, 178, "1A9", "LPA/SYNTH 1", "amplifier"),
  rtc1: hotspot("front-rtc-1", "front", 117, 349, 34, 178, "1A10", "RTC 1", "card"),
  monitor1: hotspot("front-monitor-1", "front", 151, 349, 34, 178, "1A11", "MON/INT 1", "card"),
  rms: hotspot("front-rms", "front", 185, 349, 41, 178, "1A13", "RMS", "card"),
  facilities: hotspot("front-facilities", "front", 226, 349, 20, 178, "1A14", "FACILITIES", "card"),
  monitor2: hotspot("front-monitor-2", "front", 246, 349, 34, 178, "1A15", "MON/INT 2", "card"),
  rtc2: hotspot("front-rtc-2", "front", 280, 349, 34, 178, "1A16", "RTC 2", "card"),
  lpa2: hotspot("front-lpa-2", "front", 314, 349, 64, 178, "1A17", "LPA/SYNTH 2", "amplifier"),
  power1: hotspot("front-power-supply-1", "front", 92, 713, 102, 30, "1A24", "1500 W PS 1", "power"),
  power2: hotspot("front-power-supply-2", "front", 241, 713, 102, 30, "1A25", "1500 W PS 2", "power"),
  acMonitor: hotspot("front-ac-monitor", "front", 326, 781, 52, 93, "1A22", "AC MONITOR", "power"),
  status: hotspot("front-status-panel", "front", 54, 1066, 324, 122, "1A26", "STATUS PANEL", "control"),
} as const;

const rear = {
  coupler: hotspot("rear-directional-coupler", "rear", 113, 42, 38, 54, "1DC1", "30 dB COUPLER", "rf"),
  rfSwitch: hotspot("rear-rf-switch", "rear", 207, 93, 29, 45, "1K1", "RF SWITCH", "rf"),
  circulator: hotspot("rear-circulator", "rear", 188, 125, 20, 26, "RF PANEL", "CIRCULATOR", "rf"),
  load: hotspot("rear-load-attenuator", "rear", 280, 127, 55, 26, "1AT1", "LOAD/ATTEN", "rf"),
  fanController: hotspot("rear-fan-controller", "rear", 202, 170, 106, 75, "1A2A2", "FAN CTRL", "control"),
  interface: hotspot("rear-interface", "rear", 93, 533, 254, 118, "1A19", "INTERFACE CCA", "interface"),
  bcps2: hotspot("rear-bcps-2", "rear", 75, 651, 148, 121, "1A21", "BCPS 2", "power"),
  bcps1: hotspot("rear-bcps-1", "rear", 223, 651, 137, 121, "1A20", "BCPS 1", "power"),
  statusDisplay2: hotspot("rear-status-display-2", "rear", 147, 1124, 51, 37, "1A26A2", "STATUS DISPLAY 2", "control"),
  statusDisplay1: hotspot("rear-status-display-1", "rear", 201, 1124, 51, 37, "1A26A1", "STATUS DISPLAY 1", "control"),
} as const;

const rtcIndicators = [
  "OVERLOAD: cảnh báo PRF tăng đến mức phải giảm độ nhạy tối thiểu.",
  "CPU OK (xanh): bộ xử lý receiver hoạt động bình thường.",
  "PWR OK (xanh): các điện áp DC của module nằm trong dung sai.",
] as const;

const rtcControls = [
  "J5 LOW VIDEO: video tách sóng mức thấp.",
  "J3 HIGH VIDEO: video tách sóng mức cao.",
  "RX LO: mẫu dao động nội của receiver.",
  "J4 TX TRIG: trigger máy hiện sóng khi quan sát LOW/HIGH VIDEO.",
] as const;

const monitorIndicators = [
  "INTEGRAL PRIMARY/SECONDARY ALARM (đỏ): tham số của transmitter trên antenna vượt giới hạn alarm.",
  "INTEGRAL PRE ALARM (vàng): tham số primary vượt giới hạn pre-alarm.",
  "STANDBY PRIMARY/SECONDARY/PRE ALARM (vàng): cảnh báo tương ứng của transmitter dự phòng.",
  "CPU OK và PWR OK (xanh): bộ xử lý và nguồn DC hoạt động bình thường.",
] as const;

const monitorControls = [
  "J5 DETECTED VIDEO: video tách sóng từ tín hiệu RF interrogator.",
  "INT LO: mẫu RF của interrogator synthesizer để kiểm tra tần số.",
  "J4 INT TRIG: trigger máy hiện sóng khi quan sát DETECTED VIDEO.",
] as const;

const rtcTestPoints: readonly Dme1119aTestPoint[] = [
  {
    id: "J5",
    label: "LOW VIDEO",
    description: "Video receiver mức thấp; được dùng cùng trigger Monitor trong Figure 7-8 và 7-9.",
    waveforms: [waveforms.figure78, waveforms.figure79, waveforms.figure712],
  },
  { id: "J3", label: "HIGH VIDEO", description: "Video receiver mức cao tại mặt trước RTC." },
  { id: "J4", label: "TX TRIG", description: "Trigger để đồng bộ quan sát LOW VIDEO và HIGH VIDEO." },
  { id: "TP13", label: "IRQ", description: "Xung yêu cầu ngắt của RTC; kênh 2 trong Figure 7-12.", waveforms: [waveforms.figure712] },
  { id: "TP8", label: "HALF AMP", description: "Tín hiệu half-amplitude; kênh 3 trong Figure 7-12.", waveforms: [waveforms.figure712] },
  { id: "TP6", label: "DEAD TIME", description: "Cửa dead-time của receiver; kênh 4 trong Figure 7-12.", waveforms: [waveforms.figure712] },
];

const monitorTestPoints: readonly Dme1119aTestPoint[] = [
  {
    id: "J5",
    label: "DETECTED VIDEO",
    description: "Video tách sóng interrogator, dùng để đánh giá delay, efficiency, forward và reflected power.",
    waveforms: [waveforms.figure77, waveforms.figure78, waveforms.figure79, waveforms.figure710, waveforms.figure711],
  },
  { id: "J4", label: "INT TRIG", description: "Trigger interrogator cho phép quan sát DETECTED VIDEO ổn định." },
  { id: "INT LO", label: "INTERROGATOR LOCAL OSCILLATOR", description: "Mẫu RF để kiểm tra tần số interrogator bằng frequency counter." },
];

export const DME_1119A_BLOCKS: readonly Dme1119aBlockDefinition[] = [
  {
    id: "antenna",
    shortName: "ANTENNA",
    name: "DME Antenna",
    assemblyIds: [],
    description: "Anten omni-directional nhận interrogation từ máy bay và phát reply DME. Pickup tích hợp cung cấp mẫu tín hiệu trong không gian cho hệ thống monitor.",
    manualReference: "Figure 1-6; Sections 1.2 and 1.4; Figure 1-10.",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("antenna")],
    indicators: [], controls: ["J1 RF INPUT", "J2/J3 RF MONITOR OUTPUT", "J4 obstruction-light input"], testPoints: [],
    notes: ["Antenna nằm ngoài cabinet nên không có vị trí LRU để làm sáng trên Front/Rear Cabinet."],
  },
  {
    id: "directional-coupler", shortName: "30 dB COUPLER", name: "Directional Coupler 30 dB", assemblyIds: ["RF Panel"],
    description: "Lấy mẫu công suất thuận và phản xạ của tuyến antenna với mức ghép 30 dB để hai monitor đo công suất và VSWR.",
    manualReference: "Figure 1-10 / Figure 2-4; Section 1.4.", cabinetHotspots: [rear.coupler], diagramOccurrences: [occurrence("coupler", [rear.coupler.id])],
    indicators: [], controls: ["Main RF path", "30 dB forward sample", "30 dB reflected sample"], testPoints: [], faceplate: "rf-assembly",
  },
  {
    id: "circulator", shortName: "CIRCULATOR", name: "RF Circulator", assemblyIds: ["RF Panel"],
    description: "Tách chiều phát và thu trên đường antenna: reply từ RF switch đi ra antenna, còn interrogation thu được định tuyến sang Preselector.",
    manualReference: "Figure 1-10; Figures 2-1 and 2-2; Section 2.2.", cabinetHotspots: [rear.circulator], diagramOccurrences: [occurrence("circulator", [rear.circulator.id])],
    indicators: [], controls: ["TX port", "Antenna port", "Receiver/Preselector port"], testPoints: [], faceplate: "rf-assembly",
  },
  {
    id: "rf-switch", shortName: "RF SWITCH", name: "Transmit RF Switch", assemblyIds: ["1K1"],
    description: "Chọn nhánh high-power transmitter nối vào tuyến antenna và định tuyến nhánh dự phòng sang load/attenuator theo điều khiển LCU.",
    manualReference: "Figure 1-4; Figure 1-10; replacement procedure 7.7.16.", cabinetHotspots: [rear.rfSwitch], diagramOccurrences: [occurrence("rf-switch", [rear.rfSwitch.id])],
    indicators: [], controls: ["TX1 RF input", "TX2 RF input", "Antenna output", "Load/attenuator output", "LCU control harness"], testPoints: [], faceplate: "rf-assembly",
  },
  {
    id: "load-attenuator", shortName: "LOAD / ATTEN", name: "Load / Attenuator", assemblyIds: ["RF Panel"],
    description: "Nhận công suất của transmitter dự phòng nóng và cung cấp mẫu suy hao để monitor tiếp tục đánh giá transmitter không ở trên antenna.",
    manualReference: "Figure 1-10; Section 1.4.", cabinetHotspots: [rear.load], diagramOccurrences: [occurrence("load", [rear.load.id])],
    indicators: [], controls: ["RF input from transfer switch", "Attenuated monitor sample"], testPoints: [], faceplate: "rf-assembly",
  },
  {
    id: "preselector", shortName: "PRESELECTOR", name: "DME Preselector Assembly", assemblyIds: ["FL1", "RLC F-19076"],
    description: "Bộ lọc hẹp ba cực, chỉnh cơ khí theo tần số interrogation của trạm. Khối loại bỏ tín hiệu ngoài băng và suy giảm thêm năng lượng phát rò trước khi đưa tín hiệu thu sang LNA.",
    manualReference: "Figure 2-2; Section 2.2, page 2-5; Figure 6-6 and Section 6.5.2.", cabinetHotspots: [], diagramOccurrences: [occurrence("preselector")],
    indicators: [], controls: ["RF input from circulator", "Filtered RF output to LNA", "A1/A2/A3 mechanical tuning capacitors"], testPoints: [],
    notes: ["Preselector nằm trong cụm RF nội bộ và không có mặt LRU riêng nhìn thấy trên Front/Rear Cabinet; Side View đã được lược bỏ theo phạm vi trang."],
  },
  {
    id: "low-noise-amplifier", shortName: "LNA", name: "Low-noise Amplifier", assemblyIds: ["1A8A2", "012033-0001"],
    description: "Khuếch đại interrogation 1025–1150 MHz tại đầu ra của Preselector trước khi tín hiệu được chia và gửi tới hai Receiver/Transmitter Controller.",
    manualReference: "Figure 2-2; Section 2.3.2.15, page 2-44; replacement procedure 7.7.10; Figure 11-27.", cabinetHotspots: [], diagramOccurrences: [occurrence("lna")],
    indicators: [], controls: ["RF input from Preselector", "Amplified receiver output to RTC paths", "5 VDC feed from either RTC through the RF coax"], testPoints: [],
    notes: ["LNA 1A8A2 gắn ở đáy preselector filter và được tiếp cận từ cửa sau, nhưng không có mặt LRU riêng nhìn thấy trên Front/Rear Cabinet."],
  },
  {
    id: "lpa-synth-1", shortName: "LPA/SYNTH 1", name: "Low Power Amplifier / Synthesizer TX1", assemblyIds: ["1A9", "030802-0003"],
    description: "Tạo RF reply theo tần số được RTC1 lập trình, pulse-modulate và khuếch đại thành tín hiệu driver đã pre-distort để kích HPA1.",
    manualReference: "Figures 2-7 and 2-8; Figure 3-63; Table 3-17; Section 2.3.2.3.", cabinetHotspots: [front.lpa1], diagramOccurrences: [occurrence("lpa-synth-1", [front.lpa1.id])],
    indicators: ["PWR OK (xanh): điện áp DC của amplifier nằm trong dung sai."], controls: ["J1 DETECTOR", "J2 TX LO"],
    testPoints: [{ id: "J1", label: "DETECTOR", description: "Detected video của RF output để quan sát timing, shape và biên độ tương đối.", waveforms: [waveforms.figure77] }, { id: "J2", label: "TX LO", description: "Mẫu RF từ synthesizer dùng với frequency counter để kiểm tra tần số phát." }], faceplate: "lpa",
  },
  {
    id: "hpa-1", shortName: "HPA 1", name: "High Power Amplifier TX1", assemblyIds: ["1A3", "030804-0002"],
    description: "Khuếch đại xung RF pre-distort từ LPA1 qua driver và tầng final song song để đạt công suất đỉnh high-power DME trước RF switch.",
    manualReference: "Figure 2-18; Figure 3-62; Table 3-16; Section 2.3.2.11.", cabinetHotspots: [front.hpa1], diagramOccurrences: [occurrence("hpa-1", [front.hpa1.id])],
    indicators: ["PWR OK (xanh): điện áp DC của amplifier nằm trong dung sai."], controls: ["J1 DETECTOR: detected video của RF output."],
    testPoints: [{ id: "J1", label: "DETECTOR", description: "Cho phép quan sát timing, pulse shape và biên độ tương đối của HPA output." }], faceplate: "hpa",
  },
  {
    id: "lpa-synth-2", shortName: "LPA/SYNTH 2", name: "Low Power Amplifier / Synthesizer TX2", assemblyIds: ["1A17", "030802-0003"],
    description: "Nhánh TX2 tương đương TX1: synthesizer tạo RF reply, modulator điều khiển pulse shape và amplifier cung cấp driver cho HPA2.",
    manualReference: "Figures 2-7 and 2-8; Figure 3-63; Table 3-17; Section 2.3.2.3.", cabinetHotspots: [front.lpa2], diagramOccurrences: [occurrence("lpa-synth-2", [front.lpa2.id])],
    indicators: ["PWR OK (xanh): điện áp DC của amplifier nằm trong dung sai."], controls: ["J1 DETECTOR", "J2 TX LO"],
    testPoints: [{ id: "J1", label: "DETECTOR", description: "Detected video của RF output." }, { id: "J2", label: "TX LO", description: "Mẫu RF từ synthesizer để kiểm tra tần số phát." }], faceplate: "lpa",
  },
  {
    id: "hpa-2", shortName: "HPA 2", name: "High Power Amplifier TX2", assemblyIds: ["1A7", "030804-0002"],
    description: "Khuếch đại xung RF pre-distort từ LPA2 lên mức high power và đưa tín hiệu tới cổng TX2 của RF switch.",
    manualReference: "Figure 2-18; Figure 3-62; Table 3-16; Section 2.3.2.11.", cabinetHotspots: [front.hpa2], diagramOccurrences: [occurrence("hpa-2", [front.hpa2.id])],
    indicators: ["PWR OK (xanh): điện áp DC của amplifier nằm trong dung sai."], controls: ["J1 DETECTOR: detected video của RF output."],
    testPoints: [{ id: "J1", label: "DETECTOR", description: "Cho phép quan sát timing, pulse shape và biên độ tương đối của HPA output." }], faceplate: "hpa",
  },
  {
    id: "monitor-1", shortName: "MON/INT 1", name: "Monitor / Interrogator 1", assemblyIds: ["1A11", "030806-0001"],
    description: "Tạo interrogation kiểm tra, nhận reply mẫu và đánh giá các tham số critical của cả transmitter trên antenna lẫn transmitter standby.",
    manualReference: "Figures 2-11 to 2-13; Figure 3-65; Table 3-18; Sections 1.4 and 2.3.2.5.", cabinetHotspots: [front.monitor1], diagramOccurrences: [occurrence("monitor-1", [front.monitor1.id])],
    indicators: monitorIndicators, controls: monitorControls, testPoints: monitorTestPoints, faceplate: "monitor",
  },
  {
    id: "monitor-2", shortName: "MON/INT 2", name: "Monitor / Interrogator 2", assemblyIds: ["1A15", "030806-0001"],
    description: "Kênh monitor độc lập thứ hai, thực hiện giám sát chéo cả hai transmitter và tham gia logic voting AND/OR của trạm.",
    manualReference: "Figures 2-11 to 2-13; Figure 3-65; Table 3-18; Sections 1.4 and 2.3.2.5.", cabinetHotspots: [front.monitor2], diagramOccurrences: [occurrence("monitor-2", [front.monitor2.id])],
    indicators: monitorIndicators, controls: monitorControls, testPoints: monitorTestPoints, faceplate: "monitor",
  },
  {
    id: "rtc-1", shortName: "RTC 1", name: "Receiver / Transmitter Controller 1", assemblyIds: ["1A10", "030805-0001"],
    description: "Giải mã interrogation, tạo reply timing, điều khiển synthesizer/modulator TX1 và hiệu chỉnh pulse shape theo mẫu RF của mỗi lần phát.",
    manualReference: "Figures 2-8 to 2-10; Figure 3-64; Table 3-18; Section 2.3.2.4.", cabinetHotspots: [front.rtc1], diagramOccurrences: [occurrence("rtc-1", [front.rtc1.id])],
    indicators: rtcIndicators, controls: rtcControls, testPoints: rtcTestPoints, faceplate: "rtc",
  },
  {
    id: "rtc-2", shortName: "RTC 2", name: "Receiver / Transmitter Controller 2", assemblyIds: ["1A16", "030805-0001"],
    description: "Nhánh controller TX2, nhận interrogation qua LNA chung, điều khiển reply timing và vòng hiệu chỉnh pulse shape của transmitter 2.",
    manualReference: "Figures 2-8 to 2-10; Figure 3-64; Table 3-18; Section 2.3.2.4.", cabinetHotspots: [front.rtc2], diagramOccurrences: [occurrence("rtc-2", [front.rtc2.id])],
    indicators: rtcIndicators, controls: rtcControls, testPoints: rtcTestPoints, faceplate: "rtc",
  },
  {
    id: "rms", shortName: "RMS", name: "Remote Monitoring System Processor", assemblyIds: ["1A13", "012172-1001"],
    description: "Thu thập trạng thái của RTC/Monitor, điều phối cấu hình và station control, lưu dữ liệu bảo dưỡng và cung cấp giao tiếp PMDT.",
    manualReference: "Figure 2-14; Figure 3-66; Table 3-19; Section 2.3.2.6.", cabinetHotspots: [front.rms], diagramOccurrences: [occurrence("rms", [front.rms.id])],
    indicators: ["CPU OK / RMS OK (xanh): processor hoạt động bình thường.", "PWR OK (xanh): nguồn DC của RMS nằm trong dung sai."],
    controls: ["J2 AUX USB: dự phòng mở rộng.", "J1 PMDT USB: kết nối máy tính PMDT."], testPoints: [], faceplate: "rms",
  },
  {
    id: "lcu", shortName: "LCU", name: "Local Control Unit", assemblyIds: ["1A1", "030801-0001"],
    description: "Mặt điều khiển tại chỗ của trạm: hiển thị dữ liệu, chọn main/antenna/load/off cho hai transmitter, giám sát hai monitor và thực hiện các lệnh hệ thống.",
    manualReference: "Figure 3-54; Figures 3-60 and 3-61; Tables 3-13 to 3-15; Section 3.9.", cabinetHotspots: [front.lcu], diagramOccurrences: [occurrence("lcu", [front.lcu.id])],
    indicators: [
      "TRANSMITTER: đèn trong các nút MAIN SELECT, ANTENNA, LOAD và OFF xác nhận trạng thái tương ứng.",
      "MONITOR: NORMAL, PRIMARY/SECONDARY ALARM và BYPASS cho Integral/Standby monitor 1/2.",
      "SYSTEM: Maintenance Alert, Remote Control Fault, Battery Fault, On Battery, Interlocked Off và LCU Power On.",
    ],
    controls: [
      "MAIN SELECT 1/2; ANTENNA 1/2; LOAD 1/2; OFF 1/2.",
      "INTEGRAL BYPASS và STANDBY BYPASS.",
      "LOCAL CONTROL, ALARM SILENCE, LAMP TEST và RESET.",
      "VOLUME: potentiometer chỉnh mức báo động âm thanh.",
      "Touch display với Prev/Main/Next để xem dữ liệu monitor và trigger.",
    ], testPoints: [], faceplate: "lcu",
    notes: ["Faceplate trong explorer là bản dựng tĩnh theo manual; không thay thế logic LCU đang được mô phỏng ở màn PMDT."],
  },
  {
    id: "pmdt", shortName: "PMDT", name: "Portable Maintenance Data Terminal", assemblyIds: [],
    description: "Máy tính bảo dưỡng giao tiếp với RMS để điều khiển, cấu hình, đo lường và xem trạng thái của DME tại chỗ hoặc từ xa.",
    manualReference: "Sections 1.3.3 and 2.3; Figure 1-10.", cabinetHotspots: [], diagramOccurrences: [occurrence("pmdt")], indicators: [], controls: ["USB direct connection", "Remote modem/RCSU connection"], testPoints: [],
    notes: ["PMDT là thiết bị ngoài cabinet; chọn block này không làm sáng một LRU trong cabinet."],
  },
  {
    id: "tx-power-supply-1", shortName: "TX1 PS", name: "1500 W Power Supply 1", assemblyIds: ["1A24", "950909-0000"],
    description: "Nguồn AC/DC 1500 W của nhánh TX1, cấp đầu vào cho BCPS1 và hệ thống 48 VDC của transmitter 1.",
    manualReference: "Figure 1-3; Table 8-4; replacement procedure 7.7.12.", cabinetHotspots: [front.power1], diagramOccurrences: [occurrence("tx-power-supply-1", [front.power1.id])],
    indicators: ["Front status indication on the power module."], controls: ["AC input", "DC output to BCPS1"], testPoints: [], faceplate: "power-supply",
  },
  {
    id: "battery-1", shortName: "48 V BAT 1", name: "48 V Battery Bank 1", assemblyIds: [],
    description: "Bộ bốn battery 12 V mắc nối tiếp cung cấp nguồn no-break 48 VDC cho nhánh TX1 khi mất AC.",
    manualReference: "Table 1-1, paragraph 1.1.2; Figure 1-10.", cabinetHotspots: [], diagramOccurrences: [occurrence("battery-1")], indicators: [], controls: ["Battery disconnect through TX1 DC breaker"], testPoints: [],
    notes: ["Cấu hình lắp battery phụ thuộc installation kit; manual không chỉ ra một LRU mặt trước riêng trong Figure 1-3."],
  },
  {
    id: "bcps-1", shortName: "BCPS 1", name: "Battery Charging Power Supply 1", assemblyIds: ["1A20", "012170-1001"],
    description: "Chọn và điều chỉnh nguồn từ AC/DC supply hoặc battery cho TX1, đồng thời sạc battery khi AC hiện diện.",
    manualReference: "Figure 1-4; Figure 2-20; Section 1.2.1.9; Table 8-4.", cabinetHotspots: [rear.bcps1], diagramOccurrences: [occurrence("bcps-1", [rear.bcps1.id])],
    indicators: ["AC FAIL", "BATTERY FAULT", "ON BATTERY", "FAST CHARGE", "TRICKLE CHARGE - hiển thị tại Status Panel."], controls: ["BCPS calibration points are accessed during Section 6.3.3 procedures."], testPoints: [], faceplate: "bcps",
  },
  {
    id: "tx-power-supply-2", shortName: "TX2 PS", name: "1500 W Power Supply 2", assemblyIds: ["1A25", "950909-0000"],
    description: "Nguồn AC/DC 1500 W của nhánh TX2, cấp đầu vào cho BCPS2 và hệ thống 48 VDC của transmitter 2.",
    manualReference: "Figure 1-3; Table 8-4; replacement procedure 7.7.12.", cabinetHotspots: [front.power2], diagramOccurrences: [occurrence("tx-power-supply-2", [front.power2.id])],
    indicators: ["Front status indication on the power module."], controls: ["AC input", "DC output to BCPS2"], testPoints: [], faceplate: "power-supply",
  },
  {
    id: "battery-2", shortName: "48 V BAT 2", name: "48 V Battery Bank 2", assemblyIds: [],
    description: "Battery bank 48 V tùy chọn cho nhánh TX2; cấu hình tiêu chuẩn có thể dùng chung một bộ battery cho dual DME.",
    manualReference: "Table 1-1, paragraph 1.1.2; Figure 1-10.", cabinetHotspots: [], diagramOccurrences: [occurrence("battery-2")], indicators: [], controls: ["Battery disconnect through TX2 DC breaker"], testPoints: [],
    notes: ["Cấu hình battery thứ hai là tùy chọn theo manual."],
  },
  {
    id: "bcps-2", shortName: "BCPS 2", name: "Battery Charging Power Supply 2", assemblyIds: ["1A21", "012170-1001"],
    description: "Nhánh BCPS thứ hai, cấp 48 VDC cho TX2 và quản lý sạc/backup battery tương ứng.",
    manualReference: "Figure 1-4; Figure 2-20; Section 1.2.1.9; Table 8-4.", cabinetHotspots: [rear.bcps2], diagramOccurrences: [occurrence("bcps-2", [rear.bcps2.id])],
    indicators: ["AC FAIL", "BATTERY FAULT", "ON BATTERY", "FAST CHARGE", "TRICKLE CHARGE - hiển thị tại Status Panel."], controls: ["BCPS calibration points are accessed during Section 6.3.3 procedures."], testPoints: [], faceplate: "bcps",
  },
  {
    id: "interface-card", shortName: "IF CARD", name: "Interface Circuit Card", assemblyIds: ["1A19", "012167-0001"],
    description: "Bảo vệ và kết nối các tín hiệu Facilities/RMS/backplane với thiết bị ngoài: analog/digital I/O, sensors, RCSU, PMDT và Ethernet.",
    manualReference: "Figure 1-4; Figure 2-16; Section 1.2.1.8; replacement procedure 7.7.8.", cabinetHotspots: [rear.interface], diagramOccurrences: [occurrence("interface-card", [rear.interface.id])],
    indicators: [], controls: ["Spare analog/digital I/O", "RCSU RS232", "PMDT terminal", "Ethernet module", "Earth ground"], testPoints: [], faceplate: "interface",
  },
  {
    id: "co-located", shortName: "ILS / VOR", name: "Co-located ILS / VOR Interface", assemblyIds: [],
    description: "Trao đổi identification keying, interlock và trạng thái với VOR hoặc ILS đồng vị trí thông qua Interface CCA.",
    manualReference: "Sections 1.2, 1.3.2 and 9.5.15; Figure 1-10.", cabinetHotspots: [], diagramOccurrences: [occurrence("co-located")], indicators: [], controls: ["External keying", "Interlock input/output"], testPoints: [],
    notes: ["Đây là hệ thống ngoài cabinet DME."],
  },
  {
    id: "rcsu", shortName: "RCSU", name: "Remote Control and Status Unit", assemblyIds: [],
    description: "Cung cấp điều khiển ON/OFF và trạng thái từ xa; giao tiếp với DME qua Interface CCA.",
    manualReference: "Sections 1.4 and 3.6; Figure 1-10.", cabinetHotspots: [], diagramOccurrences: [occurrence("rcsu")], indicators: [], controls: ["Remote control/status communications"], testPoints: [],
    notes: ["RCSU là thiết bị ngoài cabinet."],
  },
  {
    id: "ethernet", shortName: "ETHERNET", name: "Ethernet Port", assemblyIds: ["1A19"],
    description: "Cổng Ethernet trên Interface CCA phục vụ đường truyền dữ liệu của hệ thống.",
    manualReference: "Section 1.2.1.8; Figure 1-10.", cabinetHotspots: [], diagramOccurrences: [occurrence("ethernet", [rear.interface.id])], indicators: [], controls: ["Ethernet connector on Interface CCA"], testPoints: [],
    notes: ["Sơ đồ chọn cổng Ethernet sẽ làm sáng assembly 1A19 chứa cổng này."],
  },
  {
    id: "facilities", shortName: "FACILITIES", name: "Facilities CCA", assemblyIds: ["1A14", "012171-0001"],
    description: "Cung cấp system I/O cho RMS, điều hòa các mức nguồn nội bộ và phát audio Ident được chọn từ RMS qua speaker mặt trước.",
    manualReference: "Figure 2-15; Figure 3-67; Table 3-20; Sections 1.2.1.7 and 2.3.2.7.", cabinetHotspots: [front.facilities], diagramOccurrences: [],
    indicators: ["PWR OK (xanh): các điện áp DC nằm trong dung sai."], controls: ["SPEAKER: phát DME 1 Ident hoặc DME 2 Ident theo lựa chọn RMS."], testPoints: [], faceplate: "facilities",
    notes: ["Facilities không được vẽ thành block riêng trên Figure 1-10; chọn trực tiếp tại cabinet để xem."],
  },
  {
    id: "ac-monitor", shortName: "AC MONITOR", name: "AC Power Monitor CCA", assemblyIds: ["1A22", "012186-0001"],
    description: "Đo điện áp và dòng AC của DME cùng obstruction lights; hỗ trợ photo-switch và chế độ bypass cho obstruction lighting.",
    manualReference: "Figure 1-3; Section 1.2.1.10; replacement procedure 7.7.11.", cabinetHotspots: [front.acMonitor], diagramOccurrences: [], indicators: [], controls: ["System AC sense", "Obstruction-light AC sense", "Photo-switch/bypass interface"], testPoints: [], faceplate: "ac-monitor",
    notes: ["AC Monitor gắn dọc bên phải ở mặt trước cabinet và không được vẽ thành block riêng trên Figure 1-10."],
  },
  {
    id: "status-panel", shortName: "STATUS PANEL", name: "Status / Power Panel Assembly", assemblyIds: ["1A26", "1A26A1", "1A26A2", "030813-0002"],
    description: "Tập trung circuit breaker AC/DC của TX1/TX2, status displays và convenience outlet ở phần dưới cabinet.",
    manualReference: "Figures 1-3 and 1-4; Table 8-4; Section 2.4.1; replacement procedure 7.7.13.", cabinetHotspots: [front.status, rear.statusDisplay2, rear.statusDisplay1], diagramOccurrences: [],
    indicators: ["TX1/TX2: AC FAIL, BATTERY FAULT, ON BATTERY, FAST CHARGE và TRICKLE CHARGE."], controls: ["TX1/TX2 AC circuit breakers", "TX1/TX2 DC battery-disconnect circuit breakers", "Charger reset", "Convenience outlet"], testPoints: [], faceplate: "status-panel",
    notes: ["Figure 1-4 cho thấy hai Status Display CCA 1A26A2 (trái ảnh rear) và 1A26A1 (phải ảnh rear).", "Status Panel không được vẽ thành block riêng trên Figure 1-10."],
  },
  {
    id: "fan-controller", shortName: "FAN CTRL", name: "Fan Controller CCA", assemblyIds: ["1A2A2", "012187-0001"],
    description: "Điều khiển và giám sát tối đa hai quạt của high-power rack; báo FANS_OK dựa trên tachometer của từng quạt.",
    manualReference: "Figure 1-4; Figure 2-19; Section 2.3.2.12; replacement procedure 7.7.14.", cabinetHotspots: [rear.fanController], diagramOccurrences: [],
    indicators: ["FANS_OK được đưa về Facilities CCA; không có LED mặt trước riêng được mô tả."], controls: ["P1 power/control", "TB1/TB2 fan power and tachometer"], testPoints: [], faceplate: "fan-controller",
    notes: ["Circulating fan assembly 1A2A3 do CCA này giám sát nhưng không còn hiển thị thành một Side View riêng."],
  },
] as const;

export const DME_1119A_BLOCK_BY_ID = new Map(
  DME_1119A_BLOCKS.map((block) => [block.id, block]),
);

export const DME_1119A_COMPONENT_TO_BLOCK = new Map<string, Dme1119aBlockId>(
  DME_1119A_BLOCKS.flatMap((block) =>
    block.diagramOccurrences.map((item) => [item.componentId, block.id] as const),
  ),
);

export const DME_1119A_HOTSPOT_TO_BLOCK = new Map<string, Dme1119aBlockId>(
  DME_1119A_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.map((item) => [item.id, block.id] as const),
  ),
);
