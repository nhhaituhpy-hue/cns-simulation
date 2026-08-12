export type Dvor1150BlockId =
  | "status-display"
  | "rf-monitor"
  | "csb-power-amplifier"
  | "frequency-synthesizer"
  | "sideband-generator"
  | "audio-generator"
  | "monitor-cca"
  | "modem"
  | "serial-interface"
  | "facilities"
  | "test-generator"
  | "rms-cpu"
  | "lvps"
  | "jack-assembly"
  | "bcps"
  | "power-panel"
  | "low-pass-filter"
  | "bidirectional-coupler"
  | "sideband-sample"
  | "pin-diode-driver"
  | "commutator-cca"
  | "field-detector"
  | "carrier-antenna"
  | "sideband-antennas"
  | "field-monitor-antenna";

export type Dvor1150CabinetSurface = "electronics" | "commutator";

export type Dvor1150CabinetKind =
  | "status"
  | "chassis"
  | "amplifier"
  | "module"
  | "card"
  | "power"
  | "rack-card"
  | "control"
  | "upgrade";

export interface Dvor1150CabinetHotspot {
  id: string;
  surface: Dvor1150CabinetSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  assemblyId: string;
  shortLabel: string;
  kind: Dvor1150CabinetKind;
}

export interface Dvor1150DiagramOccurrence {
  id: string;
  label: string;
  targetCabinetHotspotIds: readonly string[];
}

export interface Dvor1150WaveformReference {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  source: string;
}

export interface Dvor1150TestPoint {
  id: string;
  label: string;
  description: string;
  waveform?: Dvor1150WaveformReference;
}

export interface Dvor1150BlockDefinition {
  id: Dvor1150BlockId;
  shortName: string;
  name: string;
  assemblyIds: readonly string[];
  description: string;
  manualReference: string;
  cabinetHotspots: readonly Dvor1150CabinetHotspot[];
  diagramOccurrences: readonly Dvor1150DiagramOccurrence[];
  indicators: readonly string[];
  controls: readonly string[];
  testPoints: readonly Dvor1150TestPoint[];
  notes?: readonly string[];
}

const wf = {
  synthesizerQuadrature: {
    src: "/equipment/dvor-1150/waveforms/synthesizer-quadrature-figure-7-5.webp",
    width: 655,
    height: 550,
    alt: "Dạng sóng quadrature LSB hoặc USB của Synthesizer DVOR 1150",
    caption: "A4/A20 TP1 hoặc TP2 - LSB/USB quadrature",
    source: "Figure 7-5, PDF page 314 (manual page 7-8)",
  },
  sidebandDynamic: {
    src: "/equipment/dvor-1150/waveforms/sideband-dynamic-phase-figure-7-7.webp",
    width: 690,
    height: 565,
    alt: "Dạng sóng điện áp điều khiển pha động Sideband Generator DVOR 1150",
    caption: "A5/A6/A21/A22 TP1 hoặc TP10 - Dynamic Phase Control",
    source: "Figure 7-7, PDF page 315 (manual page 7-9)",
  },
  sidebandForward: {
    src: "/equipment/dvor-1150/waveforms/sideband-forward-power-figure-7-8.webp",
    width: 715,
    height: 600,
    alt: "Dạng sóng công suất thuận đã tách sóng của Sideband Generator DVOR 1150",
    caption: "A5/A6/A21/A22 TP5 hoặc TP6 - Forward Power Detected",
    source: "Figure 7-8, PDF page 316 (manual page 7-10)",
  },
  audioSinCos: {
    src: "/equipment/dvor-1150/waveforms/audio-360hz-sin-cos-figure-7-16-17.webp",
    width: 740,
    height: 1350,
    alt: "Dạng sóng 360 Hz sin và cos của Audio Generator DVOR 1150",
    caption: "A7/A23 TP7 và TP8 - 360 Hz sin/cos",
    source: "Figures 7-16 và 7-17, PDF page 320 (manual page 7-14)",
  },
  rfMonitorForward: {
    src: "/equipment/dvor-1150/waveforms/rf-monitor-carrier-forward-figure-7-3.webp",
    width: 715,
    height: 605,
    alt: "Dạng sóng carrier forward power của RF Monitor DVOR 1150",
    caption: "A2 TX1 FWD/TX2 FWD - 30% modulation tại 30 Hz",
    source: "Figure 7-3, PDF page 313 (manual page 7-7)",
  },
  rfMonitorReflected: {
    src: "/equipment/dvor-1150/waveforms/rf-monitor-carrier-reflected-figure-7-4.webp",
    width: 715,
    height: 600,
    alt: "Dạng sóng carrier reflected power của RF Monitor DVOR 1150",
    caption: "A2 TX1 REFLD/TX2 REFLD - VSWR 1.03:1",
    source: "Figure 7-4, PDF page 314 (manual page 7-8)",
  },
  monitorComposite: {
    src: "/equipment/dvor-1150/waveforms/monitor-composite-figure-7-30.webp",
    width: 740,
    height: 600,
    alt: "Dạng sóng composite tại TP5 của Monitor CCA DVOR 1150",
    caption: "A8/A24 TP5 - Composite Signal",
    source: "Figure 7-30, PDF page 327 (manual page 7-21)",
  },
} as const satisfies Record<string, Dvor1150WaveformReference>;

const occurrence = (
  id: string,
  label: string,
  ...targetCabinetHotspotIds: string[]
): Dvor1150DiagramOccurrence => ({ id, label, targetCabinetHotspotIds });

export const DVOR_1150_BLOCKS: readonly Dvor1150BlockDefinition[] = [
  {
    id: "status-display",
    shortName: "DISPLAY",
    name: "Status Display Panel Assembly",
    assemblyIds: ["1A1", "1A1A1", "1A1A2"],
    description:
      "Hai Display CCA cung cấp chỉ thị trực quan về trạng thái normal, alarm và bypass của hai monitor DVOR.",
    manualReference: "Sections 1.2.1.1, 2.3.2.18; Figure 1-4; Table 3-6",
    cabinetHotspots: [
      { id: "cabinet-display", surface: "electronics", x: 132, y: 64, width: 336, height: 74, assemblyId: "1A1", shortLabel: "STATUS DISPLAY", kind: "status" },
    ],
    diagramOccurrences: [occurrence("diagram-display", "DISPLAY 1A1A1/1A1A2", "cabinet-display")],
    indicators: [
      "Integral Normal 1 - sáng khi Monitor 1 bình thường",
      "Integral Alarm 1 - sáng khi Monitor 1 báo alarm",
      "Integral Normal 2 - sáng khi Monitor 2 bình thường",
      "Integral Alarm 2 - sáng khi Monitor 2 báo alarm",
      "Integral Bypass - sáng khi bypass đang hoạt động",
    ],
    controls: ["Integral Bypass switch"],
    testPoints: [],
  },
  {
    id: "rf-monitor",
    shortName: "RF MONITOR",
    name: "RF Monitor Assembly",
    assemblyIds: ["1A2"],
    description:
      "Phát hiện, khuếch đại và phân phối các mẫu RF. Chassis chứa tải giả carrier và các ngõ test để đo carrier/sideband forward và reflected power.",
    manualReference: "Sections 1.2.1.2, 2.3.2.8; Figures 2-25, 7-1 đến 7-4",
    cabinetHotspots: [
      { id: "cabinet-rf-monitor", surface: "electronics", x: 132, y: 146, width: 336, height: 82, assemblyId: "1A2", shortLabel: "RF MONITOR", kind: "chassis" },
    ],
    diagramOccurrences: [occurrence("diagram-rf-monitor", "RF MONITOR A2", "cabinet-rf-monitor")],
    indicators: [],
    controls: [],
    testPoints: [
      { id: "TX1 FWD / TX2 FWD", label: "Carrier Forward Power", description: "Mẫu công suất thuận carrier; waveform điển hình dùng 30% modulation tại 30 Hz.", waveform: wf.rfMonitorForward },
      { id: "TX1 REFLD / TX2 REFLD", label: "Carrier Reflected Power", description: "Biên độ phụ thuộc VSWR; Figure 7-4 minh họa VSWR 1.03:1.", waveform: wf.rfMonitorReflected },
      { id: "SB1-SB4 FWD/REFLD", label: "Sideband forward/reflected samples", description: "Các mức đã tách sóng phục vụ đo công suất và tính VSWR sideband." },
    ],
  },
  {
    id: "csb-power-amplifier",
    shortName: "CSB AMP",
    name: "CSB Power Amplifier Assembly",
    assemblyIds: ["1A3", "1A19"],
    description:
      "Khuếch đại carrier RF lên khoảng 120 W đồng thời điều chế biên độ bằng 30 Hz, keyed 1020 Hz và voice khi được sử dụng.",
    manualReference: "Sections 1.2.1.3, 2.3.2.3; Figure 2-13",
    cabinetHotspots: [
      { id: "cabinet-csb-1", surface: "electronics", x: 132, y: 246, width: 91, height: 188, assemblyId: "1A3", shortLabel: "CSB AMP 1", kind: "amplifier" },
      { id: "cabinet-csb-2", surface: "electronics", x: 132, y: 658, width: 91, height: 188, assemblyId: "1A19", shortLabel: "CSB AMP 2", kind: "amplifier" },
    ],
    diagramOccurrences: [occurrence("diagram-csb", "CSB POWER AMPLIFIER A3/A19", "cabinet-csb-1", "cabinet-csb-2")],
    indicators: [],
    controls: [],
    testPoints: [
      { id: "RF INPUT", label: "Carrier drive from synthesizer", description: "Carrier RF được điều chế trong exciter rồi đưa qua power amplifier CCA." },
      { id: "RF OUTPUT", label: "Modulated carrier output", description: "Mức công suất danh định hệ thống thường 100 W; amplifier có khả năng khoảng 120 W." },
    ],
  },
  {
    id: "frequency-synthesizer",
    shortName: "SYNTH",
    name: "Frequency Synthesizer Assembly",
    assemblyIds: ["1A4", "1A20"],
    description:
      "Tạo ba tần số RF được phát xạ: carrier, upper sideband và lower sideband. Các vòng PLL và feedback duy trì tần số, biên độ và quan hệ pha.",
    manualReference: "Sections 1.2.1.4, 2.3.2.1; Figures 2-3, 3-40; Table 3-9",
    cabinetHotspots: [
      { id: "cabinet-synth-1", surface: "electronics", x: 229, y: 246, width: 48, height: 188, assemblyId: "1A4", shortLabel: "SYNTH 1", kind: "module" },
      { id: "cabinet-synth-2", surface: "electronics", x: 229, y: 658, width: 48, height: 188, assemblyId: "1A20", shortLabel: "SYNTH 2", kind: "module" },
    ],
    diagramOccurrences: [occurrence("diagram-synth", "FREQUENCY SYNTHESIZER A4/A20", "cabinet-synth-1", "cabinet-synth-2")],
    indicators: [],
    controls: ["R81 - adjustment shown on the front panel", "J8 - Carrier Frequency, 10 mW typical"],
    testPoints: [
      { id: "TP1", label: "Lower Sideband Quadrature Signal", description: "Dạng tam giác khi Sideband 1 và 2 bằng biên độ và đồng pha.", waveform: wf.synthesizerQuadrature },
      { id: "TP2", label: "Upper Sideband Quadrature Signal", description: "Dạng tam giác khi Sideband 3 và 4 bằng biên độ và đồng pha.", waveform: wf.synthesizerQuadrature },
      { id: "TP3", label: "Carrier Phase Error Voltage", description: "Điện áp sai lệch pha carrier." },
      { id: "TP4", label: "Carrier Phase Control Voltage", description: "Điện áp điều khiển pha carrier." },
      { id: "TP5", label: "DVOR Sideband Manual Phase Control Voltage", description: "Điện áp điều khiển pha sideband bằng tay." },
      { id: "GND", label: "Measurement ground", description: "Điểm mass cho oscilloscope hoặc voltmeter." },
    ],
    notes: ["Table 3-9 gọi điểm mass là TP6; Figure 3-40 in nhãn GND trên panel."],
  },
  {
    id: "sideband-generator",
    shortName: "SIDEBAND",
    name: "Sideband Generator Assembly",
    assemblyIds: ["1A5", "1A6", "1A21", "1A22"],
    description:
      "Mỗi transmitter dùng hai assembly; một assembly xử lý Sideband 1/2 và assembly còn lại xử lý Sideband 3/4. Các controller tạo điều khiển pha động, pha mean và mức drive cho amplifier.",
    manualReference: "Sections 1.2.1.5, 2.3.2.6; Figures 2-20, 3-41; Table 3-10",
    cabinetHotspots: [
      { id: "cabinet-sideband-12-tx1", surface: "electronics", x: 283, y: 246, width: 54, height: 188, assemblyId: "1A5", shortLabel: "SB 1/2", kind: "module" },
      { id: "cabinet-sideband-34-tx1", surface: "electronics", x: 343, y: 246, width: 54, height: 188, assemblyId: "1A6", shortLabel: "SB 3/4", kind: "module" },
      { id: "cabinet-sideband-12-tx2", surface: "electronics", x: 283, y: 658, width: 54, height: 188, assemblyId: "1A21", shortLabel: "SB 1/2", kind: "module" },
      { id: "cabinet-sideband-34-tx2", surface: "electronics", x: 343, y: 658, width: 54, height: 188, assemblyId: "1A22", shortLabel: "SB 3/4", kind: "module" },
    ],
    diagramOccurrences: [occurrence("diagram-sideband", "SIDEBAND GENERATOR A5/A6/A21/A22", "cabinet-sideband-12-tx1", "cabinet-sideband-34-tx1", "cabinet-sideband-12-tx2", "cabinet-sideband-34-tx2")],
    indicators: [],
    controls: [
      "A1/A3 R18 và R24 - Sideband Carrier Balance",
      "A1/A3 R51 - Phase Detector DC offset",
      "A1/A3 R73 - Mean Phase Control Voltage Set",
      "A1/A3 R97 - Sideband Phase Zero",
      "A1/A3 R100 - Detector Calibration",
      "A1/A3 R102 - Dynamic Phase Control Voltage Set",
    ],
    testPoints: [
      { id: "TP1 / TP10", label: "Dynamic Phase Control Voltage", description: "TP1 cho SB1/SB3; TP10 cho SB2/SB4.", waveform: wf.sidebandDynamic },
      { id: "TP2 / TP9", label: "Sideband Manual Phase Control Voltage", description: "Điện áp DC đại diện cho phaser control voltage." },
      { id: "TP3 / TP8", label: "Mean Phase Control Voltage", description: "Điện áp DC điều khiển pha mean (slow)." },
      { id: "TP4 / TP7", label: "Mean Phase Error Voltage", description: "Khi vòng điều khiển khóa, điện áp phải gần 0 V." },
      { id: "TP5 / TP6", label: "Forward Power Detected", description: "Dạng sóng 360 Hz chỉnh lưu ở chế độ DVOR.", waveform: wf.sidebandForward },
      { id: "GND", label: "Measurement ground", description: "Điểm mass cho oscilloscope hoặc voltmeter." },
    ],
  },
  {
    id: "audio-generator",
    shortName: "AUDIO",
    name: "Audio Generator CCA",
    assemblyIds: ["1A7", "1A23"],
    description:
      "Phát và điều khiển các tín hiệu audio của DVOR; tạo carrier modulation, 360 Hz sin/cos, ident/voice và xử lý các mức DC đại diện cho power, modulation và VSWR.",
    manualReference: "Sections 1.2.1.6, 2.3.2.2; Figure 2-7; Figures 7-10 đến 7-21",
    cabinetHotspots: [
      { id: "cabinet-audio-1", surface: "electronics", x: 403, y: 246, width: 38, height: 188, assemblyId: "1A7", shortLabel: "AUDIO 1", kind: "card" },
      { id: "cabinet-audio-2", surface: "electronics", x: 403, y: 658, width: 38, height: 188, assemblyId: "1A23", shortLabel: "AUDIO 2", kind: "card" },
    ],
    diagramOccurrences: [occurrence("diagram-audio", "AUDIO GENERATOR A7/A23", "cabinet-audio-1", "cabinet-audio-2")],
    indicators: [],
    controls: [],
    testPoints: [
      { id: "TP7", label: "360 Hz sin", description: "Tín hiệu sin 360 Hz cấp cho tuyến sideband.", waveform: wf.audioSinCos },
      { id: "TP8", label: "360 Hz cos", description: "Tín hiệu cos 360 Hz lệch pha với TP7.", waveform: wf.audioSinCos },
      { id: "TP9", label: "1020 Hz Identity Tone", description: "Tín hiệu nhận dạng 1020 Hz." },
      { id: "TP10", label: "30 Hz Reference Signal", description: "Tín hiệu tham chiếu 30 Hz." },
    ],
  },
  {
    id: "monitor-cca",
    shortName: "MONITOR",
    name: "VOR Monitor CCA",
    assemblyIds: ["1A8", "1A24"],
    description:
      "Hai monitor hoạt động độc lập, phân tích tín hiệu RF đã tách sóng từ field detector và phát alarm khi DVOR vượt giới hạn cho phép.",
    manualReference: "Sections 1.2.1.7, 2.3.2.21; Table 3-8; Figures 7-27 đến 7-48",
    cabinetHotspots: [
      { id: "cabinet-monitor-1", surface: "electronics", x: 447, y: 246, width: 32, height: 188, assemblyId: "1A8", shortLabel: "MON 1", kind: "card" },
      { id: "cabinet-monitor-2", surface: "electronics", x: 447, y: 658, width: 32, height: 188, assemblyId: "1A24", shortLabel: "MON 2", kind: "card" },
    ],
    diagramOccurrences: [occurrence("diagram-monitor", "MONITOR A8/A24", "cabinet-monitor-1", "cabinet-monitor-2")],
    indicators: ["Integral Fault LED - sáng khi Monitor CCA phát hiện Integral Fault"],
    controls: [],
    testPoints: [
      { id: "TP1", label: "Detected Voice+", description: "Tín hiệu Voice+ từ differential transformer driver." },
      { id: "TP2", label: "Detected Voice-", description: "Tín hiệu Voice- từ differential transformer driver." },
      { id: "TP3", label: "Detected Audio Signal Level", description: "Mức tín hiệu audio đã tách sóng." },
      { id: "TP4", label: "Detected Notch Data", description: "Bao gồm 720 Hz và 1440 Hz; xuất hiện notch khi một antenna không hoạt động." },
      { id: "TP5", label: "Composite Audio", description: "Bao gồm DC, 30 Hz, 9960 Hz và Ident.", waveform: wf.monitorComposite },
      { id: "TP6", label: "30 Hz AM", description: "Tín hiệu 30 Hz chỉnh lưu bán kỳ dùng đo mức AM." },
      { id: "TP7", label: "30 Hz AM square wave", description: "Đưa vào microprocessor để đo góc." },
      { id: "TP8", label: "Ident Signal Level", description: "1020 Hz sau band-pass filter; xuất hiện khi keying được phát hiện." },
      { id: "TP9", label: "1020 Hz square wave", description: "Tín hiệu vuông 1020 Hz." },
      { id: "TP10", label: "Ident Modulation Level Voltage", description: "Điện áp đạt đỉnh khi keying và suy giảm khi keying dừng." },
      { id: "TP11", label: "9960 Hz after band-pass filter", description: "Tín hiệu 9960 Hz sau lọc." },
      { id: "TP12", label: "9960 Hz one-shot output", description: "Tín hiệu sau one-shot multivibrator." },
      { id: "TP13", label: "30 Hz FM", description: "Tín hiệu chỉnh lưu bán kỳ dùng đo deviation ratio." },
      { id: "TP14", label: "9960 Hz signal level", description: "Điện áp DC đại diện cho mức 9960 Hz." },
      { id: "TP15", label: "30 Hz FM square wave", description: "Đưa vào microprocessor để đo góc." },
      { id: "TP0", label: "Measurement ground", description: "Điểm mass cho oscilloscope hoặc voltmeter." },
    ],
  },
  {
    id: "modem",
    shortName: "MODEM",
    name: "Modem CCA",
    assemblyIds: ["1A9"],
    description:
      "Chứa Serial Communications Controller và dial-up modem, tạo giao diện giữa hệ thống DVOR và terminal máy tính ở xa.",
    manualReference: "Sections 1.2.1.8, 2.3.2.14; Figure 2-32",
    cabinetHotspots: [
      { id: "cabinet-modem", surface: "electronics", x: 188, y: 474, width: 28, height: 150, assemblyId: "1A9", shortLabel: "MODEM", kind: "card" },
    ],
    diagramOccurrences: [],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "serial-interface",
    shortName: "SERIAL",
    name: "Serial Interface CCA",
    assemblyIds: ["1A10"],
    description:
      "Cung cấp liên lạc hai chiều giữa CPU với video terminal, DME đồng vị trí, hai Audio Generator và hai VOR Monitor.",
    manualReference: "Sections 1.2.1.9, 2.3.2.12; Figure 2-30",
    cabinetHotspots: [
      { id: "cabinet-serial", surface: "electronics", x: 220, y: 474, width: 28, height: 150, assemblyId: "1A10", shortLabel: "SERIAL", kind: "card" },
    ],
    diagramOccurrences: [],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "facilities",
    shortName: "FACILITIES",
    name: "Facilities CCA",
    assemblyIds: ["1A11"],
    description:
      "Thu thập trạng thái hệ thống cho CPU; xử lý transfer status, BCPS on/off, driver LED display, RSCU control và trạng thái nguồn.",
    manualReference: "Sections 1.2.1.10, 2.3.2.11; Figure 2-29",
    cabinetHotspots: [
      { id: "cabinet-facilities", surface: "electronics", x: 284, y: 474, width: 28, height: 150, assemblyId: "1A11", shortLabel: "FAC", kind: "card" },
    ],
    diagramOccurrences: [],
    indicators: [], controls: [],
    testPoints: [{ id: "TP1", label: "Two-second period", description: "Waveform bảo dưỡng được minh họa tại Figure 7-22." }],
  },
  {
    id: "test-generator",
    shortName: "TEST GEN",
    name: "Test Generator CCA",
    assemblyIds: ["1A12"],
    description:
      "Tạo tín hiệu tham chiếu chuẩn để monitor tự hiệu chuẩn và tạo các tín hiệu biến đổi được để kiểm tra ngưỡng alarm theo lệnh kỹ thuật viên.",
    manualReference: "Sections 1.2.1.11, 2.3.2.13; Figure 2-31; Figures 7-23 đến 7-26",
    cabinetHotspots: [
      { id: "cabinet-test-generator", surface: "electronics", x: 316, y: 474, width: 28, height: 150, assemblyId: "1A12", shortLabel: "TEST", kind: "card" },
    ],
    diagramOccurrences: [],
    indicators: [], controls: [],
    testPoints: [
      { id: "TP1", label: "Monitor calibration composite", description: "Tín hiệu chuẩn hoặc tín hiệu cấu hình để kiểm tra monitor." },
      { id: "TP2", label: "Sync Signal", description: "Tín hiệu đồng bộ cho đo kiểm." },
      { id: "TP3", label: "983.04 kHz Clock", description: "Clock của Test Generator." },
    ],
  },
  {
    id: "rms-cpu",
    shortName: "RMS / CPU",
    name: "Remote Maintenance System Processor / CPU CCA",
    assemblyIds: ["1A13"],
    description:
      "Xử lý command, control, communications và information của toàn hệ thống; lưu trạng thái và điều phối trao đổi với các thiết bị ngoài.",
    manualReference: "Sections 1.2.1.12, 2.3.2.9; Figure 2-27; Table 3-7",
    cabinetHotspots: [
      { id: "cabinet-rms-cpu", surface: "electronics", x: 348, y: 474, width: 34, height: 150, assemblyId: "1A13", shortLabel: "CPU", kind: "card" },
    ],
    diagramOccurrences: [occurrence("diagram-rms", "SYSTEM CONTROL AND INTERFACE PROCESSOR", "cabinet-rms-cpu")],
    indicators: ["CPU Fault LED - màu đỏ khi processor reset do mất nguồn hoặc lỗi bộ nhớ"],
    controls: [],
    testPoints: [{ id: "BATTERY", label: "CPU backup battery", description: "Section 6.2.12 yêu cầu điện áp vỏ battery lớn hơn 2.0 Vdc." }],
    notes: ["Manual ghi chú thuật ngữ SCIP đã được thay bằng RMS để thống nhất với dòng sản phẩm 2100 ILS."],
  },
  {
    id: "lvps",
    shortName: "LVPS",
    name: "Low Voltage Power Supply CCA",
    assemblyIds: ["1A14", "1A15", "1A16"],
    description:
      "Ba LVPS giống nhau cấp các rail điện áp thấp. 1A14 cấp +/-12 Vdc và +5 Vdc cho RMS card cage; 1A15 và 1A16 lần lượt cấp nguồn cho transmitter 1 và 2.",
    manualReference: "Sections 1.2.1.13, 2.3.2.16; Figure 2-34",
    cabinetHotspots: [
      { id: "cabinet-lvps-rms", surface: "electronics", x: 386, y: 474, width: 28, height: 150, assemblyId: "1A14", shortLabel: "LVPS RMS", kind: "card" },
      { id: "cabinet-lvps-1", surface: "electronics", x: 418, y: 474, width: 28, height: 150, assemblyId: "1A15", shortLabel: "LVPS TX1", kind: "card" },
      { id: "cabinet-lvps-2", surface: "electronics", x: 450, y: 474, width: 28, height: 150, assemblyId: "1A16", shortLabel: "LVPS TX2", kind: "card" },
    ],
    diagramOccurrences: [],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "jack-assembly",
    shortName: "JACK ASSY",
    name: "Jack Assembly",
    assemblyIds: ["1A38"],
    description:
      "Điểm đấu nối chung cho audio: J1 nhận microphone tại chỗ và ngắt microphone remote khi cắm; J2 cho phép nghe audio đã tách sóng từ monitor đang điều khiển.",
    manualReference: "Section 2.3.2.17; Figure 11-29 referenced but absent from this PDF",
    cabinetHotspots: [
      { id: "cabinet-jack", surface: "electronics", x: 132, y: 474, width: 48, height: 150, assemblyId: "1A38", shortLabel: "MIC / AUDIO", kind: "chassis" },
    ],
    diagramOccurrences: [],
    indicators: [],
    controls: ["J1 - microphone input", "J2 - detected audio/headset output"],
    testPoints: [],
  },
  {
    id: "bcps",
    shortName: "BCPS",
    name: "Battery Charger Power Subsystem",
    assemblyIds: ["1A33", "1A34"],
    description:
      "Hai nguồn dự phòng độc lập cấp DC không gián đoạn +28 V và +43/48 V, đồng thời nạp battery khi có nguồn AC.",
    manualReference: "Section 1.2.1.15; Figure 2-44",
    cabinetHotspots: [
      { id: "cabinet-bcps-main", surface: "electronics", x: 306, y: 866, width: 82, height: 74, assemblyId: "1A33", shortLabel: "BCPS MAIN", kind: "power" },
      { id: "cabinet-bcps-standby", surface: "electronics", x: 394, y: 866, width: 82, height: 74, assemblyId: "1A34", shortLabel: "BCPS STBY", kind: "power" },
    ],
    diagramOccurrences: [],
    indicators: [], controls: [],
    testPoints: [{ id: "DC BUS", label: "+43/48 Vdc supply", description: "Table 4-1 quy định 48 Vdc +/-10%." }],
  },
  {
    id: "power-panel",
    shortName: "POWER",
    name: "Power Control Panel",
    assemblyIds: ["A18"],
    description:
      "Panel bản lề ở đáy cabinet chứa các circuit breaker AC input và DC input cho hai BCPS.",
    manualReference: "Sections 1.2.1.16, 3.6; Figure 1-4; Table 3-6",
    cabinetHotspots: [
      { id: "cabinet-power-panel", surface: "electronics", x: 132, y: 856, width: 168, height: 84, assemblyId: "A18", shortLabel: "POWER CONTROL", kind: "power" },
    ],
    diagramOccurrences: [],
    indicators: [],
    controls: [
      "TX1 AC - cấp AC và nạp Battery Set 1",
      "TX1 DC - nối BCPS 1 với battery",
      "TX2 AC - cấp AC và nạp Battery Set 2",
      "TX2 DC - nối BCPS 2 với battery",
    ],
    testPoints: [],
  },
  {
    id: "low-pass-filter",
    shortName: "LPF",
    name: "Low Pass Filter Assembly",
    assemblyIds: ["1A35", "1A36"],
    description:
      "Bộ lọc bốn cực loại bỏ năng lượng hài trên 250 MHz; J3 lấy carrier feedback và J4 đưa mẫu 100-300 mW về RF Monitor ở mức carrier 100 W.",
    manualReference: "Sections 2.3.2.4, 2.3.2.4.1; Figure 11-28 referenced but absent from this PDF",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("diagram-low-pass", "LOW PASS FILTER A35/A36")],
    indicators: [], controls: [],
    testPoints: [
      { id: "J3", label: "Carrier feedback", description: "Pickup-loop output trở về Frequency Synthesizer." },
      { id: "J4", label: "RF Monitor sample", description: "Khoảng 100-300 mW khi carrier output là 100 W." },
    ],
  },
  {
    id: "bidirectional-coupler",
    shortName: "COUPLER",
    name: "Bi-Directional Coupler",
    assemblyIds: ["1DC1", "1DC2"],
    description:
      "Lấy mẫu cố định của carrier forward và reflected power với insertion loss không đáng kể, đưa mẫu đến RF Monitor để phát hiện và phân tích.",
    manualReference: "Section 2.3.2.5; Figure 2-2",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("diagram-coupler", "BI-DIRECTIONAL COUPLER DC1/DC2")],
    indicators: [], controls: [],
    testPoints: [
      { id: "FWD", label: "Forward RF sample", description: "Mẫu tỷ lệ cố định của công suất carrier thuận." },
      { id: "REV", label: "Reflected RF sample", description: "Mẫu tỷ lệ cố định của công suất carrier phản xạ." },
    ],
  },
  {
    id: "sideband-sample",
    shortName: "SB SAMPLE",
    name: "Sideband Sample Assembly",
    assemblyIds: ["1A29", "1A30", "1A31", "1A32"],
    description:
      "Trộn một phần của hai tín hiệu USB hoặc hai tín hiệu LSB để tạo feedback hiệu chỉnh sai lệch, gửi trở lại Frequency Synthesizer.",
    manualReference: "Section 2.3.1; Figure 2-2",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("diagram-sideband-sample", "SIDEBAND SAMPLE ASSY A29-A32")],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "pin-diode-driver",
    shortName: "PIN DRIVER",
    name: "PIN Diode Driver CCA",
    assemblyIds: ["2A1", "2A1A1"],
    description:
      "Nhận mã vị trí chuyển mạch từ transmitter cabinet và điều khiển hai Commutator CCA qua ribbon cable; hỗ trợ Automatic Ground Check trên phiên bản nâng cấp.",
    manualReference: "Sections 1.2.2.2, 1.2.2.2.1, 1.2.2.2.2; Figure 2-45",
    cabinetHotspots: [
      { id: "commutator-driver", surface: "commutator", x: 130, y: 470, width: 340, height: 142, assemblyId: "2A1 / 2A1A1", shortLabel: "CONTROL / PIN DIODE DRIVER", kind: "control" },
    ],
    diagramOccurrences: [occurrence("diagram-pin-driver", "PIN DIODE DRIVER 2A1", "commutator-driver")],
    indicators: [], controls: ["Automatic Ground Check enable/disable strap"],
    testPoints: [],
  },
  {
    id: "commutator-cca",
    shortName: "COMMUTATOR",
    name: "Commutator CCA",
    assemblyIds: ["2A2", "2A3"],
    description:
      "Hai CCA chuyển mạch RF sideband tới 48 antenna: 2A2 điều khiển các antenna số lẻ và 2A3 điều khiển các antenna số chẵn.",
    manualReference: "Sections 1.2.2.3, 2.4.3; Figures 1-5, 2-46",
    cabinetHotspots: [
      { id: "commutator-odd", surface: "commutator", x: 130, y: 84, width: 340, height: 372, assemblyId: "2A2", shortLabel: "ODD ANTENNAS", kind: "rack-card" },
      { id: "commutator-even", surface: "commutator", x: 130, y: 628, width: 340, height: 292, assemblyId: "2A3", shortLabel: "EVEN ANTENNAS", kind: "rack-card" },
    ],
    diagramOccurrences: [occurrence("diagram-commutator", "COMMUTATOR CCA 2A2/2A3", "commutator-odd", "commutator-even")],
    indicators: [], controls: [],
    testPoints: [
      { id: "RF OUTPUTS", label: "48 sideband antenna feeds", description: "Mỗi CCA có 27 đầu nối RF loại N và hai đầu nối D-shell 36 pin." },
    ],
  },
  {
    id: "field-detector",
    shortName: "FIELD DET",
    name: "Field Detector Assembly",
    assemblyIds: ["2A6A1", "2A6A2"],
    description:
      "Hai detector nhận tín hiệu VOR từ field monitor antenna, phát hiện RF và gửi hai tín hiệu độc lập về các VOR Monitor để xử lý.",
    manualReference: "Sections 1.2.2.4, 1.2.2.4.3, 2.4.4.2; Figure 2-37",
    cabinetHotspots: [
      { id: "commutator-field-detectors", surface: "commutator", x: 486, y: 476, width: 72, height: 128, assemblyId: "2A6A1/A2", shortLabel: "FIELD DET 1/2", kind: "upgrade" },
    ],
    diagramOccurrences: [occurrence("diagram-field-detector", "FIELD DETECTOR 2A6A1/2A6A2", "commutator-field-detectors")],
    indicators: [], controls: [], testPoints: [],
    notes: ["Figure 1-5 thể hiện rack đời cũ; vị trí bên hông mô tả monitor-interface upgrade của phiên bản hiện hành theo Section 1.2.2.1."],
  },
  {
    id: "carrier-antenna",
    shortName: "CARRIER ANT",
    name: "Carrier Antenna",
    assemblyIds: [],
    description:
      "Antenna carrier đặt tại tâm counterpoise, phát thành phần carrier của tín hiệu DVOR.",
    manualReference: "Sections 1.2.4, 1.2.4.1; Figure 2-2",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("diagram-carrier-antenna", "CARRIER ANTENNA")],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "sideband-antennas",
    shortName: "ANT 1-48",
    name: "Sideband Antenna Array",
    assemblyIds: ["ANTENNAS 1-48"],
    description:
      "48 antenna sideband bố trí đều trên vòng tròn đường kính 44 ft đồng tâm với carrier antenna.",
    manualReference: "Section 1.2.4; Figure 2-2",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("diagram-sideband-antennas", "SIDEBAND ANTENNAS 1-48")],
    indicators: [], controls: [], testPoints: [],
  },
  {
    id: "field-monitor-antenna",
    shortName: "FIELD MON",
    name: "Field Monitor Antenna",
    assemblyIds: [],
    description:
      "Thu tín hiệu DVOR bức xạ tại vị trí giám sát ngoài hiện trường và đưa RF về hai Field Detector.",
    manualReference: "Sections 1.2.2.4.3, 1.2.4; Figure 2-2",
    cabinetHotspots: [],
    diagramOccurrences: [occurrence("diagram-field-monitor", "FIELD MONITOR ANTENNA")],
    indicators: [], controls: [], testPoints: [],
  },
] as const;

export const DVOR_1150_BLOCK_BY_ID = new Map(
  DVOR_1150_BLOCKS.map((block) => [block.id, block]),
);

export const DVOR_1150_HOTSPOT_TO_BLOCK = new Map(
  DVOR_1150_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.map((hotspot) => [hotspot.id, block.id] as const),
  ),
);
