export type DvorBlockId =
  | "lcu"
  | "synthesizer"
  | "audio-generator"
  | "carrier-amplifier"
  | "sideband"
  | "rf-monitor"
  | "rms"
  | "bcps"
  | "commutator-controller"
  | "rf-switch"
  | "antenna-bank"
  | "monitor-cca"
  | "interface-cca"
  | "lvps";
export type CabinetFace = "front" | "rear";

export interface DvorHotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  targetCabinetHotspotId?: string;
}

/**
 * Stable identity for one occurrence of a DVOR block in the source diagram
 * and, when available, its matching cabinet location. Scenario answers use
 * these IDs instead of array indexes so TX1/TX2 and Monitor 1/2 remain
 * distinguishable.
 */
export interface DvorHardwareOccurrence {
  blockId: DvorBlockId;
  diagramHotspotId: string;
  cabinetHotspotId: string | null;
}

export function dvorHardwareOccurrenceKey(
  occurrence: DvorHardwareOccurrence,
): string {
  return [
    occurrence.blockId,
    occurrence.diagramHotspotId,
    occurrence.cabinetHotspotId ?? "none",
  ].join("::");
}

export interface DvorWaveformReference {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

export interface DvorTestPoint {
  id: string;
  label: string;
  nominal: string;
  waveform?: DvorWaveformReference;
}

export interface DvorBlockDefinition {
  id: DvorBlockId;
  shortName: string;
  name: string;
  assemblyIds: readonly string[];
  description: string;
  manualReference: string;
  cabinetFace: CabinetFace;
  cabinetHotspots: readonly DvorHotspot[];
  diagramHotspots: readonly DvorHotspot[];
  indicators: readonly string[];
  testPoints: readonly DvorTestPoint[];
  faceImage?: {
    src: string;
    width: number;
    height: number;
    figure: string;
  };
}

export const DVOR_BLOCKS: readonly DvorBlockDefinition[] = [
  {
    id: "lcu",
    shortName: "LCU",
    name: "Local Control Unit",
    assemblyIds: ["1A1"],
    description: "Điều khiển tại chỗ, lựa chọn máy phát, tuyến Antenna/Load/Off và hiển thị dữ liệu giám sát cơ bản.",
    manualReference: "Mục 3.8.2, Figure 3-56 đến Figure 3-63",
    cabinetFace: "front",
    cabinetHotspots: [{ id: "lcu-1a1", x: 29.5, y: 8.4, width: 41, height: 10.8, label: "1A1" }],
    diagramHotspots: [{ id: "diagram-lcu", x: 0, y: 0, width: 0, height: 0, label: "LOCAL CONTROL UNIT", targetCabinetHotspotId: "lcu-1a1" }],
    indicators: ["LOCAL CONTROL", "INTEGRAL NORMAL", "MAINTENANCE ALERT", "LCU POWER OK"],
    testPoints: [],
  },
  {
    id: "synthesizer",
    shortName: "SYNTH",
    name: "Synthesizer CCA",
    assemblyIds: ["1A3A1", "1A3A11"],
    description: "Tạo tín hiệu RF carrier và các tín hiệu điều khiển pha cho tuyến carrier/sideband của từng máy phát.",
    manualReference: "Mục 3.8.8, Figure 3-69 và Table 3-13",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "synth-1a3a1", x: 32.1, y: 26.1, width: 3.4, height: 16.5, label: "1A3A1" },
      { id: "synth-1a3a11", x: 64.5, y: 26.1, width: 3.4, height: 16.5, label: "1A3A11" },
    ],
    diagramHotspots: [
      { id: "diagram-synth-1", x: 5.5, y: 69.5, width: 15.7, height: 10.2, label: "SYNTH TX1", targetCabinetHotspotId: "synth-1a3a1" },
      { id: "diagram-synth-2", x: 78.4, y: 69.5, width: 15.7, height: 10.2, label: "SYNTH TX2", targetCabinetHotspotId: "synth-1a3a11" },
    ],
    indicators: ["POWER OK"],
    testPoints: [
      { id: "TP1", label: "Carrier Phase Error Voltage", nominal: "0.0 ± 0.05 VDC" },
      { id: "TP2", label: "Carrier Phase Control Voltage", nominal: "2-8 VDC" },
      { id: "TP3", label: "DVOR Sideband to Carrier Phase Control Voltage", nominal: "Tài liệu không quy định giá trị danh định" },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/synthesizer.png", width: 480, height: 1948, figure: "Figure 3-69" },
  },
  {
    id: "audio-generator",
    shortName: "AUDIO GEN",
    name: "Audio Generator CCA",
    assemblyIds: ["1A3A2", "1A3A9"],
    description: "Tạo tín hiệu điều chế carrier, voice/ident và tín hiệu đồng bộ 30 Hz cho mỗi tuyến máy phát.",
    manualReference: "Mục 3.8.10, Figure 3-71 và Table 3-15",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "audio-1a3a2", x: 35.5, y: 26.1, width: 3.4, height: 16.5, label: "1A3A2" },
      { id: "audio-1a3a9", x: 61.1, y: 26.1, width: 3.4, height: 16.5, label: "1A3A9" },
    ],
    diagramHotspots: [
      { id: "diagram-audio-1", x: 9.6, y: 84.5, width: 30.4, height: 9, label: "AUDIO GENERATOR TX1", targetCabinetHotspotId: "audio-1a3a2" },
      { id: "diagram-audio-2", x: 60, y: 84.5, width: 30.2, height: 9, label: "AUDIO GENERATOR TX2", targetCabinetHotspotId: "audio-1a3a9" },
    ],
    indicators: ["CPU OK"],
    testPoints: [
      { id: "TP1", label: "Carrier Amplifier Modulation", nominal: "30 Hz composite" },
      { id: "TP2", label: "Voice/Ident Modulation", nominal: "1020 Hz + voice" },
      { id: "TP3", label: "Oscilloscope Synchronization", nominal: "30 Hz" },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/audio-generator.png", width: 266, height: 1962, figure: "Figure 3-71" },
  },
  {
    id: "carrier-amplifier",
    shortName: "CARRIER AMP",
    name: "Carrier Amplifier Assembly",
    assemblyIds: ["1A5A3", "1A5A4"],
    description: "Khuếch đại tín hiệu CSB lên công suất phát và cung cấp ngõ lấy mẫu RF/detected CSB cho đo kiểm.",
    manualReference: "Mục 3.8.4, Figure 3-65 và Table 3-9",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "carrier-1a5a3", x: 49.2, y: 64, width: 9.2, height: 15.1, label: "1A5A3" },
      { id: "carrier-1a5a4", x: 58.5, y: 64, width: 9.2, height: 15.1, label: "1A5A4" },
    ],
    diagramHotspots: [
      { id: "diagram-carrier-1", x: 26.4, y: 69.5, width: 16.9, height: 10.2, label: "CARRIER AMP TX1", targetCabinetHotspotId: "carrier-1a5a3" },
      { id: "diagram-carrier-2", x: 56.3, y: 69.5, width: 17.1, height: 10.2, label: "CARRIER AMP TX2", targetCabinetHotspotId: "carrier-1a5a4" },
    ],
    indicators: ["DC POWER OK"],
    testPoints: [
      {
        id: "P1",
        label: "CSB Sample",
        nominal: "100-300 mW",
        waveform: {
          src: "/equipment/dvor-1150a/waveforms/carrier-csb-sample.png",
          width: 479,
          height: 321,
          alt: "Dạng sóng đo thực tế tại P1 CSB Sample của Carrier Amplifier DVOR 1150A",
          caption: "P1 · CSB Sample — ảnh đo tham khảo thực tế",
        },
      },
      { id: "DETECTED CSB", label: "Detected RF Video", nominal: "Điều chế CSB" },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/carrier-amplifier.png", width: 612, height: 1890, figure: "Figure 3-65" },
  },
  {
    id: "sideband",
    shortName: "SIDEBAND",
    name: "Sideband Amplifier / Generator Assembly",
    assemblyIds: ["1A4A1", "1A4A2", "1A4A6", "1A4A7"],
    description: "Tạo và khuếch đại bốn tín hiệu sideband, điều khiển pha và cấp tín hiệu RF đến bộ chuyển mạch/commutator.",
    manualReference: "Mục 3.8.9, Figure 3-70, Table 3-14 và quy trình alignment 6.4.24",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "sideband-1a4a1", x: 31.9, y: 42.4, width: 5.8, height: 16.6, label: "1A4A1" },
      { id: "sideband-1a4a2", x: 37.8, y: 42.4, width: 5.8, height: 16.6, label: "1A4A2" },
      { id: "sideband-1a4a6", x: 56.6, y: 42.4, width: 5.8, height: 16.6, label: "1A4A6" },
      { id: "sideband-1a4a7", x: 62.5, y: 42.4, width: 5.8, height: 16.6, label: "1A4A7" },
    ],
    diagramHotspots: [
      { id: "diagram-sideband-12", x: 0, y: 0, width: 0, height: 0, label: "SIDEBAND 1 / 2", targetCabinetHotspotId: "sideband-1a4a1" },
      { id: "diagram-sideband-34", x: 0, y: 0, width: 0, height: 0, label: "SIDEBAND 3 / 4", targetCabinetHotspotId: "sideband-1a4a2" },
      { id: "diagram-sideband-12-tx2", x: 0, y: 0, width: 0, height: 0, label: "SIDEBAND 1 / 2 TX2", targetCabinetHotspotId: "sideband-1a4a6" },
      { id: "diagram-sideband-34-tx2", x: 0, y: 0, width: 0, height: 0, label: "SIDEBAND 3 / 4 TX2", targetCabinetHotspotId: "sideband-1a4a7" },
    ],
    indicators: ["DC POWER OK"],
    testPoints: [
      { id: "TP0", label: "Ground", nominal: "Điểm mass cho máy đo/dao động ký" },
      { id: "TP1 / TP7", label: "Phase Detector Voltage", nominal: "0.90-0.95 VDC khi vòng khóa" },
      {
        id: "TP2 / TP8",
        label: "Detected Sideband Output",
        nominal: "Dạng sóng chỉnh lưu 360 Hz ở chế độ DVOR; không phải mức DC cố định",
        waveform: {
          src: "/equipment/dvor-1150a/waveforms/sideband-tp2-tp8.png",
          width: 456,
          height: 308,
          alt: "Dạng sóng đo thực tế tại TP2 hoặc TP8 của khối Sideband DVOR 1150A",
          caption: "TP2 / TP8 · Detected Sideband Output — ảnh đo tham khảo thực tế",
        },
      },
      { id: "TP3 / TP9", label: "Manual Phase Control Voltage", nominal: "Điện áp DC điều khiển pha; manual không quy định giá trị danh định" },
      { id: "TP4 / TP10", label: "Mean Phase Control Voltage", nominal: "2-9 VDC khi alignment (Table 3-14 nêu dải chung 2-10 VDC)" },
      { id: "TP5 / TP11", label: "Phase Error Voltage", nominal: "0.89-0.91 VDC khi vòng khóa" },
      { id: "TP6", label: "Sideband-to-Sideband Phase Error Voltage", nominal: "0.0 ± 0.1 VDC khi cân chỉnh về 0°" },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/sideband-generator.png", width: 476, height: 2266, figure: "Figure 3-70" },
  },
  {
    id: "rf-monitor",
    shortName: "RF MONITOR",
    name: "RF Monitor Assembly",
    assemblyIds: ["1A4A4"],
    description: "Đo công suất carrier thuận, phản xạ và công suất máy phát standby để cung cấp dữ liệu công suất/VSWR cho RMS và Monitor.",
    manualReference: "Mục 3.8.13, Figure 3-73 và Table 3-17",
    cabinetFace: "front",
    cabinetHotspots: [{ id: "rf-monitor-1a4a4", x: 44.8, y: 42.4, width: 6, height: 16.6, label: "1A4A4" }],
    diagramHotspots: [{ id: "diagram-rf-monitor", x: 0, y: 0, width: 0, height: 0, label: "RF MONITOR", targetCabinetHotspotId: "rf-monitor-1a4a4" }],
    indicators: ["DC POWER OK"],
    testPoints: [
      { id: "TP1", label: "Carrier Forward Power", nominal: "Detected forward power" },
      { id: "TP2", label: "Carrier Reflected Power", nominal: "Detected reflected power" },
      { id: "TP3", label: "Standby Power", nominal: "Detected dummy-load power" },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/rf-monitor.png", width: 366, height: 1428, figure: "Figure 3-73" },
  },
  {
    id: "rms",
    shortName: "RMS",
    name: "Remote Monitoring System CCA",
    assemblyIds: ["1A3A6"],
    description: "Thu thập dữ liệu serial từ các tuyến máy phát/monitor và giao tiếp với PMDT qua cổng USB.",
    manualReference: "Mục 3.8.6, Figure 3-67 và Table 3-11",
    cabinetFace: "front",
    cabinetHotspots: [{ id: "rms-1a3a6", x: 48.2, y: 26.1, width: 4.2, height: 16.5, label: "1A3A6" }],
    diagramHotspots: [{ id: "diagram-rms", x: 0, y: 0, width: 0, height: 0, label: "RMS", targetCabinetHotspotId: "rms-1a3a6" }],
    indicators: ["CPU OK", "POWER OK"],
    testPoints: [
      { id: "J1", label: "PMDT USB", nominal: "Portable maintenance interface" },
      { id: "J2", label: "Auxiliary USB", nominal: "Không sử dụng" },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/rms-cca.png", width: 780, height: 1824, figure: "Figure 3-67" },
  },
  {
    id: "bcps",
    shortName: "BCPS",
    name: "Battery Charging Power Supply",
    assemblyIds: ["1A5A1", "1A5A2"],
    description: "Chuyển đổi nguồn, nạp battery và cấp bus DC 48 V cho hai tuyến máy phát DVOR.",
    manualReference: "Mục 3.8.3, Figure 3-64 và Table 3-8",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "bcps-1a5a1", x: 31.8, y: 64, width: 8.5, height: 15.1, label: "1A5A1" },
      { id: "bcps-1a5a2", x: 40.4, y: 64, width: 8.5, height: 15.1, label: "1A5A2" },
    ],
    diagramHotspots: [
      { id: "diagram-bcps-1", x: 0, y: 0, width: 0, height: 0, label: "BCPS 1", targetCabinetHotspotId: "bcps-1a5a1" },
      { id: "diagram-bcps-2", x: 0, y: 0, width: 0, height: 0, label: "BCPS 2", targetCabinetHotspotId: "bcps-1a5a2" },
    ],
    indicators: ["AC ON", "DC ON", "AC FAIL", "BATTERY FAULT", "ON BATTERY", "CPU OK"],
    testPoints: [{ id: "CHARGER RESET", label: "Battery start/reset", nominal: "Momentary switch" }],
    faceImage: { src: "/equipment/dvor-1150a/modules/bcps.png", width: 488, height: 1456, figure: "Figure 3-64" },
  },
  {
    id: "commutator-controller",
    shortName: "COMMUTATOR",
    name: "Commutator Controller",
    assemblyIds: ["1A4A5"],
    description: "Nhận lệnh RS-422 và điều khiển tuần tự các bank commutator để phân phối sideband đến 48 anten vòng.",
    manualReference: "Figure 1-3 và Figure 2-3",
    cabinetFace: "front",
    cabinetHotspots: [{ id: "commutator-1a4a5", x: 50.8, y: 42.4, width: 5.8, height: 16.6, label: "1A4A5" }],
    diagramHotspots: [{ id: "diagram-commutator", x: 0, y: 0, width: 0, height: 0, label: "COMMUTATOR CONTROLLER", targetCabinetHotspotId: "commutator-1a4a5" }],
    indicators: ["CONTROL ACTIVE"],
    testPoints: [{ id: "RS-422", label: "Commutator control data", nominal: "Serial control" }],
  },
  {
    id: "rf-switch",
    shortName: "RF SWITCH",
    name: "RF Switching Network",
    assemblyIds: [],
    description: "Chuyển tuyến RF carrier và sideband giữa hai bộ phát, tải giả, RF Monitor và ngõ ra anten.",
    manualReference: "Figure 2-3, Simplified DVOR Transmitter Block Diagram",
    cabinetFace: "rear",
    cabinetHotspots: [],
    diagramHotspots: [{ id: "diagram-rf-switch", x: 0, y: 0, width: 0, height: 0, label: "RF SWITCH" }],
    indicators: [],
    testPoints: [],
  },
  {
    id: "antenna-bank",
    shortName: "BANK 1-4",
    name: "Commutator Antenna Banks",
    assemblyIds: ["BANK 1", "BANK 2", "BANK 3", "BANK 4"],
    description: "Bốn bank commutator phân phối tín hiệu sideband tuần tự đến 48 cáp anten sideband.",
    manualReference: "Figure 2-3, đường ra 48 cables to sideband antennas",
    cabinetFace: "rear",
    cabinetHotspots: [],
    diagramHotspots: [{ id: "diagram-antenna-bank", x: 0, y: 0, width: 0, height: 0, label: "BANK 1-4" }],
    indicators: [],
    testPoints: [],
  },
  {
    id: "monitor-cca",
    shortName: "MONITOR",
    name: "Monitor CCA",
    assemblyIds: ["1A3A3", "1A3A10"],
    description: "Giám sát tín hiệu DVOR, phát hiện pre-alarm/alarm và gửi dữ liệu đo cùng trạng thái về RMS và LCU.",
    manualReference: "Mục 3.8.5, Figure 3-66 và Table 3-10",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "monitor-1a3a3", x: 38.9, y: 26.1, width: 3.4, height: 16.5, label: "1A3A3" },
      { id: "monitor-1a3a10", x: 57.7, y: 26.1, width: 3.4, height: 16.5, label: "1A3A10" },
    ],
    diagramHotspots: [
      { id: "diagram-monitor-1", x: 0, y: 0, width: 0, height: 0, label: "MONITOR 1", targetCabinetHotspotId: "monitor-1a3a3" },
      { id: "diagram-monitor-2", x: 0, y: 0, width: 0, height: 0, label: "MONITOR 2", targetCabinetHotspotId: "monitor-1a3a10" },
    ],
    indicators: ["INTEGRAL PRIMARY ALARM", "INTEGRAL SECONDARY ALARM", "INTEGRAL PRE-ALARM", "CPU OK"],
    testPoints: [
      { id: "J2 / SYNC", label: "Oscilloscope trigger", nominal: "Monitor test synchronization" },
      {
        id: "J3 / TEST",
        label: "Detected test signal",
        nominal: "Selected through PMDT",
        waveform: {
          src: "/equipment/dvor-1150a/waveforms/monitor-j3-test.png",
          width: 477,
          height: 329,
          alt: "Dạng sóng đo thực tế tại cổng J3 TEST của Monitor CCA DVOR 1150A",
          caption: "J3 / TEST · Monitor CCA — ảnh đo tham khảo thực tế",
        },
      },
    ],
    faceImage: { src: "/equipment/dvor-1150a/modules/monitor-cca.png", width: 240, height: 1270, figure: "Figure 3-66" },
  },
  {
    id: "interface-cca",
    shortName: "INTERFACE CCA",
    name: "Interface Circuit Card",
    assemblyIds: ["1A9"],
    description: "Giao tiếp trạng thái và điều khiển giữa RMS với RCSU cùng thiết bị DME/TACAN đồng vị trí.",
    manualReference: "Figure 1-4 và Figure 2-2",
    cabinetFace: "rear",
    cabinetHotspots: [{ id: "interface-1a9", x: 29, y: 52.7, width: 42, height: 8.5, label: "1A9" }],
    diagramHotspots: [{ id: "diagram-interface-cca", x: 0, y: 0, width: 0, height: 0, label: "INTERFACE CIRCUIT CARD", targetCabinetHotspotId: "interface-1a9" }],
    indicators: [],
    testPoints: [],
  },
  {
    id: "lvps",
    shortName: "LVPS",
    name: "Low Voltage Power Supply CCA",
    assemblyIds: ["1A3A4", "1A3A8"],
    description: "Tạo các mức nguồn thấp +28 V, +12 V, -12 V và +5 V cho các CCA điều khiển/giám sát.",
    manualReference: "Mục 3.8.11 và Figure 2-2",
    cabinetFace: "front",
    cabinetHotspots: [
      { id: "lvps-1a3a4", x: 42.3, y: 26.1, width: 3.4, height: 16.5, label: "1A3A4" },
      { id: "lvps-1a3a8", x: 54.3, y: 26.1, width: 3.4, height: 16.5, label: "1A3A8" },
    ],
    diagramHotspots: [
      { id: "diagram-lvps-1", x: 0, y: 0, width: 0, height: 0, label: "LVPS 1", targetCabinetHotspotId: "lvps-1a3a4" },
      { id: "diagram-lvps-2", x: 0, y: 0, width: 0, height: 0, label: "LVPS 2", targetCabinetHotspotId: "lvps-1a3a8" },
    ],
    indicators: ["POWER OK"],
    testPoints: [],
  },
] as const;

export const DVOR_BLOCK_BY_ID = new Map(DVOR_BLOCKS.map((block) => [block.id, block]));

/** Resolve either a diagram or cabinet hotspot to one canonical occurrence. */
export function resolveDvorHardwareOccurrence(
  blockId: DvorBlockId,
  hotspotId: string,
): DvorHardwareOccurrence | null {
  const block = DVOR_BLOCK_BY_ID.get(blockId);
  if (!block) return null;

  const diagramHotspot = block.diagramHotspots.find((hotspot) => hotspot.id === hotspotId);
  if (diagramHotspot) {
    return {
      blockId,
      diagramHotspotId: diagramHotspot.id,
      cabinetHotspotId: diagramHotspot.targetCabinetHotspotId ?? null,
    };
  }

  const cabinetHotspot = block.cabinetHotspots.find((hotspot) => hotspot.id === hotspotId);
  if (!cabinetHotspot) return null;
  const matchingDiagram = block.diagramHotspots.find(
    (hotspot) => hotspot.targetCabinetHotspotId === cabinetHotspot.id,
  );
  return {
    blockId,
    diagramHotspotId: matchingDiagram?.id ?? cabinetHotspot.id,
    cabinetHotspotId: cabinetHotspot.id,
  };
}
