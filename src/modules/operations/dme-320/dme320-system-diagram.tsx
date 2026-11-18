"use client";

import { useId, useMemo, useState } from "react";
import type {
  Dme320BlockId,
  Dme320DiagramOccurrence,
} from "./block-diagram-data";
import {
  DME_320_BLOCK_BY_ID,
  DME_320_COMPONENT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dme320-block-diagram.module.css";

interface Dme320SystemDiagramProps {
  selectedOccurrenceId: string | null;
  onSelect: (blockId: Dme320BlockId, occurrence: Dme320DiagramOccurrence) => void;
}

type DiagramId = "overview" | "tx-rf" | "monitor" | "control" | "power";
type LinkKind = "rf" | "pulse" | "control" | "monitor" | "power" | "data";
type EdgeDirection = "forward" | "reverse" | "bidirectional";
type Point = readonly [number, number];

interface DiagramNode {
  id: string;
  componentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: readonly string[];
  reference?: string;
  variant: "unit" | "external" | "amplifier" | "rf" | "power" | "antenna";
}

interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  kind: LinkKind;
  points: readonly Point[];
  label?: string;
  labelAt?: Point;
  direction?: EdgeDirection;
}

interface DiagramGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiagramDefinition {
  id: DiagramId;
  label: string;
  reference: string;
  width: number;
  height: number;
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
  groups: readonly DiagramGroup[];
}

const node = (
  componentId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string | readonly string[],
  reference?: string,
  variant: DiagramNode["variant"] = "unit",
): DiagramNode => ({
  id: componentId,
  componentId,
  x,
  y,
  width,
  height,
  label: typeof label === "string" ? [label] : label,
  reference,
  variant,
});

const edge = (
  id: string,
  from: string,
  to: string,
  kind: LinkKind,
  points: readonly Point[],
  label?: string,
  labelAt?: Point,
  direction: EdgeDirection = "forward",
): DiagramEdge => ({ id, from, to, kind, points, label, labelAt, direction });

const overviewNodes: readonly DiagramNode[] = [
  node("overview-pmdt", 36, 82, 146, 68, "PMDT", undefined, "external"),
  node("overview-remote", 36, 188, 146, 68, ["RCU / RSU", "REMOTE CONTROL"], undefined, "external"),
  node("overview-ifb", 288, 112, 154, 78, ["IFB", "SURGE / I/O"], "1A7"),
  node("overview-lmi", 288, 234, 154, 70, "LMI", "1A6"),
  node("overview-csp", 288, 344, 154, 70, "CSP", "1A1A1"),
  node("overview-emu", 36, 344, 146, 70, "EMU", "1A1A6"),
  node("overview-modem", 36, 450, 146, 70, "MODEM ×2", "1A1A9/10"),
  node("overview-scu", 528, 218, 164, 100, ["SCU ×2", "VOTING / CONTROL"], "1A1A4/5"),

  node("overview-battery", 36, 702, 146, 64, "BAT ×2", undefined, "external"),
  node("overview-acdc", 36, 822, 146, 70, "AC/DC ×2", "1A5A1/2", "power"),
  node("overview-pmu", 288, 758, 160, 76, "PMU ×2", "1A4A1/2", "power"),
  node("overview-dcdc-a", 528, 684, 160, 70, "DC/DC-A ×2", "1A1A7/8", "power"),
  node("overview-fan", 528, 856, 160, 70, "FAN TXP1 / TXP2", "1A2A9/1A3A9", "power"),

  node("overview-tx1-tcu", 772, 102, 140, 74, "TCU 1", "1A2A6"),
  node("overview-tx1-rxu", 1004, 64, 138, 70, "RXU 1", "1A2A2"),
  node("overview-tx1-dpx", 1234, 64, 140, 70, "DPX-MSC 1", "1A2A1", "rf"),
  node("overview-tx1-txu", 1004, 232, 138, 70, "TXU 1", "1A2A4"),
  node("overview-tx1-hpa", 1234, 232, 140, 70, "HPA 1", "1A2A3", "amplifier"),
  node("overview-tx1-dcdc", 772, 308, 140, 70, "DC/DC 1", "1A2A5", "power"),

  node("overview-tx2-tcu", 772, 612, 140, 74, "TCU 2", "1A3A6"),
  node("overview-tx2-rxu", 1004, 574, 138, 70, "RXU 2", "1A3A2"),
  node("overview-tx2-dpx", 1234, 574, 140, 70, "DPX-MSC 2", "1A3A1", "rf"),
  node("overview-tx2-txu", 1004, 742, 138, 70, "TXU 2", "1A3A4"),
  node("overview-tx2-hpa", 1234, 742, 140, 70, "HPA 2", "1A3A3", "amplifier"),
  node("overview-tx2-dcdc", 772, 818, 140, 70, "DC/DC 2", "1A3A5", "power"),

  node("overview-mon1", 1474, 72, 146, 72, "MON 1", "1A2A8"),
  node("overview-rfg1", 1712, 72, 146, 72, "RFG 1", "1A2A7", "rf"),
  node("overview-mon2", 1474, 268, 146, 72, "MON 2", "1A3A8"),
  node("overview-rfg2", 1712, 268, 146, 72, "RFG 2", "1A3A7", "rf"),
  node("overview-rf-detectors", 1474, 464, 146, 76, "RF DET ×2", "1A9/1A10", "rf"),
  node("overview-vswr", 1712, 464, 146, 76, "VSWR MON", "1A8", "rf"),
  node("overview-relay", 1474, 666, 146, 82, ["COAX RELAY", "MAIN / STANDBY"], "1RY1", "rf"),
  node("overview-antenna", 1712, 662, 146, 90, "DME ANTENNA", undefined, "antenna"),
];

const overviewEdges: readonly DiagramEdge[] = [
  edge("ov-pmdt-ifb", "overview-pmdt", "overview-ifb", "data", [[182, 116], [288, 116]], "USB / LAN / RS-232", [235, 106], "bidirectional"),
  edge("ov-remote-ifb", "overview-remote", "overview-ifb", "data", [[182, 222], [235, 222], [235, 162], [288, 162]], "MODEM / RS-232", [235, 240], "bidirectional"),
  edge("ov-modem-ifb", "overview-modem", "overview-ifb", "data", [[109, 450], [109, 314], [365, 314], [365, 190]], undefined, undefined, "bidirectional"),
  edge("ov-ifb-lmi", "overview-ifb", "overview-lmi", "data", [[365, 190], [365, 234]], "USB / ETHERNET", [373, 215], "bidirectional"),
  edge("ov-ifb-scu", "overview-ifb", "overview-scu", "data", [[442, 151], [485, 151], [485, 248], [528, 248]], undefined, undefined, "bidirectional"),
  edge("ov-csp-scu", "overview-csp", "overview-scu", "control", [[442, 379], [485, 379], [485, 288], [528, 288]], "STATUS / CONTROL", [485, 332], "bidirectional"),
  edge("ov-emu-scu", "overview-emu", "overview-scu", "data", [[182, 379], [235, 379], [235, 430], [496, 430], [496, 300], [528, 300]], "CAN", [365, 424], "bidirectional"),
  edge("ov-scu-tcu1", "overview-scu", "overview-tx1-tcu", "data", [[692, 242], [732, 242], [732, 139], [772, 139]], "CAN / CONTROL", [732, 228], "bidirectional"),
  edge("ov-scu-tcu2", "overview-scu", "overview-tx2-tcu", "data", [[692, 290], [732, 290], [732, 649], [772, 649]], undefined, undefined, "bidirectional"),
  edge("ov-scu-mon1", "overview-scu", "overview-mon1", "control", [[610, 218], [610, 42], [1448, 42], [1448, 108], [1474, 108]], "EXEC. ALARM", [1280, 32], "bidirectional"),
  edge("ov-scu-mon2", "overview-scu", "overview-mon2", "control", [[692, 268], [1444, 268], [1444, 304], [1474, 304]], "EXEC. ALARM", [1414, 256], "bidirectional"),

  edge("ov-rxu1-tcu1", "overview-tx1-rxu", "overview-tx1-tcu", "data", [[1004, 99], [954, 99], [954, 131], [912, 131]], "RX VIDEO / ON CH", [954, 86]),
  edge("ov-tcu1-txu1", "overview-tx1-tcu", "overview-tx1-txu", "pulse", [[912, 147], [962, 147], [962, 267], [1004, 267]], "TIMING / MOD", [962, 212]),
  edge("ov-txu1-hpa1", "overview-tx1-txu", "overview-tx1-hpa", "rf", [[1142, 267], [1234, 267]], "+46.2 dBm", [1188, 256]),
  edge("ov-hpa1-dpx1", "overview-tx1-hpa", "overview-tx1-dpx", "rf", [[1304, 232], [1304, 134]], "HIGH-POWER REPLY", [1304, 186]),
  edge("ov-dpx1-rxu1", "overview-tx1-dpx", "overview-tx1-rxu", "rf", [[1234, 99], [1142, 99]], "INTERROGATION", [1188, 88]),
  edge("ov-dpx1-relay", "overview-tx1-dpx", "overview-relay", "rf", [[1374, 99], [1416, 99], [1416, 691], [1474, 691]], "T/R PATH", [1416, 408], "bidirectional"),

  edge("ov-rxu2-tcu2", "overview-tx2-rxu", "overview-tx2-tcu", "data", [[1004, 609], [954, 609], [954, 641], [912, 641]], "RX VIDEO / ON CH", [954, 596]),
  edge("ov-tcu2-txu2", "overview-tx2-tcu", "overview-tx2-txu", "pulse", [[912, 657], [962, 657], [962, 777], [1004, 777]], "TIMING / MOD", [962, 722]),
  edge("ov-txu2-hpa2", "overview-tx2-txu", "overview-tx2-hpa", "rf", [[1142, 777], [1234, 777]], "+46.2 dBm", [1188, 766]),
  edge("ov-hpa2-dpx2", "overview-tx2-hpa", "overview-tx2-dpx", "rf", [[1304, 742], [1304, 644]], "HIGH-POWER REPLY", [1304, 696]),
  edge("ov-dpx2-rxu2", "overview-tx2-dpx", "overview-tx2-rxu", "rf", [[1234, 609], [1142, 609]], "INTERROGATION", [1188, 598]),
  edge("ov-dpx2-relay", "overview-tx2-dpx", "overview-relay", "rf", [[1374, 609], [1432, 609], [1432, 723], [1474, 723]], "T/R PATH", [1416, 598], "bidirectional"),
  edge("ov-relay-antenna", "overview-relay", "overview-antenna", "rf", [[1620, 707], [1712, 707]], "ACTIVE TX / RX", [1666, 696], "bidirectional"),

  edge("ov-mon1-rfg1", "overview-mon1", "overview-rfg1", "control", [[1620, 108], [1712, 108]], "TEST / DETECT", [1666, 97], "bidirectional"),
  edge("ov-mon2-rfg2", "overview-mon2", "overview-rfg2", "control", [[1620, 304], [1712, 304]], "TEST / DETECT", [1666, 293], "bidirectional"),
  edge("ov-rfg1-both-tx", "overview-rfg1", "overview-tx1-dpx", "monitor", [[1785, 144], [1785, 178], [1400, 178], [1400, 118], [1374, 118]], "TO BOTH TXP", [1580, 168]),
  edge("ov-rfg2-both-tx", "overview-rfg2", "overview-tx2-dpx", "monitor", [[1785, 340], [1785, 372], [1394, 372], [1394, 618], [1374, 618]], "TO BOTH TXP", [1580, 362]),
  edge("ov-ant-rfdet", "overview-antenna", "overview-rf-detectors", "monitor", [[1785, 662], [1785, 582], [1547, 582], [1547, 540]], "ANTENNA SAMPLE", [1666, 571]),
  edge("ov-ant-vswr", "overview-antenna", "overview-vswr", "monitor", [[1816, 662], [1816, 540]], "FWD / REV", [1816, 602]),
  edge("ov-rfdet-mon1", "overview-rf-detectors", "overview-mon1", "monitor", [[1524, 464], [1524, 144]], "MON1 + MON2", [1524, 404]),
  edge("ov-rfdet-mon2", "overview-rf-detectors", "overview-mon2", "monitor", [[1572, 464], [1572, 340]], undefined, undefined),
  edge("ov-vswr-mon1", "overview-vswr", "overview-mon1", "monitor", [[1748, 464], [1748, 404], [1654, 404], [1654, 128], [1620, 128]], "BOTH MONITORS", [1686, 394]),
  edge("ov-vswr-mon2", "overview-vswr", "overview-mon2", "monitor", [[1786, 464], [1786, 388], [1664, 388], [1664, 320], [1620, 320]], undefined, undefined),

  edge("ov-bat-pmu", "overview-battery", "overview-pmu", "power", [[182, 734], [235, 734], [235, 796], [288, 796]], "BACKUP / CHARGE", [235, 723], "bidirectional"),
  edge("ov-acdc-pmu", "overview-acdc", "overview-pmu", "power", [[182, 857], [235, 857], [235, 810], [288, 810]], "+28 VDC", [235, 846]),
  edge("ov-pmu-dcdca", "overview-pmu", "overview-dcdc-a", "power", [[448, 784], [488, 784], [488, 719], [528, 719]], "28 V BUS", [488, 773]),
  edge("ov-pmu-dcdc1", "overview-pmu", "overview-tx1-dcdc", "power", [[368, 758], [368, 634], [748, 634], [748, 343], [772, 343]], undefined, undefined),
  edge("ov-pmu-dcdc2", "overview-pmu", "overview-tx2-dcdc", "power", [[448, 814], [748, 814], [748, 853], [772, 853]], undefined, undefined),
  edge("ov-pmu-scu", "overview-pmu", "overview-scu", "data", [[368, 758], [368, 558], [610, 558], [610, 318]], "CAN", [488, 548], "bidirectional"),
  edge("ov-dcdc-fan", "overview-tx2-dcdc", "overview-fan", "power", [[772, 870], [688, 870]], "TXP1 / TXP2", [730, 859]),
];

const txRfNodes: readonly DiagramNode[] = [
  node("txrf-tx1-tcu", 44, 132, 144, 78, "TCU 1", "1A2A6"),
  node("txrf-tx1-rxu", 296, 64, 144, 72, "RXU 1", "1A2A2"),
  node("txrf-tx1-dpx", 548, 64, 148, 72, "DPX-MSC 1", "1A2A1", "rf"),
  node("txrf-tx1-txu", 296, 242, 144, 72, "TXU 1", "1A2A4"),
  node("txrf-tx1-hpa", 548, 242, 148, 72, "HPA 1", "1A2A3", "amplifier"),
  node("txrf-circulator1", 784, 174, 148, 90, "CIRCULATOR 1", "1CIR1", "rf"),
  node("txrf-coupler1", 1028, 174, 148, 90, "1DC1 · 27 dB", "1DC1", "rf"),

  node("txrf-tx2-tcu", 44, 678, 144, 78, "TCU 2", "1A3A6"),
  node("txrf-tx2-rxu", 296, 610, 144, 72, "RXU 2", "1A3A2"),
  node("txrf-tx2-dpx", 548, 610, 148, 72, "DPX-MSC 2", "1A3A1", "rf"),
  node("txrf-tx2-txu", 296, 788, 144, 72, "TXU 2", "1A3A4"),
  node("txrf-tx2-hpa", 548, 788, 148, 72, "HPA 2", "1A3A3", "amplifier"),
  node("txrf-circulator2", 784, 720, 148, 90, "CIRCULATOR 2", "1CIR2", "rf"),
  node("txrf-coupler2", 1028, 720, 148, 90, "1DC2 · 27 dB", "1DC2", "rf"),

  node("txrf-dummy-load", 1254, 84, 152, 82, "DUMMY LOAD", "1RT1", "rf"),
  node("txrf-relay", 1254, 410, 152, 96, ["DPDT COAX RELAY", "TX1 / TX2"], "1RY1", "rf"),
  node("txrf-coupler3", 1502, 410, 146, 96, "1DC3 · 27 dB", "1DC3", "rf"),
  node("txrf-vswr", 1502, 588, 146, 82, "VSWR MON", "1A8", "rf"),
  node("txrf-lpf", 1712, 418, 124, 80, "LPF", "1FL1", "rf"),
  node("txrf-lightning", 1924, 418, 124, 80, "ARRESTER", "1AR1", "rf"),
  node("txrf-antenna", 2136, 408, 128, 100, "DME ANTENNA", undefined, "antenna"),
];

const txRfEdges: readonly DiagramEdge[] = [
  edge("txrf-rxu1-tcu1", "txrf-tx1-rxu", "txrf-tx1-tcu", "data", [[296, 100], [238, 100], [238, 163], [188, 163]], "RX VIDEO / ON CH", [242, 88]),
  edge("txrf-tcu1-txu1", "txrf-tx1-tcu", "txrf-tx1-txu", "pulse", [[188, 179], [242, 179], [242, 278], [296, 278]], "GAUSSIAN / RECT", [242, 232]),
  edge("txrf-dpx1-rxu1", "txrf-tx1-dpx", "txrf-tx1-rxu", "rf", [[548, 100], [440, 100]], "INTERROGATION", [494, 89]),
  edge("txrf-txu1-hpa1", "txrf-tx1-txu", "txrf-tx1-hpa", "rf", [[440, 278], [548, 278]], "+46.2 dBm", [494, 267]),
  edge("txrf-hpa1-circ1", "txrf-tx1-hpa", "txrf-circulator1", "rf", [[696, 278], [740, 278], [740, 219], [784, 219]], ">1.6 kW PEAK", [740, 297]),
  edge("txrf-circ1-dpx1", "txrf-circulator1", "txrf-tx1-dpx", "rf", [[784, 199], [740, 199], [740, 120], [696, 120]], "RECEIVE", [740, 188]),
  edge("txrf-circ1-coupler1", "txrf-circulator1", "txrf-coupler1", "rf", [[932, 219], [1028, 219]], "DUPLEXED RF", [980, 208], "bidirectional"),
  edge("txrf-coupler1-rxu1", "txrf-coupler1", "txrf-tx1-rxu", "monitor", [[1102, 174], [1102, 36], [368, 36], [368, 64]], "TX SAMPLE TO RXU 1", [735, 25]),
  edge("txrf-coupler1-relay", "txrf-coupler1", "txrf-relay", "rf", [[1176, 219], [1214, 219], [1214, 438], [1254, 438]], "TXP1", [1214, 330], "bidirectional"),

  edge("txrf-rxu2-tcu2", "txrf-tx2-rxu", "txrf-tx2-tcu", "data", [[296, 646], [238, 646], [238, 709], [188, 709]], "RX VIDEO / ON CH", [242, 634]),
  edge("txrf-tcu2-txu2", "txrf-tx2-tcu", "txrf-tx2-txu", "pulse", [[188, 725], [242, 725], [242, 824], [296, 824]], "GAUSSIAN / RECT", [242, 778]),
  edge("txrf-dpx2-rxu2", "txrf-tx2-dpx", "txrf-tx2-rxu", "rf", [[548, 646], [440, 646]], "INTERROGATION", [494, 635]),
  edge("txrf-txu2-hpa2", "txrf-tx2-txu", "txrf-tx2-hpa", "rf", [[440, 824], [548, 824]], "+46.2 dBm", [494, 813]),
  edge("txrf-hpa2-circ2", "txrf-tx2-hpa", "txrf-circulator2", "rf", [[696, 824], [740, 824], [740, 765], [784, 765]], ">1.6 kW PEAK", [740, 843]),
  edge("txrf-circ2-dpx2", "txrf-circulator2", "txrf-tx2-dpx", "rf", [[784, 745], [740, 745], [740, 666], [696, 666]], "RECEIVE", [740, 734]),
  edge("txrf-circ2-coupler2", "txrf-circulator2", "txrf-coupler2", "rf", [[932, 765], [1028, 765]], "DUPLEXED RF", [980, 754], "bidirectional"),
  edge("txrf-coupler2-rxu2", "txrf-coupler2", "txrf-tx2-rxu", "monitor", [[1102, 810], [1102, 892], [368, 892], [368, 682]], "TX SAMPLE TO RXU 2", [735, 910]),
  edge("txrf-coupler2-relay", "txrf-coupler2", "txrf-relay", "rf", [[1176, 765], [1214, 765], [1214, 478], [1254, 478]], "TXP2", [1214, 636], "bidirectional"),

  edge("txrf-relay-load", "txrf-relay", "txrf-dummy-load", "rf", [[1330, 410], [1330, 166]], "STANDBY TX", [1330, 290]),
  edge("txrf-relay-coupler3", "txrf-relay", "txrf-coupler3", "rf", [[1406, 458], [1502, 458]], "ON-ANTENNA PATH", [1454, 446], "bidirectional"),
  edge("txrf-coupler3-vswr", "txrf-coupler3", "txrf-vswr", "monitor", [[1575, 506], [1575, 588]], "FWD / REVERSE", [1575, 550]),
  edge("txrf-coupler3-lpf", "txrf-coupler3", "txrf-lpf", "rf", [[1648, 458], [1712, 458]], undefined, undefined, "bidirectional"),
  edge("txrf-lpf-arrester", "txrf-lpf", "txrf-lightning", "rf", [[1836, 458], [1924, 458]], "HARMONIC FILTER", [1880, 446], "bidirectional"),
  edge("txrf-arrester-antenna", "txrf-lightning", "txrf-antenna", "rf", [[2048, 458], [2136, 458]], "COMMON FEEDER", [2092, 446], "bidirectional"),
];

const monitorNodes: readonly DiagramNode[] = [
  node("monitor-antenna", 40, 306, 150, 88, "DME ANTENNA", undefined, "antenna"),
  node("monitor-rf-detectors", 286, 76, 162, 82, ["RF DET 1 / 2", "ANTENNA SAMPLE"], "1A9/1A10", "rf"),
  node("monitor-couplers", 286, 306, 162, 88, ["1DC1 / 1DC2 / 1DC3", "TX RF SAMPLES"], undefined, "rf"),
  node("monitor-vswr", 286, 544, 162, 82, "VSWR MONITOR", "1A8", "rf"),
  node("monitor-mon1", 622, 126, 168, 92, ["MON 1", "SUPERVISES TX1 + TX2"], "1A2A8"),
  node("monitor-rfg1", 930, 126, 162, 92, "RFG 1", "1A2A7", "rf"),
  node("monitor-mon2", 622, 434, 168, 92, ["MON 2", "SUPERVISES TX1 + TX2"], "1A3A8"),
  node("monitor-rfg2", 930, 434, 162, 92, "RFG 2", "1A3A7", "rf"),
];

const monitorEdges: readonly DiagramEdge[] = [
  edge("mon-ant-rfdet", "monitor-antenna", "monitor-rf-detectors", "monitor", [[115, 306], [115, 117], [286, 117]], "ANTENNA MONITOR PORTS", [164, 105]),
  edge("mon-ant-couplers", "monitor-antenna", "monitor-couplers", "rf", [[190, 350], [286, 350]], "COMMON RF", [238, 339], "bidirectional"),
  edge("mon-couplers-vswr", "monitor-couplers", "monitor-vswr", "monitor", [[367, 394], [367, 544]], "FORWARD / REFLECTED", [367, 474]),
  edge("mon-rfdet-mon1", "monitor-rf-detectors", "monitor-mon1", "monitor", [[448, 107], [536, 107], [536, 160], [622, 160]], "TX1 + TX2 ANTENNA SAMPLE", [536, 95]),
  edge("mon-rfdet-mon2", "monitor-rf-detectors", "monitor-mon2", "monitor", [[448, 139], [506, 139], [506, 468], [622, 468]], "SAME SOURCE SET", [536, 326]),
  edge("mon-couplers-mon1", "monitor-couplers", "monitor-mon1", "monitor", [[448, 330], [556, 330], [556, 184], [622, 184]], "TX1 + TX2 REPLY SAMPLES", [536, 282]),
  edge("mon-couplers-mon2", "monitor-couplers", "monitor-mon2", "monitor", [[448, 370], [556, 370], [556, 492], [622, 492]], "TX1 + TX2 REPLY SAMPLES", [536, 408]),
  edge("mon-vswr-mon1", "monitor-vswr", "monitor-mon1", "monitor", [[448, 574], [584, 574], [584, 202], [622, 202]], "VSWR TO BOTH MONITORS", [536, 356]),
  edge("mon-vswr-mon2", "monitor-vswr", "monitor-mon2", "monitor", [[448, 600], [568, 600], [568, 510], [622, 510]], undefined, undefined),
  edge("mon-mon1-rfg1", "monitor-mon1", "monitor-rfg1", "control", [[790, 172], [930, 172]], "INTERROGATION / DETECT", [860, 161], "bidirectional"),
  edge("mon-mon2-rfg2", "monitor-mon2", "monitor-rfg2", "control", [[790, 480], [930, 480]], "INTERROGATION / DETECT", [860, 469], "bidirectional"),
  edge("mon-rfg1-both-tx", "monitor-rfg1", "both-transponders", "rf", [[1092, 172], [1166, 172], [1166, 274], [1236, 274]], "TO TXP1 + TXP2 DPX-MSC", [1164, 160], "bidirectional"),
  edge("mon-rfg2-both-tx", "monitor-rfg2", "both-transponders", "rf", [[1092, 480], [1166, 480], [1166, 350], [1236, 350]], "TO TXP1 + TXP2 DPX-MSC", [1164, 496], "bidirectional"),
  edge("mon-mon1-scu", "monitor-mon1", "dual-scu", "control", [[706, 126], [706, 48], [1316, 48], [1316, 554]], "EXEC. ALARM", [1020, 37]),
  edge("mon-mon2-scu", "monitor-mon2", "dual-scu", "control", [[790, 456], [1280, 456], [1280, 554]], "EXEC. ALARM", [1164, 444]),
];

const controlNodes: readonly DiagramNode[] = [
  node("control-pmdt", 38, 92, 148, 72, "PMDT", undefined, "external"),
  node("control-remote", 38, 266, 148, 72, ["RCU / RSU", "REMOTE"], undefined, "external"),
  node("control-ifb", 296, 170, 164, 92, ["IFB", "SURGE PROTECTION"], "1A7"),
  node("control-modem", 296, 368, 164, 74, "MODEM ×2", "1A1A9/10"),
  node("control-lmi", 564, 62, 160, 76, "LMI", "1A6"),
  node("control-csp", 564, 210, 160, 76, "CSP", "1A1A1"),
  node("control-emu", 564, 344, 160, 76, "EMU", "1A1A6"),
  node("control-scu", 868, 186, 178, 112, ["SCU ×2", "AND / OR VOTING", "CHANGEOVER"], "1A1A4/5"),
  node("control-tcu", 1196, 86, 174, 84, ["TCU 1 + TCU 2", "TX / RX CONTROL"], "1A2A6/1A3A6"),
];

const controlEdges: readonly DiagramEdge[] = [
  edge("ctl-pmdt-ifb", "control-pmdt", "control-ifb", "data", [[186, 128], [240, 128], [240, 198], [296, 198]], "USB / LAN / RS-232", [241, 116], "bidirectional"),
  edge("ctl-remote-ifb", "control-remote", "control-ifb", "data", [[186, 302], [240, 302], [240, 234], [296, 234]], "RS-232 / MODEM", [241, 318], "bidirectional"),
  edge("ctl-modem-ifb", "control-modem", "control-ifb", "data", [[378, 368], [378, 262]], "TIP / RING", [378, 316], "bidirectional"),
  edge("ctl-ifb-lmi", "control-ifb", "control-lmi", "data", [[460, 192], [512, 192], [512, 100], [564, 100]], "USB / ETHERNET", [512, 180], "bidirectional"),
  edge("ctl-ifb-scu", "control-ifb", "control-scu", "data", [[460, 216], [524, 216], [524, 168], [820, 168], [820, 224], [868, 224]], "RS-232 / STATUS I/O", [664, 158], "bidirectional"),
  edge("ctl-csp-scu", "control-csp", "control-scu", "control", [[724, 248], [868, 248]], "LOCAL CONTROL / STATUS", [796, 237], "bidirectional"),
  edge("ctl-emu-scu", "control-emu", "control-scu", "data", [[724, 382], [796, 382], [796, 272], [868, 272]], "CAN", [796, 368], "bidirectional"),
  edge("ctl-scu-tcu", "control-scu", "control-tcu", "data", [[1046, 216], [1120, 216], [1120, 128], [1196, 128]], "CAN / FREQUENCY / STATUS", [1121, 204], "bidirectional"),
  edge("ctl-monitor-alarm", "dual-monitor", "control-scu", "control", [[1196, 356], [1120, 356], [1120, 268], [1046, 268]], "EXEC. ALARM ×2", [1121, 344]),
  edge("ctl-scu-rf", "control-scu", "rf-changeover", "control", [[957, 298], [957, 526], [1196, 526]], "TRANSFER / SHUTDOWN", [957, 424]),
  edge("ctl-env-emu", "environment-sensors", "control-emu", "data", [[186, 534], [524, 534], [524, 382], [564, 382]], "TEMP / SMOKE / INTRUSION", [378, 522]),
];

const powerNodes: readonly DiagramNode[] = [
  node("power-battery", 48, 132, 158, 74, "BACKUP BAT ×2", undefined, "external"),
  node("power-acdc", 48, 344, 158, 78, ["AC/DC ×2", "110/220 VAC → 28 VDC"], "1A5A1/2", "power"),
  node("power-pmu", 344, 228, 172, 94, ["PMU 1 + PMU 2", "OR-ING / CHARGER"], "1A4A1/2", "power"),
  node("power-dcdc-a", 630, 76, 174, 78, "DC/DC-A ×2", "1A1A7/8", "power"),
  node("power-dcdc-1", 630, 228, 174, 78, "TXP1 DC/DC", "1A2A5", "power"),
  node("power-dcdc-2", 630, 380, 174, 78, "TXP2 DC/DC", "1A3A5", "power"),
  node("power-fan", 914, 304, 168, 82, "FAN TXP1 / TXP2", "1A2A9/1A3A9", "power"),
];

const powerEdges: readonly DiagramEdge[] = [
  edge("pwr-bat-pmu", "power-battery", "power-pmu", "power", [[206, 169], [275, 169], [275, 256], [344, 256]], "FLOAT CHARGE / NO-BREAK", [275, 158], "bidirectional"),
  edge("pwr-ac-acdc", "ac-mains", "power-acdc", "power", [[48, 383], [18, 383], [18, 530], [120, 530], [120, 422]], "AC MAINS", [34, 466]),
  edge("pwr-acdc-pmu", "power-acdc", "power-pmu", "power", [[206, 383], [275, 383], [275, 294], [344, 294]], "+28 VDC / PMBus", [275, 372], "bidirectional"),
  edge("pwr-pmu-dcdca", "power-pmu", "power-dcdc-a", "power", [[516, 250], [573, 250], [573, 115], [630, 115]], "+28 VDC BUS", [573, 187]),
  edge("pwr-pmu-dcdc1", "power-pmu", "power-dcdc-1", "power", [[516, 275], [630, 267]], undefined, undefined),
  edge("pwr-pmu-dcdc2", "power-pmu", "power-dcdc-2", "power", [[516, 300], [573, 300], [573, 419], [630, 419]], undefined, undefined),
  edge("pwr-dcdc1-fan", "power-dcdc-1", "power-fan", "power", [[804, 267], [860, 267], [860, 331], [914, 331]], "TXP1 SUBRACK", [859, 256]),
  edge("pwr-dcdc2-fan", "power-dcdc-2", "power-fan", "power", [[804, 419], [868, 419], [868, 359], [914, 359]], "TXP2 SUBRACK", [859, 438]),
  edge("pwr-dcdca-bpa", "power-dcdc-a", "bp-a-loads", "power", [[804, 115], [1126, 115]], "+5 V / ±15 V", [965, 104]),
  edge("pwr-dcdc1-bpb", "power-dcdc-1", "bp-b-loads", "power", [[804, 267], [1126, 267]], "+5 / +8 / ±15 / +28 / +50 V", [965, 256]),
  edge("pwr-dcdc2-bpb", "power-dcdc-2", "bp-b-loads", "power", [[804, 419], [1126, 419]], undefined, undefined),
  edge("pwr-pmu-can", "power-pmu", "dual-scu", "data", [[430, 228], [430, 48], [1208, 48], [1208, 540]], "CAN · VOLTAGE / CURRENT / TEMP / BATTERY", [840, 37], "bidirectional"),
];

const diagrams: readonly DiagramDefinition[] = [
  {
    id: "overview",
    label: "Tổng thể",
    reference: "Figure 3-1 · System Block Diagram · dual transponder / dual monitor",
    width: 1890,
    height: 1000,
    nodes: overviewNodes,
    edges: overviewEdges,
    groups: [
      { id: "access", label: "LOCAL / REMOTE ACCESS", x: 18, y: 48, width: 444, height: 492 },
      { id: "control", label: "CONTROL AND MONITORING · 1A1", x: 268, y: 46, width: 444, height: 400 },
      { id: "power", label: "POWER SUPPLY", x: 18, y: 652, width: 690, height: 302 },
      { id: "tx1", label: "TXP1 · 1A2 · HIGH-POWER DME 320", x: 750, y: 30, width: 642, height: 378 },
      { id: "tx2", label: "TXP2 · 1A3 · HIGH-POWER DME 320", x: 750, y: 540, width: 642, height: 378 },
      { id: "monitors", label: "DUAL MONITOR · EACH MON SUPERVISES BOTH TXP", x: 1456, y: 34, width: 416, height: 530 },
      { id: "rf-common", label: "RF CHANGEOVER / ANTENNA", x: 1456, y: 636, width: 416, height: 148 },
    ],
  },
  {
    id: "tx-rf",
    label: "Máy phát & RF",
    reference: "Figures 3-2 and 3-54 · DME 320 high-power RF route",
    width: 2290,
    height: 940,
    nodes: txRfNodes,
    edges: txRfEdges,
    groups: [
      { id: "tx1", label: "TXP1 · 1A2 · TXU → HPA → CIRCULATOR", x: 22, y: 26, width: 1172, height: 324 },
      { id: "tx2", label: "TXP2 · 1A3 · TXU → HPA → CIRCULATOR", x: 22, y: 572, width: 1172, height: 324 },
      { id: "changeover", label: "COAXIAL CHANGEOVER · ACTIVE TO ANTENNA / STANDBY TO LOAD", x: 1234, y: 48, width: 192, height: 506 },
      { id: "common-rf", label: "COMMON RF / ANTENNA SYSTEM", x: 1482, y: 376, width: 794, height: 328 },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    reference: "Figures 3-24 and 3-54 · dual monitor supervision paths",
    width: 1460,
    height: 700,
    nodes: monitorNodes,
    edges: monitorEdges,
    groups: [
      { id: "sources", label: "COMMON RF MEASUREMENTS", x: 20, y: 40, width: 450, height: 618 },
      { id: "dual-monitor", label: "MON1 AND MON2 EACH WATCH TXP1 + TXP2", x: 596, y: 74, width: 522, height: 504 },
      { id: "both-transponders", label: "TXP1 + TXP2 · DPX-MSC PATHS", x: 1236, y: 226, width: 202, height: 164 },
      { id: "dual-scu", label: "DUAL SCU · AND / OR VOTING", x: 1236, y: 554, width: 202, height: 72 },
    ],
  },
  {
    id: "control",
    label: "Điều khiển",
    reference: "Figures 3-33 and 3-56 · Control, monitoring and IFB interfaces",
    width: 1420,
    height: 680,
    nodes: controlNodes,
    edges: controlEdges,
    groups: [
      { id: "access", label: "MAINTENANCE / REMOTE ACCESS", x: 20, y: 44, width: 462, height: 424 },
      { id: "local", label: "LOCAL PANELS / ENVIRONMENT", x: 538, y: 34, width: 214, height: 414 },
      { id: "controller", label: "REDUNDANT SYSTEM CONTROL", x: 836, y: 136, width: 242, height: 196 },
      { id: "dual-monitor", label: "MON1 + MON2 · EXECUTIVE ALARMS", x: 1196, y: 314, width: 202, height: 82 },
      { id: "rf-changeover", label: "COAX RELAY / TX ON-OFF", x: 1196, y: 490, width: 202, height: 74 },
      { id: "environment-sensors", label: "TEMP · SMOKE · INTRUSION", x: 20, y: 498, width: 166, height: 72 },
    ],
  },
  {
    id: "power",
    label: "Nguồn",
    reference: "Figure 3-48 · Power Supply Block Diagram · two fitted AC/DC modules",
    width: 1320,
    height: 640,
    nodes: powerNodes,
    edges: powerEdges,
    groups: [
      { id: "source", label: "PRIMARY + BACKUP SOURCES", x: 22, y: 76, width: 210, height: 392 },
      { id: "management", label: "DUAL POWER MANAGEMENT / OR-ING", x: 316, y: 180, width: 228, height: 194 },
      { id: "conversion", label: "DISTRIBUTED DC CONVERSION", x: 598, y: 42, width: 506, height: 456 },
      { id: "bp-a-loads", label: "BP-A · AUXILIARY ELECTRONICS", x: 1126, y: 78, width: 170, height: 74 },
      { id: "bp-b-loads", label: "BP-B · TXP1 / TXP2 LOADS", x: 1126, y: 228, width: 170, height: 224 },
      { id: "dual-scu", label: "DUAL SCU · CAN", x: 1126, y: 540, width: 170, height: 64 },
      { id: "ac-mains", label: "110 / 220 VAC MAINS", x: 36, y: 506, width: 164, height: 58 },
    ],
  },
];

function getOccurrence(componentId: string) {
  const blockId = DME_320_COMPONENT_TO_BLOCK.get(componentId);
  if (!blockId) return null;
  const block = DME_320_BLOCK_BY_ID.get(blockId);
  const occurrence = block?.diagramOccurrences.find((item) => item.componentId === componentId);
  return block && occurrence ? { blockId, occurrence } : null;
}

function DiagramNodeView({
  item,
  selected,
  onSelect,
}: {
  item: DiagramNode;
  selected: boolean;
  onSelect: (blockId: Dme320BlockId, occurrence: Dme320DiagramOccurrence) => void;
}) {
  const resolved = getOccurrence(item.componentId);
  if (!resolved) return null;
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;
  const lineHeight = 18;
  const textStart = centerY - ((item.label.length - 1) * lineHeight) / 2;

  return (
    <g
      className={styles.diagramBlock}
      data-component-id={item.componentId}
      data-selected={selected || undefined}
      data-variant={item.variant}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${item.label.join(" ")}${item.reference ? `, ${item.reference}` : ""}`}
      onClick={() => onSelect(resolved.blockId, resolved.occurrence)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(resolved.blockId, resolved.occurrence);
        }
      }}
    >
      <rect x={item.x} y={item.y} width={item.width} height={item.height} rx="4" />
      <text x={centerX} y={textStart}>
        {item.label.map((line, index) => (
          <tspan key={`${line}-${index}`} x={centerX} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>
        ))}
      </text>
      {item.reference ? <text className={styles.diagramNodeRef} x={centerX} y={item.y + item.height - 8}>{item.reference}</text> : null}
    </g>
  );
}

export function Dme320SystemDiagram({ selectedOccurrenceId, onSelect }: Dme320SystemDiagramProps) {
  const markerPrefix = useId().replaceAll(":", "");
  const [activeDiagramId, setActiveDiagramId] = useState<DiagramId>("overview");
  const diagram = diagrams.find((item) => item.id === activeDiagramId) ?? diagrams[0]!;
  const selectedComponentId = useMemo(() => {
    if (!selectedOccurrenceId) return null;
    for (const block of DME_320_BLOCK_BY_ID.values()) {
      const occurrence = block.diagramOccurrences.find((item) => item.id === selectedOccurrenceId);
      if (occurrence) return occurrence.componentId;
    }
    return null;
  }, [selectedOccurrenceId]);
  const selectedNodeId = selectedComponentId
    ? diagram.nodes.find((item) => item.componentId === selectedComponentId)?.id ?? null
    : null;

  const activateTabByIndex = (index: number, currentTarget: HTMLButtonElement) => {
    const normalized = (index + diagrams.length) % diagrams.length;
    setActiveDiagramId(diagrams[normalized]!.id);
    const tabs = currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    tabs?.[normalized]?.focus();
  };

  return (
    <div>
      <div className={styles.diagramTabs} role="tablist" aria-label="Chọn sơ đồ khối DME 320">
        {diagrams.map((item, index) => (
          <button
            key={item.id}
            id={`dme320-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={diagram.id === item.id}
            aria-controls="dme320-diagram-panel"
            tabIndex={diagram.id === item.id ? 0 : -1}
            onClick={() => setActiveDiagramId(item.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                activateTabByIndex(index + 1, event.currentTarget);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                activateTabByIndex(index - 1, event.currentTarget);
              } else if (event.key === "Home") {
                event.preventDefault();
                activateTabByIndex(0, event.currentTarget);
              } else if (event.key === "End") {
                event.preventDefault();
                activateTabByIndex(diagrams.length - 1, event.currentTarget);
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id="dme320-diagram-panel"
        className={styles.diagramViewport}
        role="tabpanel"
        aria-labelledby={`dme320-tab-${diagram.id}`}
      >
        <svg
          className={styles.systemDiagram}
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="group"
          aria-label={`${diagram.label}, ${diagram.reference}`}
        >
          <defs>
            {(["rf", "pulse", "control", "monitor", "power", "data"] as LinkKind[]).map((kind) => (
              <marker
                key={kind}
                id={`${markerPrefix}-${kind}`}
                viewBox="0 0 9 9"
                refX="8.0"
                refY="4.5"
                markerWidth="9"
                markerHeight="9"
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                <path className={styles[`marker${kind[0]!.toUpperCase()}${kind.slice(1)}`]} d="M0.6 1.2L8.2 4.5L0.6 7.8Z" />
              </marker>
            ))}
          </defs>

          <rect className={styles.diagramPaper} width={diagram.width} height={diagram.height} />
          <g className={styles.diagramZones} aria-hidden>
            {diagram.groups.map((group) => (
              <g key={group.id}>
                <rect x={group.x} y={group.y} width={group.width} height={group.height} rx="5" />
                <text x={group.x + 12} y={group.y + 20}>{group.label}</text>
              </g>
            ))}
          </g>

          <g className={styles.diagramLinks} aria-hidden>
            {diagram.edges.map((item) => {
              const adjacent = !selectedNodeId || item.from === selectedNodeId || item.to === selectedNodeId;
              const direction = item.direction ?? "forward";
              return (
                <polyline
                  key={item.id}
                  data-kind={item.kind}
                  data-active={selectedNodeId && adjacent ? true : undefined}
                  data-muted={selectedNodeId && !adjacent ? true : undefined}
                  points={item.points.map(([x, y]) => `${x},${y}`).join(" ")}
                  markerStart={direction === "reverse" || direction === "bidirectional" ? `url(#${markerPrefix}-${item.kind})` : undefined}
                  markerEnd={direction === "forward" || direction === "bidirectional" ? `url(#${markerPrefix}-${item.kind})` : undefined}
                />
              );
            })}
          </g>

          <g className={styles.diagramPathLabels} aria-hidden>
            {diagram.edges.map((item) => {
              if (!item.label) return null;
              const point = item.labelAt ?? item.points[Math.floor(item.points.length / 2)]!;
              const adjacent = !selectedNodeId || item.from === selectedNodeId || item.to === selectedNodeId;
              return (
                <text
                  key={`${item.id}-label`}
                  data-muted={selectedNodeId && !adjacent ? true : undefined}
                  x={point[0]}
                  y={point[1]}
                >
                  {item.label}
                </text>
              );
            })}
          </g>

          <g>
            {diagram.nodes.map((item) => (
              <DiagramNodeView
                key={item.id}
                item={item}
                selected={selectedOccurrenceId === getOccurrence(item.componentId)?.occurrence.id}
                onSelect={onSelect}
              />
            ))}
          </g>

          <g className={styles.diagramLegend} aria-hidden transform={`translate(28 ${diagram.height - 22})`}>
            {(["rf", "pulse", "control", "monitor", "power", "data"] as LinkKind[]).map((kind, index) => (
              <g key={kind} transform={`translate(${index * 162} 0)`}>
                <path data-kind={kind} d="M0 0h28" />
                <text x="36" y="4">
                  {({
                    rf: "RF",
                    pulse: "PULSE / MOD",
                    control: "CONTROL",
                    monitor: "MONITOR SAMPLE",
                    power: "POWER",
                    data: "DATA / CAN",
                  } as const)[kind]}
                </text>
              </g>
            ))}
          </g>
          <text className={styles.diagramReference} x={diagram.width - 18} y={diagram.height - 18}>{diagram.reference}</text>
        </svg>
      </div>
    </div>
  );
}
