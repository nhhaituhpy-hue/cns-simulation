export type AdsbBlockId =
  | "antenna"
  | "antenna-amplifier"
  | "lightning-protector"
  | "gps-receiver"
  | "quadrant-sensor"
  | "ac-source"
  | "dc-power-supply"
  | "lan-switch";

export type AdsbInstallationSurface = "outdoor";
export type AdsbEdgeCategory = "rf" | "timing" | "data" | "power" | "ground";
export type AdsbEdgeDirection = "forward" | "bidirectional" | "none";
export type AdsbTopologyNodeKind = AdsbEdgeCategory | "context";
export type AdsbBlockStatus = "required" | "optional" | "conditional" | "recommended" | "site";

export type AdsbTopologyNodeId =
  | "aircraft"
  | "antenna"
  | "antenna-amplifier"
  | "lightning-protector"
  | "gps-receiver"
  | "quadrant-sensor"
  | "ac-source"
  | "dc-power-supply"
  | "lan-switch"
  | "ntp-source"
  | "qcms"
  | "surveillance-users"
  | "mast-bond-point";

export interface AdsbInstallationHotspot {
  id: string;
  surface: AdsbInstallationSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface AdsbDiagramOccurrence {
  id: string;
  nodeId: AdsbTopologyNodeId;
  componentId: AdsbTopologyNodeId;
  targetInstallationHotspotIds: readonly string[];
}

export interface AdsbSourceReference {
  section: string;
  figure?: string;
  pdfPage: number;
  printedPage: number;
  note?: string;
}

export interface AdsbConnector {
  id: string;
  position?: number;
  label: string;
  type: string;
  description: string;
}

export interface AdsbLimit {
  id: string;
  label: string;
  value: string;
  description: string;
}

export interface AdsbBlockDefinition {
  id: AdsbBlockId;
  shortName: string;
  name: string;
  description: string;
  status: AdsbBlockStatus;
  installationHotspots: readonly AdsbInstallationHotspot[];
  diagramOccurrences: readonly AdsbDiagramOccurrence[];
  connectors: readonly AdsbConnector[];
  limits: readonly AdsbLimit[];
  notes: readonly string[];
  sources: readonly AdsbSourceReference[];
  visualCaption: string;
}

export interface AdsbTopologyNode {
  id: AdsbTopologyNodeId;
  label: readonly string[];
  kind: AdsbTopologyNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  selectableBlockId?: AdsbBlockId;
  occurrenceId?: string;
  optional?: boolean;
  meta?: string;
}

export interface AdsbTopologyEdge {
  id: string;
  from: AdsbTopologyNodeId;
  to: AdsbTopologyNodeId;
  category: AdsbEdgeCategory;
  direction: AdsbEdgeDirection;
  path: string;
  label: string;
  labelX: number;
  labelY: number;
  optional?: boolean;
}

const source = (
  section: string,
  pdfPage: number,
  printedPage: number,
  figure?: string,
  note?: string,
): AdsbSourceReference => ({ section, figure, pdfPage, printedPage, note });

const hotspot = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
): AdsbInstallationHotspot => ({ id, surface: "outdoor", x, y, width, height, label });

const occurrence = (
  nodeId: AdsbTopologyNodeId,
  targetInstallationHotspotIds: readonly string[],
): AdsbDiagramOccurrence => ({
  id: `outdoor-${nodeId}`,
  nodeId,
  componentId: nodeId,
  targetInstallationHotspotIds,
});

const outdoor = {
  antenna: hotspot("outdoor-antenna", 287, 28, 74, 174, "1090 MHz Antenna"),
  amplifier: hotspot("outdoor-antenna-amplifier", 276, 211, 96, 70, "Antenna Amplifier"),
  gps: hotspot("outdoor-gps-receiver", 153, 291, 126, 91, "GPS Receiver"),
  sensor: hotspot("outdoor-quadrant-sensor", 211, 361, 244, 237, "Quadrant ADS-B Sensor"),
  protector: hotspot("outdoor-lightning-protector", 306, 599, 66, 65, "Lightning Protector"),
  ac: hotspot("outdoor-ac-source", 20, 713, 124, 72, "100–240 V AC source"),
  dc: hotspot("outdoor-dc-power-supply", 153, 713, 133, 72, "24 VDC Power Supply"),
  lan: hotspot("outdoor-lan-switch", 439, 713, 139, 72, "LAN Switch / Router"),
} as const;

const sensorConnectors: readonly AdsbConnector[] = [
  {
    id: "sensor-port-1-ac",
    position: 1,
    label: "100–240 V AC Power",
    type: "Male power plug",
    description: "Nguồn AC; manual gọi là lựa chọn thay thế cho cổng 5.",
  },
  {
    id: "sensor-port-2-gps",
    position: 2,
    label: "GPS",
    type: "Female weather-protected plug",
    description: "Nhận dữ liệu/vị trí từ GPS Receiver qua cáp 8-pin.",
  },
  {
    id: "sensor-port-3-antenna",
    position: 3,
    label: "Antenna",
    type: "Female RF plug",
    description: "RF 1090 MHz từ antenna qua preamplifier và lightning protector.",
  },
  {
    id: "sensor-port-4-lan",
    position: 4,
    label: "LAN",
    type: "Female network plug",
    description: "Ethernet tới switch hoặc router của trạm.",
  },
  {
    id: "sensor-port-5-dc",
    position: 5,
    label: "24 V DC Power",
    type: "Male power plug",
    description: "Nguồn DC; manual gọi là lựa chọn thay thế cho cổng 1.",
  },
];

export const ADSB_BLOCKS: readonly AdsbBlockDefinition[] = [
  {
    id: "antenna",
    shortName: "ANT",
    name: "1090 MHz Antenna",
    description: "Thu tín hiệu ADS-B 1090 MHz từ tàu bay và đưa tín hiệu RF xuống chuỗi thu ngoài trời.",
    status: "required",
    installationHotspots: [outdoor.antenna],
    diagramOccurrences: [occurrence("antenna", [outdoor.antenna.id])],
    connectors: [{ id: "antenna-n", label: "RF output", type: "N-connector", description: "Điểm gắn trực tiếp preamplifier khi cấu hình có amplifier." }],
    limits: [{ id: "antenna-height", label: "Vị trí lắp", value: "Cao nhất có thể", description: "Manual yêu cầu antenna được bố trí cao nhất có thể trên mast." }],
    notes: ["Traverse và bộ gá là phần cơ khí, không phải block chức năng riêng."],
    sources: [source("3.3 Antenna", 17, 9, "Figure 7"), source("4.4 Step 3: Antenna assembly", 33, 25)],
    visualCaption: "Antenna và mounting material — Figure 7",
  },
  {
    id: "antenna-amplifier",
    shortName: "PREAMP",
    name: "Antenna Amplifier",
    description: "Preamplifier tùy chọn khuếch đại tín hiệu antenna để cải thiện cự ly thu; lắp tại N-connector của antenna.",
    status: "optional",
    installationHotspots: [outdoor.amplifier],
    diagramOccurrences: [occurrence("antenna-amplifier", [outdoor.amplifier.id])],
    connectors: [
      { id: "preamp-input", label: "Antenna side", type: "N-connector", description: "Gắn tại N-connector của antenna." },
      { id: "preamp-output", label: "Sensor side", type: "RF connector", description: "Nối cáp HF xuống lightning protector và Sensor." },
    ],
    limits: [{ id: "preamp-cable", label: "Preamplifier → Sensor", value: "≤ 15 m", description: "Giới hạn chiều dài cáp HF tại bước 9." }],
    notes: ["Nếu không trang bị preamplifier, tuyến RF đi trực tiếp từ antenna tới lightning protector."],
    sources: [source("3.6 Antenna Amplifier", 20, 12, "Figure 10"), source("4.10 Step 9: Antenna amplifier cabling", 39, 31, "Figure 36")],
    visualCaption: "Antenna amplifier — Figure 10",
  },
  {
    id: "lightning-protector",
    shortName: "SURGE",
    name: "Coaxial Lightning Protector",
    description: "Thiết bị chống sét lan truyền trên tuyến RF, đặt giữa Quadrant Sensor và preamplifier/antenna.",
    status: "recommended",
    installationHotspots: [outdoor.protector],
    diagramOccurrences: [occurrence("lightning-protector", [outdoor.protector.id])],
    connectors: [
      { id: "protector-antenna-side", label: "Antenna / preamplifier side", type: "Coaxial", description: "Phía cáp từ antenna hoặc preamplifier; manual không định danh IN/OUT." },
      { id: "protector-sensor-side", label: "Sensor side", type: "Coaxial", description: "Gắn tại cổng Antenna của Sensor." },
      { id: "protector-earth", label: "Earth lead", type: "Ring terminal", description: "Dây vàng/xanh nối đất bảo vệ." },
    ],
    limits: [{ id: "protector-bond", label: "Nối đất", value: "Galvanic bond", description: "Phải nối cùng vị trí mast được đánh dấu cho Sensor." }],
    notes: ["Ground là protective bond, không phải đường tín hiệu."],
    sources: [source("3.5 Lightning protector", 19, 11, "Figure 9"), source("4.9 Step 8: Lightning protector cabling", 38, 30, "Figure 35")],
    visualCaption: "Lightning protector và earth lead — Figures 9, 12",
  },
  {
    id: "gps-receiver",
    shortName: "GPS",
    name: "GPS Receiver",
    description: "Cấp dữ liệu NMEA 0183 về vị trí/thời gian; cần dùng khi Sensor phải chuyển tiếp bản tin Multilateration, trong khi NTP có thể là nguồn thời gian mạng thay thế.",
    status: "conditional",
    installationHotspots: [outdoor.gps],
    diagramOccurrences: [occurrence("gps-receiver", [outdoor.gps.id])],
    connectors: [{ id: "gps-cable", label: "GPS cable", type: "Weather-protected 8-pin", description: "Một đầu được cố định sẵn vào GPS Receiver, đầu còn lại vào cổng GPS của Sensor." }],
    limits: [{ id: "gps-distance", label: "GPS Receiver → Sensor", value: "≤ 5 m", description: "Giới hạn vị trí và chiều dài cáp GPS." }],
    notes: ["Nếu không dùng GPS, cổng GPS trên Sensor phải được đóng protective cap; lựa chọn GPS/NTP phụ thuộc yêu cầu vị trí và đồng bộ của hệ thống."],
    sources: [source("2.2 Quadrant System Functional Overview", 12, 4, "Figure 2"), source("3.7 GPS Receiver", 21, 13, "Figure 11"), source("4.11 Step 10: GPS Receiver cabling", 40, 32, "Figures 37–38")],
    visualCaption: "GPS Receiver với holder và cáp — Figure 11",
  },
  {
    id: "quadrant-sensor",
    shortName: "SENSOR",
    name: "COMSOFT Quadrant ADS-B Sensor — Outdoor",
    description: "Sensor ngoài trời gồm weather shield, enclosure kín nước, board xử lý số và RF receiver; trang này chỉ mô tả thiết bị nguyên khối, không suy diễn các board nội bộ.",
    status: "required",
    installationHotspots: [outdoor.sensor],
    diagramOccurrences: [occurrence("quadrant-sensor", [outdoor.sensor.id])],
    connectors: sensorConnectors,
    limits: [
      { id: "sensor-clearance", label: "Không gian lắp", value: "80 cm", description: "Không gian cần cho lắp đặt; không phải độ cao so với mặt đất." },
      { id: "sensor-lan-limit", label: "Sensor → LAN", value: "≤ 100 m", description: "Giới hạn cáp từ Sensor tới nguồn LAN." },
      { id: "sensor-power-limit", label: "Sensor → nguồn", value: "≤ 100 m", description: "Áp dụng cho cả bước đấu AC và 24 VDC." },
    ],
    notes: ["Manual mô tả AC và 24 VDC là hai lựa chọn thay thế, nhưng cũng nói có thể nối cả hai; không suy diễn cơ chế redundancy hoặc OR-ing.", "Trên Sensor giao trước tháng 09/2009, cổng 2 (GPS) và 4 (LAN) có dạng lục giác theo footnote Figure 4."],
    sources: [source("2.2 Quadrant System Functional Overview", 12, 4, "Figure 2"), source("3.1.2 Quadrant Sensor", 14, 6, "Figure 4"), source("4.2.1 Schematic Overview", 27, 19, "Figure 20"), source("4.15.1 Outdoor version", 44, 36, "Figure 44")],
    visualCaption: "Mặt đáy Sensor và thứ tự năm cổng — Figure 4",
  },
  {
    id: "ac-source",
    shortName: "AC",
    name: "100–240 V AC Source",
    description: "Nguồn AC của trạm cấp trực tiếp cho Sensor hoặc cấp vào bộ nguồn 24 VDC tùy thiết kế lắp đặt.",
    status: "site",
    installationHotspots: [outdoor.ac],
    diagramOccurrences: [occurrence("ac-source", [outdoor.ac.id])],
    connectors: [{ id: "ac-site-output", label: "Site AC output", type: "Customer-specific", description: "Đầu phía Sensor dùng special plug; đầu nguồn có thể tùy biến hoặc để hở." }],
    limits: [{ id: "ac-cable-limit", label: "AC cable → Sensor", value: "≤ 100 m", description: "Hard limit tại bước đấu nguồn AC." }],
    notes: ["Đây là điểm cấp nguồn hạ tầng, không phải một thiết bị COMSOFT có hãng/model được manual chỉ định."],
    sources: [source("3.8.4.2 100–240V AC power cable", 24, 16, "Figure 16"), source("4.13 Step 11.2", 42, 34, "Figures 41–42")],
    visualCaption: "Nguồn hạ tầng trạm — sơ đồ chức năng",
  },
  {
    id: "dc-power-supply",
    shortName: "24 VDC PSU",
    name: "24 VDC Power Supply",
    description: "Bộ nguồn tùy chọn chuyển nguồn site sang 24 VDC khi Sensor không được cấp trực tiếp bằng 100–240 V AC.",
    status: "optional",
    installationHotspots: [outdoor.dc],
    diagramOccurrences: [occurrence("dc-power-supply", [outdoor.dc.id])],
    connectors: [
      { id: "psu-input", label: "Site power input", type: "Không được chỉ định", description: "Figure 20 đặt PSU sau mains; manual không cho model hoặc connector phía vào." },
      { id: "psu-output", label: "24 VDC output", type: "Sensor power cable", description: "Cấp vào cổng số 5 trên Sensor." },
    ],
    limits: [{ id: "dc-cable-limit", label: "24 VDC cable → Sensor", value: "≤ 100 m", description: "Bước lắp đặt áp giới hạn 100 m dù bảng kỹ thuật có giá trị lớn hơn theo tiết diện dây." }],
    notes: ["Manual không chỉ định model của bộ nguồn; hình chi tiết này chỉ là sơ đồ chức năng."],
    sources: [source("3.8.4.1 24V DC power cable", 23, 15, "Figure 15"), source("4.12 Step 11.1", 41, 33, "Figures 39–40")],
    visualCaption: "Bộ nguồn 24 VDC tùy chọn — sơ đồ chức năng",
  },
  {
    id: "lan-switch",
    shortName: "LAN",
    name: "LAN Switch / Router",
    description: "Thiết bị mạng của trạm nối Sensor với QCMS, NTP và các hệ thống sử dụng dữ liệu giám sát ADS-B.",
    status: "site",
    installationHotspots: [outdoor.lan],
    diagramOccurrences: [occurrence("lan-switch", [outdoor.lan.id])],
    connectors: [
      { id: "lan-sensor", label: "Sensor", type: "Ethernet", description: "Liên kết vật lý hai chiều tới cổng LAN của Sensor." },
      { id: "lan-users", label: "Surveillance/QCMS/NTP", type: "Site network", description: "Phân phối dữ liệu và kết nối quản lý/thời gian." },
    ],
    limits: [{ id: "lan-cable-limit", label: "LAN cable → Sensor", value: "≤ 100 m", description: "Giới hạn từ Sensor tới switch/router." }],
    notes: ["Đây là hạ tầng mạng của site; manual không chỉ định hãng/model switch/router. QCMS là kết nối quản lý hai chiều."],
    sources: [source("2.2 Quadrant System Functional Overview", 12, 4, "Figure 2"), source("3.8.5 LAN cable", 25, 17, "Figure 18"), source("4.14 Step 12: LAN cabling", 43, 35, "Figure 43")],
    visualCaption: "Thiết bị mạng của trạm — sơ đồ chức năng",
  },
];

export const ADSB_TOPOLOGY_NODES: readonly AdsbTopologyNode[] = [
  { id: "aircraft", label: ["AIRCRAFT", "1090 MHz"], kind: "context", x: 24, y: 40, width: 118, height: 56, meta: "RF SOURCE" },
  { id: "antenna", label: ["1090 MHz", "ANTENNA"], kind: "rf", x: 204, y: 35, width: 128, height: 68, selectableBlockId: "antenna", occurrenceId: "outdoor-antenna" },
  { id: "antenna-amplifier", label: ["ANTENNA", "AMPLIFIER"], kind: "rf", x: 396, y: 35, width: 132, height: 68, selectableBlockId: "antenna-amplifier", occurrenceId: "outdoor-antenna-amplifier", optional: true, meta: "OPTIONAL" },
  { id: "lightning-protector", label: ["LIGHTNING", "PROTECTOR"], kind: "rf", x: 614, y: 35, width: 132, height: 68, selectableBlockId: "lightning-protector", occurrenceId: "outdoor-lightning-protector", meta: "RECOMMENDED" },
  { id: "quadrant-sensor", label: ["QUADRANT", "ADS-B SENSOR"], kind: "rf", x: 826, y: 26, width: 162, height: 86, selectableBlockId: "quadrant-sensor", occurrenceId: "outdoor-quadrant-sensor", meta: "OUTDOOR" },
  { id: "gps-receiver", label: ["GPS", "RECEIVER"], kind: "timing", x: 612, y: 184, width: 136, height: 66, selectableBlockId: "gps-receiver", occurrenceId: "outdoor-gps-receiver", optional: true, meta: "CONDITIONAL" },
  { id: "ntp-source", label: ["NTP", "TIME SOURCE"], kind: "context", x: 35, y: 310, width: 135, height: 58, meta: "ALTERNATIVE TIME" },
  { id: "lan-switch", label: ["LAN SWITCH", "/ ROUTER"], kind: "data", x: 344, y: 300, width: 150, height: 76, selectableBlockId: "lan-switch", occurrenceId: "outdoor-lan-switch", meta: "SITE NETWORK" },
  { id: "qcms", label: ["QCMS"], kind: "context", x: 618, y: 274, width: 125, height: 58, meta: "MANAGEMENT" },
  { id: "surveillance-users", label: ["SURVEILLANCE", "USERS"], kind: "context", x: 904, y: 316, width: 155, height: 58, meta: "ASTERIX CAT021" },
  { id: "ac-source", label: ["100–240 V AC", "SOURCE"], kind: "power", x: 52, y: 508, width: 145, height: 70, selectableBlockId: "ac-source", occurrenceId: "outdoor-ac-source", meta: "SITE OPTION" },
  { id: "dc-power-supply", label: ["24 VDC", "POWER SUPPLY"], kind: "power", x: 326, y: 508, width: 160, height: 70, selectableBlockId: "dc-power-supply", occurrenceId: "outdoor-dc-power-supply", optional: true, meta: "OPTIONAL" },
  { id: "mast-bond-point", label: ["MAST", "BOND POINT"], kind: "context", x: 760, y: 508, width: 170, height: 60, meta: "PROTECTIVE BOND" },
];

export const ADSB_TOPOLOGY_EDGES: readonly AdsbTopologyEdge[] = [
  { id: "rf-aircraft-antenna", from: "aircraft", to: "antenna", category: "rf", direction: "forward", path: "M142 68H204", label: "1090 MHz", labelX: 173, labelY: 57 },
  { id: "rf-antenna-amplifier", from: "antenna", to: "antenna-amplifier", category: "rf", direction: "forward", path: "M332 69H396", label: "RF", labelX: 364, labelY: 58, optional: true },
  { id: "rf-antenna-bypass", from: "antenna", to: "lightning-protector", category: "rf", direction: "forward", path: "M268 103V137H680V103", label: "BYPASS WHEN NO PREAMP", labelX: 462, labelY: 130, optional: true },
  { id: "rf-amplifier-protector", from: "antenna-amplifier", to: "lightning-protector", category: "rf", direction: "forward", path: "M528 69H614", label: "HF CABLE ≤ 15 m", labelX: 571, labelY: 58, optional: true },
  { id: "rf-protector-sensor", from: "lightning-protector", to: "quadrant-sensor", category: "rf", direction: "forward", path: "M746 69H826", label: "RF IN", labelX: 786, labelY: 58 },
  { id: "timing-gps-sensor", from: "gps-receiver", to: "quadrant-sensor", category: "timing", direction: "forward", path: "M748 217H866V112", label: "NMEA 0183 ≤ 5 m", labelX: 808, labelY: 206, optional: true },
  { id: "data-sensor-switch", from: "quadrant-sensor", to: "lan-switch", category: "data", direction: "bidirectional", path: "M956 112V256H556V324H494", label: "ETHERNET ≤ 100 m", labelX: 790, labelY: 246 },
  { id: "data-ntp-switch", from: "ntp-source", to: "lan-switch", category: "data", direction: "bidirectional", path: "M170 339H344", label: "NTP REQUEST / REPLY", labelX: 257, labelY: 328 },
  { id: "data-switch-qcms", from: "lan-switch", to: "qcms", category: "data", direction: "bidirectional", path: "M494 303H618", label: "MANAGEMENT", labelX: 556, labelY: 292 },
  { id: "data-switch-users", from: "lan-switch", to: "surveillance-users", category: "data", direction: "forward", path: "M494 358H904", label: "ASTERIX CAT021", labelX: 682, labelY: 374 },
  { id: "power-ac-sensor", from: "ac-source", to: "quadrant-sensor", category: "power", direction: "forward", path: "M125 508V440H890V112", label: "DIRECT AC ≤ 100 m", labelX: 480, labelY: 430, optional: true },
  { id: "power-ac-psu", from: "ac-source", to: "dc-power-supply", category: "power", direction: "forward", path: "M197 543H326", label: "SITE INPUT", labelX: 262, labelY: 532, optional: true },
  { id: "power-psu-sensor", from: "dc-power-supply", to: "quadrant-sensor", category: "power", direction: "forward", path: "M486 543H706V406H878V112", label: "24 VDC ≤ 100 m", labelX: 596, labelY: 532, optional: true },
  { id: "ground-protector", from: "lightning-protector", to: "mast-bond-point", category: "ground", direction: "none", path: "M680 103V160H1045V480H845V508", label: "GALVANIC BOND", labelX: 945, labelY: 470 },
];

export const ADSB_BLOCK_BY_ID = new Map(ADSB_BLOCKS.map((block) => [block.id, block]));
export const ADSB_OCCURRENCE_TO_BLOCK = new Map(
  ADSB_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => [item.id, block.id] as const)),
);
export const ADSB_COMPONENT_TO_BLOCK = new Map(
  ADSB_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => [item.componentId, block.id] as const)),
);
export const ADSB_INSTALLATION_HOTSPOT_TO_BLOCK = new Map(
  ADSB_BLOCKS.flatMap((block) => block.installationHotspots.map((item) => [item.id, block.id] as const)),
);
export const ADSB_HOTSPOT_TO_BLOCK = ADSB_INSTALLATION_HOTSPOT_TO_BLOCK;
export const ADSB_TOPOLOGY_NODE_BY_ID = new Map(ADSB_TOPOLOGY_NODES.map((node) => [node.id, node]));
