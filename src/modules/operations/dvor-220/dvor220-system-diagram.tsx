"use client";

import { useId, useMemo, useState } from "react";
import type {
  Dvor220BlockId,
  Dvor220DiagramOccurrence,
} from "./block-diagram-data";
import {
  DVOR_220_BLOCK_BY_ID,
  DVOR_220_COMPONENT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dvor220-block-diagram.module.css";

interface Dvor220SystemDiagramProps {
  selectedOccurrenceId: string | null;
  onSelect: (blockId: Dvor220BlockId, occurrence: Dvor220DiagramOccurrence) => void;
}

type DiagramId = "overview" | "tx-rf" | "monitor" | "asu" | "power-control";
type LinkKind = "rf" | "modulation" | "control" | "monitor" | "power" | "data";

interface DiagramNode {
  id: string;
  componentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: readonly string[];
  reference?: string;
  variant?: "amplifier" | "external" | "antenna" | "group";
}

interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  kind: LinkKind;
  points: readonly [number, number][];
  label?: string;
  labelAt?: [number, number];
  direction?: "forward" | "reverse" | "bidirectional" | "none";
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

const n = (
  id: string,
  componentId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string | readonly string[],
  reference?: string,
  variant?: DiagramNode["variant"],
): DiagramNode => ({
  id,
  componentId,
  x,
  y,
  width,
  height,
  label: typeof label === "string" ? [label] : label,
  reference,
  variant,
});

const e = (
  id: string,
  from: string,
  to: string,
  kind: LinkKind,
  points: readonly [number, number][],
  label?: string,
  labelAt?: [number, number],
  direction: DiagramEdge["direction"] = "forward",
): DiagramEdge => ({ id, from, to, kind, points, label, labelAt, direction });

const overviewNodes: readonly DiagramNode[] = [
  n("remote", "overview-remote", 28, 38, 124, 54, ["RCU / RSU", "REMOTE"], undefined, "external"),
  n("pmdt", "overview-pmdt", 240, 38, 124, 54, ["PMDT", "MAINTENANCE PC"], undefined, "external"),
  n("ifb", "overview-ifb", 68, 148, 124, 58, "IFB", "1A7"),
  n("lmi", "overview-lmi", 240, 148, 124, 58, "LMI", "1A6"),
  n("emu", "overview-emu", 68, 238, 124, 54, "EMU", "1A1A5"),
  n("niu", "overview-niu", 240, 238, 124, 54, "NIU ×2", "1A1A6/7"),
  n("modem", "overview-modem", 68, 322, 124, 54, "MODEM ×2", "1A1A10/11"),
  n("vau", "overview-vau", 240, 322, 124, 54, "VAU", "1A1A12"),
  n("csp", "overview-csp", 68, 406, 124, 54, "CSP", "1A1A1"),
  n("dcdc-aux", "overview-dcdc-aux", 240, 406, 124, 54, "DC/DC-A ×2", "1A1A8/9"),
  n("scu", "overview-scu", 426, 238, 140, 76, ["SCU ×2", "CONTROL / VOTING"], "1A1A3/4"),

  n("tx1-dcdc", "overview-tx1-dcdc", 640, 46, 98, 50, "DC/DC", "1A2A4"),
  n("tx1-msg", "overview-tx1-msg", 640, 124, 98, 50, "MSG", "1A2A5"),
  n("tx1-syn", "overview-tx1-syn", 786, 124, 98, 50, "SYN", "1A2A6"),
  n("tx1-sma-lsb", "overview-tx1-sma-lsb", 640, 218, 98, 70, ["LSB SMA", "MOD → PA"], "1A2A1", "amplifier"),
  n("tx1-cma", "overview-tx1-cma", 786, 218, 98, 70, ["CMA", "MOD → PA"], "1A2A2", "amplifier"),
  n("tx1-sma-usb", "overview-tx1-sma-usb", 932, 218, 98, 70, ["USB SMA", "MOD → PA"], "1A2A3", "amplifier"),
  n("tx1-fan", "overview-tx1-fan", 932, 46, 98, 50, "FAN", "1A2A8"),
  n("mon1", "overview-mon1", 786, 316, 98, 52, "MON 1", "1A2A7"),

  n("tx2-dcdc", "overview-tx2-dcdc", 640, 524, 98, 50, "DC/DC", "1A3A4"),
  n("tx2-msg", "overview-tx2-msg", 640, 602, 98, 50, "MSG", "1A3A5"),
  n("tx2-syn", "overview-tx2-syn", 786, 602, 98, 50, "SYN", "1A3A6"),
  n("tx2-sma-lsb", "overview-tx2-sma-lsb", 640, 696, 98, 70, ["LSB SMA", "MOD → PA"], "1A3A1", "amplifier"),
  n("tx2-cma", "overview-tx2-cma", 786, 696, 98, 70, ["CMA", "MOD → PA"], "1A3A2", "amplifier"),
  n("tx2-sma-usb", "overview-tx2-sma-usb", 932, 696, 98, 70, ["USB SMA", "MOD → PA"], "1A3A3", "amplifier"),
  n("tx2-fan", "overview-tx2-fan", 932, 524, 98, 50, "FAN", "1A3A8"),
  n("mon2", "overview-mon2", 786, 794, 98, 52, "MON 2", "1A3A7"),

  n("pdc", "overview-pdc", 1134, 336, 128, 84, ["PDC", "CHANGEOVER / DETECT"], "1A8A1"),
  n("asu", "overview-asu", 1352, 336, 126, 84, ["ASU", "TM + 4 SM"], "2A1"),
  n("carrier-ant", "overview-carrier-antenna", 1568, 256, 116, 66, ["CARRIER", "ANTENNA"], undefined, "antenna"),
  n("sideband-ant", "overview-sideband-antennas", 1568, 410, 116, 74, ["48 SIDEBAND", "ANTENNAS"], undefined, "antenna"),
  n("field-ant", "overview-field-antennas", 1568, 598, 116, 66, ["FIELD MON", "ANTENNAS 1-3"], undefined, "antenna"),
  n("divider", "overview-divider", 1134, 574, 128, 76, ["QUINT", "3-WAY DIVIDER"], "1PD1"),
  n("tsg", "overview-tsg", 926, 594, 104, 54, "TSG", "1A1A2"),

  n("pmu", "overview-pmu", 68, 618, 124, 62, "PMU ×2", "1A4A1/2"),
  n("acdc", "overview-acdc", 240, 618, 124, 62, "AC/DC ×3", "1A5"),
  n("battery", "overview-battery", 68, 724, 124, 58, "BAT ×2", undefined, "external"),
];

const overviewEdges: readonly DiagramEdge[] = [
  e("remote-ifb", "remote", "ifb", "data", [[90, 92], [90, 148]], "MODEM / IP", [118, 120], "bidirectional"),
  e("pmdt-ifb", "pmdt", "ifb", "data", [[302, 92], [302, 118], [150, 118], [150, 148]], "USB / RS-232", [216, 110], "bidirectional"),
  e("pmdt-niu", "pmdt", "niu", "data", [[302, 92], [302, 238]], "LAN", [318, 218], "bidirectional"),
  e("ifb-scu", "ifb", "scu", "data", [[192, 177], [216, 177], [216, 224], [386, 224], [386, 256], [426, 256]], undefined, undefined, "bidirectional"),
  e("lmi-scu", "lmi", "scu", "data", [[364, 177], [396, 177], [396, 268], [426, 268]], "LAN / USB", [396, 166], "bidirectional"),
  e("emu-scu", "emu", "scu", "data", [[192, 265], [426, 265]], "CAN", [216, 256], "bidirectional"),
  e("niu-scu", "niu", "scu", "data", [[364, 265], [426, 265]], undefined, undefined, "bidirectional"),
  e("modem-ifb", "modem", "ifb", "data", [[130, 322], [130, 206]], undefined, undefined, "bidirectional"),
  e("vau-msg1", "vau", "tx1-msg", "modulation", [[364, 349], [602, 349], [602, 155], [640, 155]], "VOICE", [586, 338]),
  e("vau-msg2", "vau", "tx2-msg", "modulation", [[364, 349], [602, 349], [602, 633], [640, 633]], undefined),
  e("csp-scu", "csp", "scu", "control", [[192, 427], [386, 427], [386, 296], [426, 296]], undefined, undefined, "bidirectional"),
  e("dcdcaux-bus", "dcdc-aux", "scu", "power", [[364, 433], [404, 433], [404, 304], [426, 304]], "+5 / ±15V", [396, 390]),
  e("scu-msg1", "scu", "tx1-msg", "control", [[566, 250], [606, 250], [606, 143], [640, 143]], "CAN / SWITCH", [604, 210], "bidirectional"),
  e("scu-msg2", "scu", "tx2-msg", "control", [[566, 290], [606, 290], [606, 621], [640, 621]], undefined, undefined, "bidirectional"),
  e("scu-pdc", "scu", "pdc", "control", [[566, 296], [1074, 296], [1074, 372], [1134, 372]], "CHANGEOVER", [1080, 286], "bidirectional"),
  e("dcdc1-syn", "tx1-dcdc", "tx1-syn", "power", [[738, 71], [835, 71], [835, 124]], "+28V", [786, 62]),
  e("dcdc1-msg", "tx1-dcdc", "tx1-msg", "power", [[689, 96], [689, 124]]),
  e("msg1-syn", "tx1-msg", "tx1-syn", "control", [[738, 143], [786, 143]], "SWITCH / SYNC", [762, 114], "bidirectional"),
  e("syn1-lsb", "tx1-syn", "tx1-sma-lsb", "rf", [[835, 174], [835, 194], [697, 194], [697, 218]], "fL", [762, 186]),
  e("syn1-cma", "tx1-syn", "tx1-cma", "rf", [[835, 174], [835, 218]], "fC", [846, 196]),
  e("syn1-usb", "tx1-syn", "tx1-sma-usb", "rf", [[835, 174], [835, 194], [981, 194], [981, 218]], "fU", [908, 186]),
  e("msg1-lsb", "tx1-msg", "tx1-sma-lsb", "modulation", [[681, 174], [681, 218]], "SIN/COS", [662, 196]),
  e("msg1-cma", "tx1-msg", "tx1-cma", "modulation", [[738, 155], [762, 155], [762, 253], [786, 253]], "COMP", [762, 242]),
  e("msg1-usb", "tx1-msg", "tx1-sma-usb", "modulation", [[738, 161], [908, 161], [908, 253], [932, 253]], "SIN/COS", [908, 242]),
  e("lsb1-pdc", "tx1-sma-lsb", "pdc", "rf", [[738, 253], [768, 253], [768, 304], [1096, 304], [1096, 350], [1134, 350]], "LSB COS/SIN", [1082, 314]),
  e("cma1-pdc", "tx1-cma", "pdc", "rf", [[884, 253], [916, 253], [916, 308], [1106, 308], [1106, 364], [1134, 364]], "CARRIER", [1072, 266]),
  e("usb1-pdc", "tx1-sma-usb", "pdc", "rf", [[1030, 253], [1116, 253], [1116, 384], [1134, 384]], "USB COS/SIN", [1082, 224]),
  e("pdc-carrier", "pdc", "carrier-ant", "rf", [[1262, 356], [1522, 356], [1522, 289], [1568, 289]], "ACTIVE CARRIER", [1415, 326]),
  e("pdc-asu", "pdc", "asu", "rf", [[1262, 396], [1352, 396]], "4 × SIDEBAND", [1307, 385]),
  e("asu-sideband", "asu", "sideband-ant", "rf", [[1478, 378], [1522, 378], [1522, 447], [1568, 447]], "COMMUTATED", [1522, 400]),

  e("dcdc2-syn", "tx2-dcdc", "tx2-syn", "power", [[738, 549], [835, 549], [835, 602]], "+28V", [786, 540]),
  e("dcdc2-msg", "tx2-dcdc", "tx2-msg", "power", [[689, 574], [689, 602]]),
  e("msg2-syn", "tx2-msg", "tx2-syn", "control", [[738, 621], [786, 621]], "SWITCH / SYNC", [762, 592], "bidirectional"),
  e("syn2-lsb", "tx2-syn", "tx2-sma-lsb", "rf", [[835, 652], [835, 672], [697, 672], [697, 696]], "fL", [762, 664]),
  e("syn2-cma", "tx2-syn", "tx2-cma", "rf", [[835, 652], [835, 696]], "fC", [846, 674]),
  e("syn2-usb", "tx2-syn", "tx2-sma-usb", "rf", [[835, 652], [835, 672], [981, 672], [981, 696]], "fU", [908, 664]),
  e("msg2-lsb", "tx2-msg", "tx2-sma-lsb", "modulation", [[681, 652], [681, 696]], "SIN/COS", [662, 674]),
  e("msg2-cma", "tx2-msg", "tx2-cma", "modulation", [[738, 633], [762, 633], [762, 731], [786, 731]], "COMP", [762, 720]),
  e("msg2-usb", "tx2-msg", "tx2-sma-usb", "modulation", [[738, 639], [908, 639], [908, 731], [932, 731]], "SIN/COS", [908, 720]),
  e("lsb2-pdc", "tx2-sma-lsb", "pdc", "rf", [[738, 731], [768, 731], [768, 780], [1088, 780], [1088, 400], [1134, 400]], "LSB COS/SIN", [960, 796]),
  e("cma2-pdc", "tx2-cma", "pdc", "rf", [[884, 731], [916, 731], [916, 786], [1098, 786], [1098, 412], [1134, 412]], "CARRIER", [1080, 720]),
  e("usb2-pdc", "tx2-sma-usb", "pdc", "rf", [[1030, 731], [1108, 731], [1108, 424], [1134, 424]], "USB COS/SIN", [1080, 744]),

  e("field-divider", "field-ant", "divider", "monitor", [[1568, 631], [1290, 631], [1290, 612], [1262, 612]], "FFM 1-3", [1415, 620]),
  e("pdc-divider", "pdc", "divider", "monitor", [[1198, 420], [1198, 574]], "STANDBY TX", [1198, 500]),
  e("tsg-divider", "tsg", "divider", "monitor", [[1030, 621], [1134, 621]], "INTEGRITY TEST", [1082, 610]),
  e("divider-mon1", "divider", "mon1", "monitor", [[1134, 588], [1052, 588], [1052, 342], [884, 342]], "CH A / B", [1052, 560], "reverse"),
  e("divider-mon2", "divider", "mon2", "monitor", [[1134, 634], [1052, 634], [1052, 820], [884, 820]], "CH A / B", [1052, 650], "reverse"),
  e("mon1-scu", "mon1", "scu", "control", [[786, 342], [586, 342], [586, 290], [566, 290]], "ALARM / CAN", [689, 332], "bidirectional"),
  e("mon2-scu", "mon2", "scu", "control", [[786, 820], [582, 820], [582, 306], [566, 306]], "ALARM / CAN", [689, 808], "bidirectional"),

  e("ac-acdc", "acdc", "pmu", "power", [[240, 649], [192, 649]], "PMBus / 28V", [216, 608], "bidirectional"),
  e("battery-pmu", "battery", "pmu", "power", [[130, 724], [130, 680]], "CHARGE / DISCHARGE", [148, 702], "bidirectional"),
  e("power-bus", "pmu", "dcdc-aux", "power", [[130, 618], [130, 504], [302, 504], [302, 460]], "+28VDC BUS", [216, 494]),
  e("power-tx1", "pmu", "tx1-dcdc", "power", [[192, 634], [546, 634], [546, 71], [640, 71]], undefined),
  e("power-tx2", "pmu", "tx2-dcdc", "power", [[192, 654], [566, 654], [566, 549], [640, 549]], undefined),
];

const txRfNodes: readonly DiagramNode[] = [
  n("tx1-dcdc", "txrf-tx1-dcdc", 50, 72, 104, 54, "DC/DC", "1A2A4"),
  n("tx1-msg", "txrf-tx1-msg", 50, 184, 104, 58, "MSG", "1A2A5"),
  n("tx1-syn", "txrf-tx1-syn", 224, 184, 104, 58, "SYN", "1A2A6"),
  n("tx1-lsb", "txrf-tx1-sma-lsb", 408, 48, 150, 84, ["LSB SMA", "MOD → PA"], "1A2A1", "amplifier"),
  n("tx1-cma", "txrf-tx1-cma", 408, 168, 150, 84, ["CMA", "MOD → PA"], "1A2A2", "amplifier"),
  n("tx1-usb", "txrf-tx1-sma-usb", 408, 288, 150, 84, ["USB SMA", "MOD → PA"], "1A2A3", "amplifier"),
  n("tx1-fan", "txrf-tx1-fan", 224, 72, 104, 54, "FAN", "1A2A8"),
  n("scu", "txrf-scu", 672, 376, 122, 66, ["SCU ×2", "SWITCHING"], "1A1A3/4"),
  n("pdc", "txrf-pdc", 878, 298, 156, 116, ["PDC", "ACTIVE / STANDBY", "DETECT / VSWR"], "1A8A1"),
  n("asu", "txrf-asu", 1126, 298, 142, 116, ["ASU", "TM + 4 SM"], "2A1"),
  n("carrier", "txrf-carrier-antenna", 1368, 224, 118, 72, ["CARRIER", "ANTENNA"], undefined, "antenna"),
  n("sideband", "txrf-sideband-antennas", 1368, 390, 118, 80, ["48 SIDEBAND", "ANTENNAS"], undefined, "antenna"),
  n("tx2-dcdc", "txrf-tx2-dcdc", 50, 712, 104, 54, "DC/DC", "1A3A4"),
  n("tx2-msg", "txrf-tx2-msg", 50, 600, 104, 58, "MSG", "1A3A5"),
  n("tx2-syn", "txrf-tx2-syn", 224, 600, 104, 58, "SYN", "1A3A6"),
  n("tx2-lsb", "txrf-tx2-sma-lsb", 408, 732, 150, 84, ["LSB SMA", "MOD → PA"], "1A3A1", "amplifier"),
  n("tx2-cma", "txrf-tx2-cma", 408, 612, 150, 84, ["CMA", "MOD → PA"], "1A3A2", "amplifier"),
  n("tx2-usb", "txrf-tx2-sma-usb", 408, 492, 150, 84, ["USB SMA", "MOD → PA"], "1A3A3", "amplifier"),
  n("tx2-fan", "txrf-tx2-fan", 224, 712, 104, 54, "FAN", "1A3A8"),
];

const txRfEdges: readonly DiagramEdge[] = [
  e("pwr1-msg", "tx1-dcdc", "tx1-msg", "power", [[102, 126], [102, 184]], "+28 VDC", [102, 155]),
  e("pwr1-syn", "tx1-dcdc", "tx1-syn", "power", [[154, 99], [276, 99], [276, 184]]),
  e("pwr1-pa", "tx1-dcdc", "tx1-cma", "power", [[154, 112], [380, 112], [380, 210], [408, 210]]),
  e("msg1-syn", "tx1-msg", "tx1-syn", "control", [[154, 213], [224, 213]], "SWITCHING", [189, 202], "bidirectional"),
  e("syn1-lsb", "tx1-syn", "tx1-lsb", "rf", [[328, 200], [368, 200], [368, 90], [408, 90]], "fL", [368, 154]),
  e("syn1-cma", "tx1-syn", "tx1-cma", "rf", [[328, 213], [408, 213]], "fC", [368, 202]),
  e("syn1-usb", "tx1-syn", "tx1-usb", "rf", [[328, 226], [368, 226], [368, 330], [408, 330]], "fU", [368, 272]),
  e("msg1-lsb", "tx1-msg", "tx1-lsb", "modulation", [[154, 196], [352, 196], [352, 106], [408, 106]], "COS / SIN", [354, 184]),
  e("msg1-cma", "tx1-msg", "tx1-cma", "modulation", [[154, 223], [408, 223]], "COMP", [354, 234]),
  e("msg1-usb", "tx1-msg", "tx1-usb", "modulation", [[154, 230], [352, 230], [352, 314], [408, 314]], "COS / SIN", [354, 260]),
  e("fan1-msg", "tx1-msg", "tx1-fan", "control", [[154, 194], [266, 194], [266, 126]], "FAN CTRL", [266, 155], "bidirectional"),
  e("lsb1-pdc", "tx1-lsb", "pdc", "rf", [[558, 90], [830, 90], [830, 322], [878, 322]], "LSB COS / SIN", [700, 80]),
  e("cma1-pdc", "tx1-cma", "pdc", "rf", [[558, 210], [846, 210], [846, 340], [878, 340]], "CARRIER", [700, 200]),
  e("usb1-pdc", "tx1-usb", "pdc", "rf", [[558, 330], [862, 330], [862, 358], [878, 358]], "USB COS / SIN", [700, 320]),

  e("pwr2-msg", "tx2-dcdc", "tx2-msg", "power", [[102, 712], [102, 658]], "+28 VDC", [102, 686], "reverse"),
  e("pwr2-syn", "tx2-dcdc", "tx2-syn", "power", [[154, 739], [276, 739], [276, 658]], undefined, undefined, "reverse"),
  e("pwr2-pa", "tx2-dcdc", "tx2-cma", "power", [[154, 726], [380, 726], [380, 654], [408, 654]], undefined, undefined, "reverse"),
  e("msg2-syn", "tx2-msg", "tx2-syn", "control", [[154, 629], [224, 629]], "SWITCHING", [189, 618], "bidirectional"),
  e("syn2-lsb", "tx2-syn", "tx2-lsb", "rf", [[328, 616], [368, 616], [368, 774], [408, 774]], "fL", [368, 700]),
  e("syn2-cma", "tx2-syn", "tx2-cma", "rf", [[328, 629], [408, 629]], "fC", [368, 618]),
  e("syn2-usb", "tx2-syn", "tx2-usb", "rf", [[328, 642], [368, 642], [368, 534], [408, 534]], "fU", [368, 582]),
  e("msg2-lsb", "tx2-msg", "tx2-lsb", "modulation", [[154, 646], [352, 646], [352, 758], [408, 758]], "COS / SIN", [354, 658]),
  e("msg2-cma", "tx2-msg", "tx2-cma", "modulation", [[154, 639], [408, 639]], "COMP", [354, 650]),
  e("msg2-usb", "tx2-msg", "tx2-usb", "modulation", [[154, 612], [352, 612], [352, 550], [408, 550]], "COS / SIN", [354, 594]),
  e("fan2-msg", "tx2-msg", "tx2-fan", "control", [[154, 648], [266, 648], [266, 712]], "FAN CTRL", [266, 686], "bidirectional"),
  e("lsb2-pdc", "tx2-lsb", "pdc", "rf", [[558, 774], [830, 774], [830, 390], [878, 390]], "LSB COS / SIN", [700, 787]),
  e("cma2-pdc", "tx2-cma", "pdc", "rf", [[558, 654], [846, 654], [846, 372], [878, 372]], "CARRIER", [700, 667]),
  e("usb2-pdc", "tx2-usb", "pdc", "rf", [[558, 534], [862, 534], [862, 354], [878, 354]], "USB COS / SIN", [700, 547]),

  e("scu-msg1", "scu", "tx1-msg", "control", [[672, 393], [600, 393], [600, 242], [102, 242]], "VOICE / SWITCH", [604, 382], "reverse"),
  e("scu-msg2", "scu", "tx2-msg", "control", [[672, 425], [600, 425], [600, 600], [102, 600]], undefined, undefined, "reverse"),
  e("scu-pdc", "scu", "pdc", "control", [[794, 409], [878, 409]], "CHANGEOVER", [836, 398], "bidirectional"),
  e("pdc-carrier", "pdc", "carrier", "rf", [[1034, 326], [1310, 326], [1310, 260], [1368, 260]], "ACTIVE CARRIER", [1197, 286]),
  e("pdc-asu", "pdc", "asu", "rf", [[1034, 382], [1126, 382]], "4 × SB", [1080, 371]),
  e("asu-sideband", "asu", "sideband", "rf", [[1268, 356], [1318, 356], [1318, 430], [1368, 430]], "COMMUTATION", [1318, 380]),
];

const monitorNodes: readonly DiagramNode[] = [
  n("field", "monitor-field-antennas", 40, 80, 146, 72, ["FIELD MONITOR", "ANTENNAS 1-3"], undefined, "antenna"),
  n("pdc", "monitor-pdc", 40, 244, 146, 72, ["PDC", "STANDBY DVOR"], "1A8A1"),
  n("tsg", "monitor-tsg", 40, 408, 146, 72, ["TSG", "INTEGRITY TEST"], "1A1A2"),
  n("divider", "monitor-divider", 286, 154, 166, 302, ["QUINT 3-WAY", "RF DIVIDER", "FFM1 · FFM2 · FFM3", "STANDBY · TSG"], "1PD1"),
  n("mon1", "monitor-mon1", 614, 120, 174, 130, ["MONITOR 1", "CH A", "CH B1 / B2", "STBY / TSG"], "1A2A7"),
  n("mon2", "monitor-mon2", 614, 350, 174, 130, ["MONITOR 2", "CH A", "CH B1 / B2", "STBY / TSG"], "1A3A7"),
  n("scu", "monitor-scu", 920, 236, 170, 130, ["SCU ×2", "AND / OR VOTING", "CHANGEOVER / SHUTDOWN"], "1A1A3/4"),
];

const monitorEdges: readonly DiagramEdge[] = [
  e("ffm-divider", "field", "divider", "monitor", [[186, 116], [236, 116], [236, 196], [286, 196]], "FFM1 / 2 / 3", [236, 105]),
  e("pdc-divider", "pdc", "divider", "monitor", [[186, 280], [286, 280]], "STANDBY TX", [236, 269]),
  e("tsg-divider", "tsg", "divider", "monitor", [[186, 444], [236, 444], [236, 414], [286, 414]], "TEST SIGNAL", [236, 459]),
  e("divider-mon1", "divider", "mon1", "monitor", [[452, 205], [534, 205], [534, 185], [614, 185]], "CH A / B1 / B2 / STBY / TSG", [533, 174]),
  e("divider-mon2", "divider", "mon2", "monitor", [[452, 405], [534, 405], [534, 415], [614, 415]], "CH A / B1 / B2 / STBY / TSG", [533, 430]),
  e("mon1-scu", "mon1", "scu", "control", [[788, 160], [856, 160], [856, 270], [920, 270]], "ALARM", [854, 150]),
  e("mon2-scu", "mon2", "scu", "control", [[788, 390], [872, 390], [872, 332], [920, 332]], "ALARM", [854, 380]),
  e("can1-scu", "mon1", "scu", "data", [[788, 210], [834, 210], [834, 286], [920, 286]], "CAN", [834, 232], "bidirectional"),
  e("can2-scu", "mon2", "scu", "data", [[788, 440], [852, 440], [852, 316], [920, 316]], "CAN", [854, 424], "bidirectional"),
];

const asuNodes: readonly DiagramNode[] = [
  n("pdc", "asu-pdc", 32, 188, 144, 110, ["PDC", "LSB COS / SIN", "USB COS / SIN"], "1A8A1"),
  n("scu", "asu-scu", 32, 410, 144, 78, ["SCU ×2", "SYNC / CLOCK"], "1A1A3/4"),
  n("interface", "asu-interface", 322, 390, 160, 120, ["ASU-IF", "DC/DC + CPLD", "30 Hz / 1440 Hz"], "2A1A1"),
  n("toggle", "asu-toggle", 322, 188, 160, 110, ["TOGGLE MODULE", "EVEN / ODD", "USB / LSB"], "2A1A2"),
  n("cos-lo", "asu-sm-cos-lo", 596, 44, 174, 104, ["SM COS LO", "A1-A23 ODD"], "2A1A3"),
  n("cos-hi", "asu-sm-cos-hi", 596, 188, 174, 104, ["SM COS HI", "A25-A47 ODD"], "2A1A4"),
  n("sin-lo", "asu-sm-sin-lo", 596, 332, 174, 104, ["SM SIN LO", "A2-A24 EVEN"], "2A1A5"),
  n("sin-hi", "asu-sm-sin-hi", 596, 476, 174, 104, ["SM SIN HI", "A26-A48 EVEN"], "2A1A6"),
  n("antennas", "asu-sideband-antennas", 902, 160, 166, 310, ["48 SIDEBAND", "ANTENNAS", "4 GROUPS × 12"], undefined, "antenna"),
  n("power-monitor", "asu-power-monitor", 322, 580, 448, 80, ["OPTIONAL POWER MONITOR", "CARRIER + FOUR SIDEBAND FORWARD / REVERSE"], "2A1A7"),
];

const asuEdges: readonly DiagramEdge[] = [
  e("pdc-toggle", "pdc", "toggle", "rf", [[176, 243], [322, 243]], "4 × SIDEBAND", [249, 232]),
  e("scu-if", "scu", "interface", "control", [[176, 449], [322, 449]], "SYNC / SW CLOCK / BITE", [249, 438], "bidirectional"),
  e("if-toggle", "interface", "toggle", "control", [[402, 390], [402, 298]], "EVEN / ODD TOGGLE", [402, 344]),
  e("toggle-coslo", "toggle", "cos-lo", "rf", [[482, 216], [538, 216], [538, 96], [596, 96]], "COS", [546, 123]),
  e("toggle-coshi", "toggle", "cos-hi", "rf", [[482, 232], [596, 232]], "COS", [538, 221]),
  e("toggle-sinlo", "toggle", "sin-lo", "rf", [[482, 254], [538, 254], [538, 384], [596, 384]], "SIN", [546, 356]),
  e("toggle-sinhi", "toggle", "sin-hi", "rf", [[482, 270], [520, 270], [520, 528], [596, 528]], "SIN", [538, 477]),
  e("if-coslo", "interface", "cos-lo", "control", [[482, 416], [506, 416], [506, 126], [596, 126]], "12-BIT SELECT", [538, 164]),
  e("if-coshi", "interface", "cos-hi", "control", [[482, 438], [526, 438], [526, 270], [596, 270]]),
  e("if-sinlo", "interface", "sin-lo", "control", [[482, 462], [596, 462], [596, 414]], undefined, undefined, "reverse"),
  e("if-sinhi", "interface", "sin-hi", "control", [[482, 486], [552, 486], [552, 558], [596, 558]]),
  e("coslo-ant", "cos-lo", "antennas", "rf", [[770, 96], [848, 96], [848, 208], [902, 208]], "A1…A23", [836, 86]),
  e("coshi-ant", "cos-hi", "antennas", "rf", [[770, 240], [902, 240]], "A25…A47", [836, 229]),
  e("sinlo-ant", "sin-lo", "antennas", "rf", [[770, 384], [848, 384], [848, 352], [902, 352]], "A2…A24", [836, 398]),
  e("sinhi-ant", "sin-hi", "antennas", "rf", [[770, 528], [864, 528], [864, 416], [902, 416]], "A26…A48", [836, 541]),
  e("pdc-pm", "pdc", "power-monitor", "monitor", [[104, 298], [104, 620], [322, 620]], "RF SAMPLE", [158, 506]),
];

const powerControlNodes: readonly DiagramNode[] = [
  n("battery1", "power-battery1", 40, 70, 120, 58, "BATTERY 1", undefined, "external"),
  n("battery2", "power-battery2", 40, 158, 120, 58, "BATTERY 2", undefined, "external"),
  n("switch", "power-switch-panel", 236, 52, 154, 76, ["POWER PANEL", "AC MAIN / BATT 1 / 2"], "1A4"),
  n("acdc1", "power-acdc1", 236, 174, 98, 58, "AC/DC 1", "1A5A1"),
  n("acdc3", "power-acdc3", 368, 174, 98, 58, "AC/DC 3", "1A5A3"),
  n("acdc5", "power-acdc5", 500, 174, 98, 58, "AC/DC 5", "1A5A5"),
  n("pmu1", "power-pmu1", 236, 286, 130, 70, "PMU 1", "1A4A1"),
  n("pmu2", "power-pmu2", 468, 286, 130, 70, "PMU 2", "1A4A2"),
  n("dcdc-aux", "power-dcdc-aux", 698, 70, 148, 64, "DC/DC-A ×2", "1A1A8/9"),
  n("dcdc-tx1", "power-dcdc-tx1", 698, 174, 148, 64, "TX1 DC/DC", "1A2A4"),
  n("dcdc-tx2", "power-dcdc-tx2", 698, 278, 148, 64, "TX2 DC/DC", "1A3A4"),
  n("scu-power", "power-scu", 698, 382, 148, 64, "SCU ×2", "1A1A3/4"),

  n("remote", "control-remote", 40, 530, 124, 58, "RCU / RSU", undefined, "external"),
  n("pmdt", "control-pmdt", 40, 626, 124, 58, "PMDT", undefined, "external"),
  n("ifb", "control-ifb", 276, 530, 124, 58, "IFB", "1A7"),
  n("niu", "control-niu", 276, 626, 124, 58, "NIU ×2", "1A1A6/7"),
  n("modem", "control-modem", 276, 722, 124, 58, "MODEM ×2", "1A1A10/11"),
  n("lmi", "control-lmi", 474, 530, 124, 58, "LMI", "1A6"),
  n("csp", "control-csp", 474, 626, 124, 58, "CSP", "1A1A1"),
  n("emu", "control-emu", 474, 722, 124, 58, "EMU", "1A1A5"),
  n("scu", "control-scu", 692, 594, 156, 100, ["SCU ×2", "CAN / VOTING", "CHANGEOVER"], "1A1A3/4"),
  n("msg", "control-msg", 954, 500, 130, 58, "MSG TX1/2", "1A2A5/1A3A5"),
  n("mon", "control-mon", 954, 586, 130, 58, "MON 1/2", "1A2A7/1A3A7"),
  n("pdc", "control-pdc", 954, 672, 130, 58, "PDC", "1A8A1"),
  n("pmu", "control-pmu", 954, 758, 130, 58, "PMU 1/2", "1A4A1/2"),
  n("tsg", "control-tsg", 1152, 500, 124, 58, "TSG", "1A1A2"),
  n("vau", "control-vau", 1152, 758, 124, 58, "VAU", "1A1A12"),
];

const powerControlEdges: readonly DiagramEdge[] = [
  e("bat1-switch", "battery1", "switch", "power", [[160, 99], [198, 99], [198, 78], [236, 78]], "BATT 1", [198, 89]),
  e("bat2-switch", "battery2", "switch", "power", [[160, 187], [198, 187], [198, 102], [236, 102]], "BATT 2", [198, 177]),
  e("switch-acdc1", "switch", "acdc1", "power", [[285, 128], [285, 174]], "AC MAINS", [310, 151]),
  e("switch-acdc3", "switch", "acdc3", "power", [[315, 128], [315, 150], [417, 150], [417, 174]]),
  e("switch-acdc5", "switch", "acdc5", "power", [[345, 128], [345, 142], [549, 142], [549, 174]]),
  e("acdc1-pmu1", "acdc1", "pmu1", "power", [[285, 232], [285, 286]], "+28V / PMBus", [296, 259], "bidirectional"),
  e("acdc3-pmu1", "acdc3", "pmu1", "power", [[417, 232], [417, 260], [318, 260], [318, 286]], undefined, undefined, "bidirectional"),
  e("acdc5-pmu2", "acdc5", "pmu2", "power", [[549, 232], [549, 286]], undefined, undefined, "bidirectional"),
  e("pmu-link", "pmu1", "pmu2", "data", [[366, 321], [468, 321]], "REDUNDANT", [417, 310], "bidirectional"),
  e("pmu-bus-aux", "pmu2", "dcdc-aux", "power", [[598, 310], [648, 310], [648, 102], [698, 102]], "+28 VDC BUS", [648, 205]),
  e("pmu-bus-tx1", "pmu2", "dcdc-tx1", "power", [[598, 321], [658, 321], [658, 206], [698, 206]]),
  e("pmu-bus-tx2", "pmu2", "dcdc-tx2", "power", [[598, 332], [668, 332], [668, 310], [698, 310]]),
  e("pmu-can-scu", "pmu2", "scu-power", "data", [[533, 356], [533, 414], [698, 414]], "CAN", [616, 404], "bidirectional"),

  e("remote-ifb", "remote", "ifb", "data", [[164, 559], [276, 559]], "MODEM / IP", [220, 548], "bidirectional"),
  e("pmdt-ifb", "pmdt", "ifb", "data", [[164, 655], [220, 655], [220, 574], [276, 574]], "USB / RS-232", [220, 622], "bidirectional"),
  e("pmdt-niu", "pmdt", "niu", "data", [[164, 655], [276, 655]], "LAN", [220, 646], "bidirectional"),
  e("modem-ifb", "modem", "ifb", "data", [[338, 722], [338, 588]], undefined, undefined, "bidirectional"),
  e("ifb-scu", "ifb", "scu", "data", [[400, 559], [450, 559], [450, 599], [646, 599], [646, 631], [692, 631]], undefined, undefined, "bidirectional"),
  e("niu-scu", "niu", "scu", "data", [[400, 655], [424, 655], [424, 619], [632, 619], [632, 643], [692, 643]], "ETHERNET", [534, 611], "bidirectional"),
  e("lmi-scu", "lmi", "scu", "data", [[598, 559], [660, 559], [660, 620], [692, 620]], "LAN / USB", [646, 548], "bidirectional"),
  e("csp-scu", "csp", "scu", "control", [[598, 655], [692, 655]], undefined, undefined, "bidirectional"),
  e("emu-scu", "emu", "scu", "data", [[598, 751], [660, 751], [660, 670], [692, 670]], "CAN", [646, 740], "bidirectional"),
  e("scu-msg", "scu", "msg", "control", [[848, 610], [898, 610], [898, 529], [954, 529]], "VOICE / SWITCH", [900, 575], "bidirectional"),
  e("scu-mon", "scu", "mon", "control", [[848, 630], [954, 615]], "ALARM", [900, 611], "bidirectional"),
  e("scu-pdc", "scu", "pdc", "control", [[848, 650], [898, 650], [898, 701], [954, 701]], "CHANGEOVER", [900, 675], "bidirectional"),
  e("scu-pmu", "scu", "pmu", "data", [[848, 670], [882, 670], [882, 787], [954, 787]], "CAN", [900, 741], "bidirectional"),
  e("tsg-scu", "tsg", "scu", "data", [[1152, 529], [1116, 529], [1116, 600], [848, 600]], "CAN / TEST", [1118, 519], "bidirectional"),
  e("vau-msg", "vau", "msg", "modulation", [[1152, 787], [1108, 787], [1108, 529], [1084, 529]], "VOICE", [1108, 661]),
];

const diagrams: readonly DiagramDefinition[] = [
  {
    id: "overview",
    label: "Tổng thể",
    reference: "Figure 1-8 · Simplified Block Diagram of 220 DVOR",
    width: 1710,
    height: 880,
    nodes: overviewNodes,
    edges: overviewEdges,
    groups: [
      { id: "aux", label: "AUXILIARY ELECTRONICS · 1A1", x: 18, y: 20, width: 374, height: 462 },
      { id: "tx1", label: "TRANSMITTER NO. 1 · 1A2", x: 618, y: 20, width: 434, height: 372 },
      { id: "tx2", label: "TRANSMITTER NO. 2 · 1A3", x: 618, y: 498, width: 434, height: 364 },
      { id: "rf", label: "RF CHANGEOVER / ANTENNA", x: 1106, y: 230, width: 590, height: 274 },
      { id: "monitor", label: "MONITORING", x: 1106, y: 540, width: 590, height: 158 },
      { id: "power", label: "POWER SUPPLY", x: 18, y: 574, width: 374, height: 232 },
    ],
  },
  {
    id: "tx-rf",
    label: "Máy phát & RF",
    reference: "Figures 1-14 / 1-15 · Transmitter subsystem and PDC changeover",
    width: 1510,
    height: 860,
    nodes: txRfNodes,
    edges: txRfEdges,
    groups: [
      { id: "tx1", label: "TRANSMITTER NO. 1 · 1A2", x: 24, y: 24, width: 562, height: 368 },
      { id: "tx2", label: "TRANSMITTER NO. 2 · 1A3", x: 24, y: 472, width: 562, height: 368 },
      { id: "distribution", label: "RF CHANGEOVER / DISTRIBUTION", x: 852, y: 184, width: 642, height: 394 },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    reference: "Figure 1-17 · Monitor subsystem",
    width: 1130,
    height: 540,
    nodes: monitorNodes,
    edges: monitorEdges,
    groups: [
      { id: "sources", label: "MONITOR RF SOURCES", x: 20, y: 42, width: 186, height: 458 },
      { id: "monitors", label: "DUAL MONITOR", x: 586, y: 82, width: 232, height: 430 },
      { id: "executive", label: "EXECUTIVE ACTION", x: 894, y: 198, width: 220, height: 206 },
    ],
  },
  {
    id: "asu",
    label: "ASU",
    reference: "Figure 3-70 · ASU block diagram",
    width: 1100,
    height: 700,
    nodes: asuNodes,
    edges: asuEdges,
    groups: [
      { id: "asu", label: "ANTENNA SWITCHING UNIT · 2A1", x: 288, y: 22, width: 514, height: 660 },
      { id: "antenna", label: "SIDEBAND ARRAY", x: 870, y: 126, width: 214, height: 380 },
    ],
  },
  {
    id: "power-control",
    label: "Nguồn & điều khiển",
    reference: "Figures 1-18 / 1-19 / 1-20 · Power, control and monitoring",
    width: 1300,
    height: 850,
    nodes: powerControlNodes,
    edges: powerControlEdges,
    groups: [
      { id: "power", label: "POWER SUPPLY", x: 20, y: 26, width: 850, height: 440 },
      { id: "external", label: "LOCAL / REMOTE ACCESS", x: 20, y: 500, width: 604, height: 324 },
      { id: "control", label: "CONTROL AND MONITORING", x: 664, y: 470, width: 622, height: 354 },
    ],
  },
];

function getOccurrence(componentId: string) {
  const blockId = DVOR_220_COMPONENT_TO_BLOCK.get(componentId);
  if (!blockId) return null;
  const block = DVOR_220_BLOCK_BY_ID.get(blockId);
  const occurrence = block?.diagramOccurrences.find((item) => item.componentId === componentId);
  return block && occurrence ? { blockId, occurrence } : null;
}

function DiagramNodeView({
  node,
  selected,
  onSelect,
}: {
  node: DiagramNode;
  selected: boolean;
  onSelect: (blockId: Dvor220BlockId, occurrence: Dvor220DiagramOccurrence) => void;
}) {
  const resolved = getOccurrence(node.componentId);
  if (!resolved) return null;
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  const lineHeight = node.variant === "amplifier" ? 18 : 17;
  const textStart = centerY - ((node.label.length - 1) * lineHeight) / 2;

  return (
    <g
      className={styles.diagramBlock}
      data-selected={selected || undefined}
      data-variant={node.variant}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${node.label.join(" ")}${node.reference ? `, ${node.reference}` : ""}`}
      onClick={() => onSelect(resolved.blockId, resolved.occurrence)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(resolved.blockId, resolved.occurrence);
        }
      }}
    >
      <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="4" />
      {node.variant === "amplifier" ? (
        <>
          <rect className={styles.amplifierInner} x={node.x + 12} y={node.y + node.height - 28} width={(node.width - 34) / 2} height="18" rx="2" />
          <rect className={styles.amplifierInner} x={node.x + 22 + (node.width - 34) / 2} y={node.y + node.height - 28} width={(node.width - 34) / 2} height="18" rx="2" />
        </>
      ) : null}
      <text x={centerX} y={textStart}>
        {node.label.map((line, index) => (
          <tspan key={line} x={centerX} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>
        ))}
      </text>
      {node.reference ? <text className={styles.diagramNodeRef} x={centerX} y={node.y + node.height - 7}>{node.reference}</text> : null}
    </g>
  );
}

export function Dvor220SystemDiagram({ selectedOccurrenceId, onSelect }: Dvor220SystemDiagramProps) {
  const markerPrefix = useId().replaceAll(":", "");
  const [activeDiagramId, setActiveDiagramId] = useState<DiagramId>("overview");
  const diagram = diagrams.find((item) => item.id === activeDiagramId) ?? diagrams[0]!;
  const selectedComponentId = useMemo(() => {
    if (!selectedOccurrenceId) return null;
    for (const block of DVOR_220_BLOCK_BY_ID.values()) {
      const occurrence = block.diagramOccurrences.find((item) => item.id === selectedOccurrenceId);
      if (occurrence) return occurrence.componentId;
    }
    return null;
  }, [selectedOccurrenceId]);
  const selectedNodeId = selectedComponentId ? diagram.nodes.find((node) => node.componentId === selectedComponentId)?.id ?? null : null;

  return (
    <div>
      <div className={styles.diagramTabs} role="tablist" aria-label="Chọn sơ đồ khối DVOR 220">
        {diagrams.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={diagram.id === item.id}
            onClick={() => setActiveDiagramId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.diagramViewport}>
        <svg
          className={styles.systemDiagram}
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="img"
          aria-label={`${diagram.label}, ${diagram.reference}`}
        >
          <defs>
            {(["rf", "modulation", "control", "monitor", "power", "data"] as LinkKind[]).map((kind) => (
              <marker key={kind} id={`${markerPrefix}-${kind}`} viewBox="0 0 8 8" refX="7.6" refY="4" markerWidth="6.5" markerHeight="5.5" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                <path className={styles[`marker${kind[0]!.toUpperCase()}${kind.slice(1)}`]} d="M0 0.8L8 4L0 7.2Z" />
              </marker>
            ))}
          </defs>
          <rect className={styles.diagramPaper} width={diagram.width} height={diagram.height} />
          <g className={styles.diagramZones} aria-hidden>
            {diagram.groups.map((group) => (
              <g key={group.id}>
                <rect x={group.x} y={group.y} width={group.width} height={group.height} rx="5" />
                <text x={group.x + 12} y={group.y + 19}>{group.label}</text>
              </g>
            ))}
          </g>
          <g className={styles.diagramLinks} aria-hidden>
            {diagram.edges.map((edge) => {
              const adjacent = !selectedNodeId || edge.from === selectedNodeId || edge.to === selectedNodeId;
              const direction = edge.direction ?? "forward";
              return (
                <polyline
                  key={edge.id}
                  data-kind={edge.kind}
                  data-active={selectedNodeId && adjacent ? true : undefined}
                  data-muted={selectedNodeId && !adjacent ? true : undefined}
                  points={edge.points.map(([x, y]) => `${x},${y}`).join(" ")}
                  markerStart={direction === "reverse" || direction === "bidirectional" ? `url(#${markerPrefix}-${edge.kind})` : undefined}
                  markerEnd={direction === "forward" || direction === "bidirectional" ? `url(#${markerPrefix}-${edge.kind})` : undefined}
                />
              );
            })}
          </g>
          <g className={styles.diagramPathLabels} aria-hidden>
            {diagram.edges.map((edge) => {
              if (!edge.label) return null;
              const point = edge.labelAt ?? edge.points[Math.floor(edge.points.length / 2)]!;
              const adjacent = !selectedNodeId || edge.from === selectedNodeId || edge.to === selectedNodeId;
              return <text key={`${edge.id}-label`} data-muted={selectedNodeId && !adjacent ? true : undefined} x={point[0]} y={point[1]}>{edge.label}</text>;
            })}
          </g>
          <g>
            {diagram.nodes.map((node) => (
              <DiagramNodeView
                key={node.id}
                node={node}
                selected={selectedOccurrenceId === getOccurrence(node.componentId)?.occurrence.id}
                onSelect={onSelect}
              />
            ))}
          </g>
          <g className={styles.diagramLegend} aria-hidden transform={`translate(28 ${diagram.height - 22})`}>
            {(["rf", "modulation", "control", "monitor", "power", "data"] as LinkKind[]).map((kind, index) => (
              <g key={kind} transform={`translate(${index * 152} 0)`}>
                <path data-kind={kind} d="M0 0h28" />
                <text x="36" y="4">{({ rf: "RF", modulation: "MODULATION", control: "CONTROL", monitor: "MONITOR SAMPLE", power: "POWER", data: "DATA / CAN" } as const)[kind]}</text>
              </g>
            ))}
          </g>
          <text className={styles.diagramReference} x={diagram.width - 18} y={diagram.height - 18}>{diagram.reference}</text>
        </svg>
      </div>
    </div>
  );
}
