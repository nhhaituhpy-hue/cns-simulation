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
  node("overview-pmdt", 42, 82, 150, 68, "PMDT", undefined, "external"),
  node("overview-remote", 42, 184, 150, 68, ["RCU / RSU", "REMOTE CONTROL"], undefined, "external"),
  node("overview-ifb", 242, 112, 156, 78, ["IFB", "SURGE / I/O"], "1A7"),
  node("overview-lmi", 242, 226, 156, 70, "LMI", "1A6"),
  node("overview-csp", 242, 330, 156, 70, "CSP", "1A1A1"),
  node("overview-emu", 42, 330, 150, 70, "EMU", "1A1A6"),
  node("overview-modem", 42, 434, 150, 70, "MODEM ×2", "1A1A9/10"),
  node("overview-scu", 450, 214, 168, 100, ["SCU ×2", "VOTING / CONTROL"], "1A1A4/5"),

  node("overview-battery", 42, 688, 150, 64, "BAT ×2", undefined, "external"),
  node("overview-acdc", 42, 808, 150, 70, "AC/DC ×2", "1A5A1/2", "power"),
  node("overview-pmu", 246, 744, 164, 76, "PMU ×2", "1A4A1/2", "power"),
  node("overview-dcdc-a", 456, 670, 162, 70, "DC/DC-A ×2", "1A1A7/8", "power"),
  node("overview-fan", 456, 842, 162, 70, "FAN TXP1 / TXP2", "1A2A9/1A3A9", "power"),

  node("overview-tx1-tcu", 674, 102, 144, 74, "TCU 1", "1A2A6"),
  node("overview-tx1-rxu", 846, 64, 140, 70, "RXU 1", "1A2A2"),
  node("overview-tx1-dpx", 1014, 64, 142, 70, "DPX-MSC 1", "1A2A1", "rf"),
  node("overview-tx1-txu", 846, 226, 140, 70, "TXU 1", "1A2A4"),
  node("overview-tx1-hpa", 1014, 226, 142, 70, "HPA 1", "1A2A3", "amplifier"),
  node("overview-tx1-dcdc", 674, 302, 144, 70, "DC/DC 1", "1A2A5", "power"),

  node("overview-tx2-tcu", 674, 598, 144, 74, "TCU 2", "1A3A6"),
  node("overview-tx2-rxu", 846, 560, 140, 70, "RXU 2", "1A3A2"),
  node("overview-tx2-dpx", 1014, 560, 142, 70, "DPX-MSC 2", "1A3A1", "rf"),
  node("overview-tx2-txu", 846, 722, 140, 70, "TXU 2", "1A3A4"),
  node("overview-tx2-hpa", 1014, 722, 142, 70, "HPA 2", "1A3A3", "amplifier"),
  node("overview-tx2-dcdc", 674, 798, 144, 70, "DC/DC 2", "1A3A5", "power"),

  node("overview-mon1", 1198, 72, 150, 72, "MON 1", "1A2A8"),
  node("overview-rfg1", 1380, 72, 150, 72, "RFG 1", "1A2A7", "rf"),
  node("overview-mon2", 1198, 260, 150, 72, "MON 2", "1A3A8"),
  node("overview-rfg2", 1380, 260, 150, 72, "RFG 2", "1A3A7", "rf"),
  node("overview-rf-detectors", 1198, 452, 150, 76, "RF DET ×2", "1A9/1A10", "rf"),
  node("overview-vswr", 1380, 452, 150, 76, "VSWR MON", "1A8", "rf"),
  node("overview-relay", 1198, 650, 150, 82, ["COAX RELAY", "MAIN / STANDBY"], "1RY1", "rf"),
  node("overview-antenna", 1380, 646, 150, 90, "DME ANTENNA", undefined, "antenna"),
];

const overviewEdges: readonly DiagramEdge[] = [
  edge("ov-pmdt-ifb", "overview-pmdt", "overview-ifb", "data", [[192, 116], [242, 116]], "USB / LAN / RS-232", [217, 105], "bidirectional"),
  edge("ov-remote-ifb", "overview-remote", "overview-ifb", "data", [[192, 218], [218, 218], [218, 162], [242, 162]], "MODEM / RS-232", [212, 238], "bidirectional"),
  edge("ov-modem-ifb", "overview-modem", "overview-ifb", "data", [[117, 434], [117, 294], [320, 294], [320, 190]], undefined, undefined, "bidirectional"),
  edge("ov-ifb-lmi", "overview-ifb", "overview-lmi", "data", [[320, 190], [320, 226]], "USB / ETHERNET", [332, 210], "bidirectional"),
  edge("ov-ifb-scu", "overview-ifb", "overview-scu", "data", [[398, 151], [424, 151], [424, 244], [450, 244]], undefined, undefined, "bidirectional"),
  edge("ov-csp-scu", "overview-csp", "overview-scu", "control", [[398, 365], [424, 365], [424, 284], [450, 284]], "STATUS / CONTROL", [430, 338], "bidirectional"),
  edge("ov-emu-scu", "overview-emu", "overview-scu", "data", [[192, 365], [218, 365], [218, 410], [430, 410], [430, 294], [450, 294]], "CAN", [328, 399], "bidirectional"),
  edge("ov-scu-tcu1", "overview-scu", "overview-tx1-tcu", "data", [[618, 238], [646, 238], [646, 139], [674, 139]], "CAN / CONTROL", [650, 196], "bidirectional"),
  edge("ov-scu-tcu2", "overview-scu", "overview-tx2-tcu", "data", [[618, 286], [646, 286], [646, 635], [674, 635]], undefined, undefined, "bidirectional"),
  edge("ov-scu-mon1", "overview-scu", "overview-mon1", "control", [[534, 214], [534, 42], [1178, 42], [1178, 108], [1198, 108]], "EXEC. ALARM", [1118, 31], "bidirectional"),
  edge("ov-scu-mon2", "overview-scu", "overview-mon2", "control", [[618, 264], [1174, 264], [1174, 296], [1198, 296]], "EXEC. ALARM", [1108, 253], "bidirectional"),

  edge("ov-rxu1-tcu1", "overview-tx1-rxu", "overview-tx1-tcu", "data", [[846, 99], [818, 99], [818, 139]], "RX VIDEO / ON CH", [824, 88]),
  edge("ov-tcu1-txu1", "overview-tx1-tcu", "overview-tx1-txu", "pulse", [[818, 139], [830, 139], [830, 261], [846, 261]], "TIMING / MOD", [840, 201]),
  edge("ov-txu1-hpa1", "overview-tx1-txu", "overview-tx1-hpa", "rf", [[986, 261], [1014, 261]], "+46.2 dBm", [1000, 250]),
  edge("ov-hpa1-dpx1", "overview-tx1-hpa", "overview-tx1-dpx", "rf", [[1085, 226], [1085, 134]], "HIGH-POWER REPLY", [1097, 183]),
  edge("ov-dpx1-rxu1", "overview-tx1-dpx", "overview-tx1-rxu", "rf", [[1014, 99], [986, 99]], "INTERROGATION", [1000, 88]),
  edge("ov-dpx1-relay", "overview-tx1-dpx", "overview-relay", "rf", [[1156, 99], [1172, 99], [1172, 675], [1198, 675]], "T/R PATH", [1183, 391], "bidirectional"),

  edge("ov-rxu2-tcu2", "overview-tx2-rxu", "overview-tx2-tcu", "data", [[846, 595], [818, 595], [818, 635]], "RX VIDEO / ON CH", [824, 584]),
  edge("ov-tcu2-txu2", "overview-tx2-tcu", "overview-tx2-txu", "pulse", [[818, 635], [830, 635], [830, 757], [846, 757]], "TIMING / MOD", [840, 697]),
  edge("ov-txu2-hpa2", "overview-tx2-txu", "overview-tx2-hpa", "rf", [[986, 757], [1014, 757]], "+46.2 dBm", [1000, 746]),
  edge("ov-hpa2-dpx2", "overview-tx2-hpa", "overview-tx2-dpx", "rf", [[1085, 722], [1085, 630]], "HIGH-POWER REPLY", [1097, 679]),
  edge("ov-dpx2-rxu2", "overview-tx2-dpx", "overview-tx2-rxu", "rf", [[1014, 595], [986, 595]], "INTERROGATION", [1000, 584]),
  edge("ov-dpx2-relay", "overview-tx2-dpx", "overview-relay", "rf", [[1156, 595], [1184, 595], [1184, 707], [1198, 707]], "T/R PATH", [1173, 584], "bidirectional"),
  edge("ov-relay-antenna", "overview-relay", "overview-antenna", "rf", [[1348, 691], [1380, 691]], "ACTIVE TX / RX", [1364, 680], "bidirectional"),

  edge("ov-mon1-rfg1", "overview-mon1", "overview-rfg1", "control", [[1348, 108], [1380, 108]], "TEST / DETECT", [1364, 97], "bidirectional"),
  edge("ov-mon2-rfg2", "overview-mon2", "overview-rfg2", "control", [[1348, 296], [1380, 296]], "TEST / DETECT", [1364, 285], "bidirectional"),
  edge("ov-rfg1-both-tx", "overview-rfg1", "overview-tx1-dpx", "monitor", [[1455, 144], [1455, 176], [1166, 176], [1166, 118], [1156, 118]], "TO BOTH TXP", [1306, 165]),
  edge("ov-rfg2-both-tx", "overview-rfg2", "overview-tx2-dpx", "monitor", [[1455, 332], [1455, 360], [1162, 360], [1162, 600], [1156, 600]], "TO BOTH TXP", [1305, 349]),
  edge("ov-ant-rfdet", "overview-antenna", "overview-rf-detectors", "monitor", [[1455, 646], [1455, 568], [1273, 568], [1273, 528]], "ANTENNA SAMPLE", [1364, 557]),
  edge("ov-ant-vswr", "overview-antenna", "overview-vswr", "monitor", [[1490, 646], [1490, 528]], "FWD / REV", [1502, 586]),
  edge("ov-rfdet-mon1", "overview-rf-detectors", "overview-mon1", "monitor", [[1248, 452], [1248, 144]], "MON1 + MON2", [1260, 387]),
  edge("ov-rfdet-mon2", "overview-rf-detectors", "overview-mon2", "monitor", [[1298, 452], [1298, 332]], undefined, undefined),
  edge("ov-vswr-mon1", "overview-vswr", "overview-mon1", "monitor", [[1420, 452], [1420, 388], [1360, 388], [1360, 128], [1348, 128]], "BOTH MONITORS", [1372, 379]),
  edge("ov-vswr-mon2", "overview-vswr", "overview-mon2", "monitor", [[1460, 452], [1460, 374], [1366, 374], [1366, 312], [1348, 312]], undefined, undefined),

  edge("ov-bat-pmu", "overview-battery", "overview-pmu", "power", [[192, 720], [218, 720], [218, 782], [246, 782]], "BACKUP / CHARGE", [224, 709], "bidirectional"),
  edge("ov-acdc-pmu", "overview-acdc", "overview-pmu", "power", [[192, 843], [220, 843], [220, 794], [246, 794]], "+28 VDC", [220, 832]),
  edge("ov-pmu-dcdca", "overview-pmu", "overview-dcdc-a", "power", [[410, 770], [432, 770], [432, 705], [456, 705]], "28 V BUS", [438, 759]),
  edge("ov-pmu-dcdc1", "overview-pmu", "overview-tx1-dcdc", "power", [[328, 744], [328, 620], [650, 620], [650, 337], [674, 337]], undefined, undefined),
  edge("ov-pmu-dcdc2", "overview-pmu", "overview-tx2-dcdc", "power", [[410, 800], [650, 800], [650, 833], [674, 833]], undefined, undefined),
  edge("ov-pmu-scu", "overview-pmu", "overview-scu", "data", [[328, 744], [328, 544], [534, 544], [534, 314]], "CAN", [424, 533], "bidirectional"),
  edge("ov-dcdc-fan", "overview-tx2-dcdc", "overview-fan", "power", [[674, 850], [618, 850]], "TXP1 / TXP2", [646, 839]),
];

const txRfNodes: readonly DiagramNode[] = [
  node("txrf-tx1-tcu", 48, 132, 150, 78, "TCU 1", "1A2A6"),
  node("txrf-tx1-rxu", 258, 64, 148, 72, "RXU 1", "1A2A2"),
  node("txrf-tx1-dpx", 456, 64, 154, 72, "DPX-MSC 1", "1A2A1", "rf"),
  node("txrf-tx1-txu", 258, 238, 148, 72, "TXU 1", "1A2A4"),
  node("txrf-tx1-hpa", 456, 238, 154, 72, "HPA 1", "1A2A3", "amplifier"),
  node("txrf-circulator1", 682, 174, 154, 90, "CIRCULATOR 1", "1CIR1", "rf"),
  node("txrf-coupler1", 882, 174, 154, 90, "1DC1 · 27 dB", "1DC1", "rf"),

  node("txrf-tx2-tcu", 48, 664, 150, 78, "TCU 2", "1A3A6"),
  node("txrf-tx2-rxu", 258, 596, 148, 72, "RXU 2", "1A3A2"),
  node("txrf-tx2-dpx", 456, 596, 154, 72, "DPX-MSC 2", "1A3A1", "rf"),
  node("txrf-tx2-txu", 258, 770, 148, 72, "TXU 2", "1A3A4"),
  node("txrf-tx2-hpa", 456, 770, 154, 72, "HPA 2", "1A3A3", "amplifier"),
  node("txrf-circulator2", 682, 706, 154, 90, "CIRCULATOR 2", "1CIR2", "rf"),
  node("txrf-coupler2", 882, 706, 154, 90, "1DC2 · 27 dB", "1DC2", "rf"),

  node("txrf-dummy-load", 1080, 84, 160, 82, "DUMMY LOAD", "1RT1", "rf"),
  node("txrf-relay", 1080, 404, 160, 96, ["DPDT COAX RELAY", "TX1 / TX2"], "1RY1", "rf"),
  node("txrf-coupler3", 1284, 404, 150, 96, "1DC3 · 27 dB", "1DC3", "rf"),
  node("txrf-vswr", 1284, 574, 150, 82, "VSWR MON", "1A8", "rf"),
  node("txrf-lpf", 1476, 412, 128, 80, "LPF", "1FL1", "rf"),
  node("txrf-lightning", 1640, 412, 128, 80, "ARRESTER", "1AR1", "rf"),
  node("txrf-antenna", 1804, 402, 132, 100, "DME ANTENNA", undefined, "antenna"),
];

const txRfEdges: readonly DiagramEdge[] = [
  edge("txrf-rxu1-tcu1", "txrf-tx1-rxu", "txrf-tx1-tcu", "data", [[258, 100], [214, 100], [214, 171], [198, 171]], "RX VIDEO / ON CH", [220, 89]),
  edge("txrf-tcu1-txu1", "txrf-tx1-tcu", "txrf-tx1-txu", "pulse", [[198, 171], [224, 171], [224, 274], [258, 274]], "GAUSSIAN / RECT", [236, 224]),
  edge("txrf-dpx1-rxu1", "txrf-tx1-dpx", "txrf-tx1-rxu", "rf", [[456, 100], [406, 100]], "INTERROGATION", [431, 89]),
  edge("txrf-txu1-hpa1", "txrf-tx1-txu", "txrf-tx1-hpa", "rf", [[406, 274], [456, 274]], "+46.2 dBm", [431, 263]),
  edge("txrf-hpa1-circ1", "txrf-tx1-hpa", "txrf-circulator1", "rf", [[610, 274], [648, 274], [648, 219], [682, 219]], ">1.6 kW PEAK", [648, 293]),
  edge("txrf-circ1-dpx1", "txrf-circulator1", "txrf-tx1-dpx", "rf", [[682, 199], [642, 199], [642, 120], [610, 120]], "RECEIVE", [649, 188]),
  edge("txrf-circ1-coupler1", "txrf-circulator1", "txrf-coupler1", "rf", [[836, 219], [882, 219]], "DUPLEXED RF", [859, 208], "bidirectional"),
  edge("txrf-coupler1-rxu1", "txrf-coupler1", "txrf-tx1-rxu", "monitor", [[959, 174], [959, 36], [332, 36], [332, 64]], "TX SAMPLE TO RXU 1", [666, 25]),
  edge("txrf-coupler1-relay", "txrf-coupler1", "txrf-relay", "rf", [[1036, 219], [1058, 219], [1058, 432], [1080, 432]], "TXP1", [1069, 323], "bidirectional"),

  edge("txrf-rxu2-tcu2", "txrf-tx2-rxu", "txrf-tx2-tcu", "data", [[258, 632], [214, 632], [214, 703], [198, 703]], "RX VIDEO / ON CH", [220, 621]),
  edge("txrf-tcu2-txu2", "txrf-tx2-tcu", "txrf-tx2-txu", "pulse", [[198, 703], [224, 703], [224, 806], [258, 806]], "GAUSSIAN / RECT", [236, 756]),
  edge("txrf-dpx2-rxu2", "txrf-tx2-dpx", "txrf-tx2-rxu", "rf", [[456, 632], [406, 632]], "INTERROGATION", [431, 621]),
  edge("txrf-txu2-hpa2", "txrf-tx2-txu", "txrf-tx2-hpa", "rf", [[406, 806], [456, 806]], "+46.2 dBm", [431, 795]),
  edge("txrf-hpa2-circ2", "txrf-tx2-hpa", "txrf-circulator2", "rf", [[610, 806], [648, 806], [648, 751], [682, 751]], ">1.6 kW PEAK", [648, 825]),
  edge("txrf-circ2-dpx2", "txrf-circulator2", "txrf-tx2-dpx", "rf", [[682, 731], [642, 731], [642, 652], [610, 652]], "RECEIVE", [649, 720]),
  edge("txrf-circ2-coupler2", "txrf-circulator2", "txrf-coupler2", "rf", [[836, 751], [882, 751]], "DUPLEXED RF", [859, 740], "bidirectional"),
  edge("txrf-coupler2-rxu2", "txrf-coupler2", "txrf-tx2-rxu", "monitor", [[959, 796], [959, 876], [332, 876], [332, 668]], "TX SAMPLE TO RXU 2", [666, 895]),
  edge("txrf-coupler2-relay", "txrf-coupler2", "txrf-relay", "rf", [[1036, 751], [1058, 751], [1058, 472], [1080, 472]], "TXP2", [1069, 626], "bidirectional"),

  edge("txrf-relay-load", "txrf-relay", "txrf-dummy-load", "rf", [[1160, 404], [1160, 166]], "STANDBY TX", [1172, 287]),
  edge("txrf-relay-coupler3", "txrf-relay", "txrf-coupler3", "rf", [[1240, 452], [1284, 452]], "ON-ANTENNA PATH", [1262, 441], "bidirectional"),
  edge("txrf-coupler3-vswr", "txrf-coupler3", "txrf-vswr", "monitor", [[1359, 500], [1359, 574]], "FWD / REVERSE", [1371, 541]),
  edge("txrf-coupler3-lpf", "txrf-coupler3", "txrf-lpf", "rf", [[1434, 452], [1476, 452]], undefined, undefined, "bidirectional"),
  edge("txrf-lpf-arrester", "txrf-lpf", "txrf-lightning", "rf", [[1604, 452], [1640, 452]], "HARMONIC FILTER", [1622, 441], "bidirectional"),
  edge("txrf-arrester-antenna", "txrf-lightning", "txrf-antenna", "rf", [[1768, 452], [1804, 452]], "COMMON FEEDER", [1786, 441], "bidirectional"),
];

const monitorNodes: readonly DiagramNode[] = [
  node("monitor-antenna", 42, 306, 154, 88, "DME ANTENNA", undefined, "antenna"),
  node("monitor-rf-detectors", 246, 76, 166, 82, ["RF DET 1 / 2", "ANTENNA SAMPLE"], "1A9/1A10", "rf"),
  node("monitor-couplers", 246, 306, 166, 88, ["1DC1 / 1DC2 / 1DC3", "TX RF SAMPLES"], undefined, "rf"),
  node("monitor-vswr", 246, 538, 166, 82, "VSWR MONITOR", "1A8", "rf"),
  node("monitor-mon1", 548, 126, 172, 92, ["MON 1", "SUPERVISES TX1 + TX2"], "1A2A8"),
  node("monitor-rfg1", 794, 126, 166, 92, "RFG 1", "1A2A7", "rf"),
  node("monitor-mon2", 548, 430, 172, 92, ["MON 2", "SUPERVISES TX1 + TX2"], "1A3A8"),
  node("monitor-rfg2", 794, 430, 166, 92, "RFG 2", "1A3A7", "rf"),
];

const monitorEdges: readonly DiagramEdge[] = [
  edge("mon-ant-rfdet", "monitor-antenna", "monitor-rf-detectors", "monitor", [[119, 306], [119, 117], [246, 117]], "ANTENNA MONITOR PORTS", [132, 106]),
  edge("mon-ant-couplers", "monitor-antenna", "monitor-couplers", "rf", [[196, 350], [246, 350]], "COMMON RF", [221, 339], "bidirectional"),
  edge("mon-couplers-vswr", "monitor-couplers", "monitor-vswr", "monitor", [[329, 394], [329, 538]], "FORWARD / REFLECTED", [341, 474]),
  edge("mon-rfdet-mon1", "monitor-rf-detectors", "monitor-mon1", "monitor", [[412, 107], [492, 107], [492, 160], [548, 160]], "TX1 + TX2 ANTENNA SAMPLE", [477, 96]),
  edge("mon-rfdet-mon2", "monitor-rf-detectors", "monitor-mon2", "monitor", [[412, 139], [466, 139], [466, 464], [548, 464]], "SAME SOURCE SET", [478, 324]),
  edge("mon-couplers-mon1", "monitor-couplers", "monitor-mon1", "monitor", [[412, 330], [508, 330], [508, 184], [548, 184]], "TX1 + TX2 REPLY SAMPLES", [520, 281]),
  edge("mon-couplers-mon2", "monitor-couplers", "monitor-mon2", "monitor", [[412, 370], [508, 370], [508, 488], [548, 488]], "TX1 + TX2 REPLY SAMPLES", [520, 407]),
  edge("mon-vswr-mon1", "monitor-vswr", "monitor-mon1", "monitor", [[412, 568], [528, 568], [528, 202], [548, 202]], "VSWR TO BOTH MONITORS", [540, 354]),
  edge("mon-vswr-mon2", "monitor-vswr", "monitor-mon2", "monitor", [[412, 594], [516, 594], [516, 506], [548, 506]], undefined, undefined),
  edge("mon-mon1-rfg1", "monitor-mon1", "monitor-rfg1", "control", [[720, 172], [794, 172]], "INTERROGATION / DETECT", [757, 161], "bidirectional"),
  edge("mon-mon2-rfg2", "monitor-mon2", "monitor-rfg2", "control", [[720, 476], [794, 476]], "INTERROGATION / DETECT", [757, 465], "bidirectional"),
  edge("mon-rfg1-both-tx", "monitor-rfg1", "both-transponders", "rf", [[960, 172], [1014, 172], [1014, 274], [1054, 274]], "TO TXP1 + TXP2 DPX-MSC", [1012, 161], "bidirectional"),
  edge("mon-rfg2-both-tx", "monitor-rfg2", "both-transponders", "rf", [[960, 476], [1014, 476], [1014, 348], [1054, 348]], "TO TXP1 + TXP2 DPX-MSC", [1012, 491], "bidirectional"),
  edge("mon-mon1-scu", "monitor-mon1", "dual-scu", "control", [[634, 126], [634, 48], [1128, 48], [1128, 548]], "EXEC. ALARM", [925, 37]),
  edge("mon-mon2-scu", "monitor-mon2", "dual-scu", "control", [[720, 452], [1094, 452], [1094, 548]], "EXEC. ALARM", [969, 441]),
];

const controlNodes: readonly DiagramNode[] = [
  node("control-pmdt", 40, 92, 154, 72, "PMDT", undefined, "external"),
  node("control-remote", 40, 258, 154, 72, ["RCU / RSU", "REMOTE"], undefined, "external"),
  node("control-ifb", 258, 166, 170, 92, ["IFB", "SURGE PROTECTION"], "1A7"),
  node("control-modem", 258, 354, 170, 74, "MODEM ×2", "1A1A9/10"),
  node("control-lmi", 500, 70, 166, 76, "LMI", "1A6"),
  node("control-csp", 500, 198, 166, 76, "CSP", "1A1A1"),
  node("control-emu", 500, 326, 166, 76, "EMU", "1A1A6"),
  node("control-scu", 760, 174, 182, 112, ["SCU ×2", "AND / OR VOTING", "CHANGEOVER"], "1A1A4/5"),
  node("control-tcu", 1030, 86, 178, 84, ["TCU 1 + TCU 2", "TX / RX CONTROL"], "1A2A6/1A3A6"),
];

const controlEdges: readonly DiagramEdge[] = [
  edge("ctl-pmdt-ifb", "control-pmdt", "control-ifb", "data", [[194, 128], [226, 128], [226, 195], [258, 195]], "USB / LAN / RS-232", [226, 117], "bidirectional"),
  edge("ctl-remote-ifb", "control-remote", "control-ifb", "data", [[194, 294], [226, 294], [226, 229], [258, 229]], "RS-232 / MODEM", [225, 312], "bidirectional"),
  edge("ctl-modem-ifb", "control-modem", "control-ifb", "data", [[343, 354], [343, 258]], "TIP / RING", [355, 309], "bidirectional"),
  edge("ctl-ifb-lmi", "control-ifb", "control-lmi", "data", [[428, 190], [466, 190], [466, 108], [500, 108]], "USB / ETHERNET", [476, 178], "bidirectional"),
  edge("ctl-ifb-scu", "control-ifb", "control-scu", "data", [[428, 224], [732, 224], [760, 224]], "RS-232 / STATUS I/O", [594, 213], "bidirectional"),
  edge("ctl-csp-scu", "control-csp", "control-scu", "control", [[666, 236], [760, 236]], "LOCAL CONTROL / STATUS", [713, 225], "bidirectional"),
  edge("ctl-emu-scu", "control-emu", "control-scu", "data", [[666, 364], [712, 364], [712, 260], [760, 260]], "CAN", [724, 337], "bidirectional"),
  edge("ctl-scu-tcu", "control-scu", "control-tcu", "data", [[942, 206], [982, 206], [982, 128], [1030, 128]], "CAN / FREQUENCY / STATUS", [990, 195], "bidirectional"),
  edge("ctl-monitor-alarm", "dual-monitor", "control-scu", "control", [[1208, 346], [984, 346], [984, 256], [942, 256]], "EXEC. ALARM ×2", [1091, 335]),
  edge("ctl-scu-rf", "control-scu", "rf-changeover", "control", [[851, 286], [851, 520], [1030, 520]], "TRANSFER / SHUTDOWN", [864, 415]),
  edge("ctl-env-emu", "environment-sensors", "control-emu", "data", [[194, 528], [466, 528], [466, 364], [500, 364]], "TEMP / SMOKE / INTRUSION", [354, 517]),
];

const powerNodes: readonly DiagramNode[] = [
  node("power-battery", 52, 132, 162, 74, "BACKUP BAT ×2", undefined, "external"),
  node("power-acdc", 52, 340, 162, 78, ["AC/DC ×2", "110/220 VAC → 28 VDC"], "1A5A1/2", "power"),
  node("power-pmu", 306, 228, 176, 94, ["PMU 1 + PMU 2", "OR-ING / CHARGER"], "1A4A1/2", "power"),
  node("power-dcdc-a", 584, 76, 178, 78, "DC/DC-A ×2", "1A1A7/8", "power"),
  node("power-dcdc-1", 584, 226, 178, 78, "TXP1 DC/DC", "1A2A5", "power"),
  node("power-dcdc-2", 584, 376, 178, 78, "TXP2 DC/DC", "1A3A5", "power"),
  node("power-fan", 854, 302, 172, 82, "FAN TXP1 / TXP2", "1A2A9/1A3A9", "power"),
];

const powerEdges: readonly DiagramEdge[] = [
  edge("pwr-bat-pmu", "power-battery", "power-pmu", "power", [[214, 169], [258, 169], [258, 256], [306, 256]], "FLOAT CHARGE / NO-BREAK", [263, 158], "bidirectional"),
  edge("pwr-ac-acdc", "ac-mains", "power-acdc", "power", [[52, 379], [18, 379], [18, 526], [120, 526], [120, 418]], "AC MAINS", [31, 462]),
  edge("pwr-acdc-pmu", "power-acdc", "power-pmu", "power", [[214, 379], [258, 379], [258, 294], [306, 294]], "+28 VDC / PMBus", [264, 368], "bidirectional"),
  edge("pwr-pmu-dcdca", "power-pmu", "power-dcdc-a", "power", [[482, 250], [534, 250], [534, 115], [584, 115]], "+28 VDC BUS", [546, 187]),
  edge("pwr-pmu-dcdc1", "power-pmu", "power-dcdc-1", "power", [[482, 275], [584, 265]], undefined, undefined),
  edge("pwr-pmu-dcdc2", "power-pmu", "power-dcdc-2", "power", [[482, 300], [534, 300], [534, 415], [584, 415]], undefined, undefined),
  edge("pwr-dcdc1-fan", "power-dcdc-1", "power-fan", "power", [[762, 265], [814, 265], [814, 329], [854, 329]], "TXP1 SUBRACK", [811, 254]),
  edge("pwr-dcdc2-fan", "power-dcdc-2", "power-fan", "power", [[762, 415], [826, 415], [826, 357], [854, 357]], "TXP2 SUBRACK", [812, 434]),
  edge("pwr-dcdca-bpa", "power-dcdc-a", "bp-a-loads", "power", [[762, 115], [1054, 115]], "+5 V / ±15 V", [908, 104]),
  edge("pwr-dcdc1-bpb", "power-dcdc-1", "bp-b-loads", "power", [[762, 265], [1054, 265]], "+5 / +8 / ±15 / +28 / +50 V", [908, 254]),
  edge("pwr-dcdc2-bpb", "power-dcdc-2", "bp-b-loads", "power", [[762, 415], [1054, 415]], undefined, undefined),
  edge("pwr-pmu-can", "power-pmu", "dual-scu", "data", [[394, 228], [394, 48], [1138, 48], [1138, 536]], "CAN · VOLTAGE / CURRENT / TEMP / BATTERY", [798, 37], "bidirectional"),
];

const diagrams: readonly DiagramDefinition[] = [
  {
    id: "overview",
    label: "Tổng thể",
    reference: "Figure 3-1 · System Block Diagram · dual transponder / dual monitor",
    width: 1570,
    height: 980,
    nodes: overviewNodes,
    edges: overviewEdges,
    groups: [
      { id: "access", label: "LOCAL / REMOTE ACCESS", x: 22, y: 48, width: 398, height: 474 },
      { id: "control", label: "CONTROL AND MONITORING · 1A1", x: 224, y: 46, width: 414, height: 386 },
      { id: "power", label: "POWER SUPPLY", x: 22, y: 638, width: 616, height: 302 },
      { id: "tx1", label: "TXP1 · 1A2 · HIGH-POWER DME 320", x: 650, y: 30, width: 526, height: 372 },
      { id: "tx2", label: "TXP2 · 1A3 · HIGH-POWER DME 320", x: 650, y: 526, width: 526, height: 372 },
      { id: "monitors", label: "DUAL MONITOR · EACH MON SUPERVISES BOTH TXP", x: 1180, y: 34, width: 370, height: 520 },
      { id: "rf-common", label: "RF CHANGEOVER / ANTENNA", x: 1180, y: 622, width: 370, height: 146 },
    ],
  },
  {
    id: "tx-rf",
    label: "Máy phát & RF",
    reference: "Figures 3-2 and 3-54 · DME 320 high-power RF route",
    width: 1980,
    height: 920,
    nodes: txRfNodes,
    edges: txRfEdges,
    groups: [
      { id: "tx1", label: "TXP1 · 1A2 · TXU → HPA → CIRCULATOR", x: 24, y: 26, width: 1028, height: 320 },
      { id: "tx2", label: "TXP2 · 1A3 · TXU → HPA → CIRCULATOR", x: 24, y: 558, width: 1028, height: 320 },
      { id: "changeover", label: "COAXIAL CHANGEOVER · ACTIVE TO ANTENNA / STANDBY TO LOAD", x: 1056, y: 48, width: 196, height: 500 },
      { id: "common-rf", label: "COMMON RF / ANTENNA SYSTEM", x: 1260, y: 372, width: 700, height: 322 },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    reference: "Figures 3-24 and 3-54 · dual monitor supervision paths",
    width: 1280,
    height: 700,
    nodes: monitorNodes,
    edges: monitorEdges,
    groups: [
      { id: "sources", label: "COMMON RF MEASUREMENTS", x: 20, y: 40, width: 418, height: 612 },
      { id: "dual-monitor", label: "MON1 AND MON2 EACH WATCH TXP1 + TXP2", x: 520, y: 74, width: 466, height: 498 },
      { id: "both-transponders", label: "TXP1 + TXP2 · DPX-MSC PATHS", x: 1054, y: 226, width: 202, height: 164 },
      { id: "dual-scu", label: "DUAL SCU · AND / OR VOTING", x: 1054, y: 548, width: 202, height: 72 },
    ],
  },
  {
    id: "control",
    label: "Điều khiển",
    reference: "Figures 3-33 and 3-56 · Control, monitoring and IFB interfaces",
    width: 1280,
    height: 680,
    nodes: controlNodes,
    edges: controlEdges,
    groups: [
      { id: "access", label: "MAINTENANCE / REMOTE ACCESS", x: 20, y: 44, width: 430, height: 414 },
      { id: "local", label: "LOCAL PANELS / ENVIRONMENT", x: 472, y: 42, width: 222, height: 392 },
      { id: "controller", label: "REDUNDANT SYSTEM CONTROL", x: 726, y: 130, width: 244, height: 196 },
      { id: "dual-monitor", label: "MON1 + MON2 · EXECUTIVE ALARMS", x: 1030, y: 304, width: 202, height: 82 },
      { id: "rf-changeover", label: "COAX RELAY / TX ON-OFF", x: 1030, y: 484, width: 202, height: 74 },
      { id: "environment-sensors", label: "TEMP · SMOKE · INTRUSION", x: 20, y: 492, width: 174, height: 72 },
    ],
  },
  {
    id: "power",
    label: "Nguồn",
    reference: "Figure 3-48 · Power Supply Block Diagram · two fitted AC/DC modules",
    width: 1240,
    height: 640,
    nodes: powerNodes,
    edges: powerEdges,
    groups: [
      { id: "source", label: "PRIMARY + BACKUP SOURCES", x: 24, y: 76, width: 218, height: 392 },
      { id: "management", label: "DUAL POWER MANAGEMENT / OR-ING", x: 278, y: 180, width: 230, height: 194 },
      { id: "conversion", label: "DISTRIBUTED DC CONVERSION", x: 552, y: 42, width: 500, height: 456 },
      { id: "bp-a-loads", label: "BP-A · AUXILIARY ELECTRONICS", x: 1054, y: 78, width: 164, height: 74 },
      { id: "bp-b-loads", label: "BP-B · TXP1 / TXP2 LOADS", x: 1054, y: 228, width: 164, height: 224 },
      { id: "dual-scu", label: "DUAL SCU · CAN", x: 1054, y: 536, width: 164, height: 64 },
      { id: "ac-mains", label: "110 / 220 VAC MAINS", x: 38, y: 502, width: 164, height: 58 },
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
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path className={styles[`marker${kind[0]!.toUpperCase()}${kind.slice(1)}`]} d="M0 0L8 4L0 8Z" />
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
