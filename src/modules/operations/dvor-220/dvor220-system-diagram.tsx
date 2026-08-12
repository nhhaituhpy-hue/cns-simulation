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
  n("remote", "overview-remote", 28, 42, 126, 54, ["RCU / RSU", "REMOTE"], undefined, "external"),
  n("pmdt", "overview-pmdt", 178, 42, 126, 54, ["PMDT", "MAINTENANCE PC"], undefined, "external"),
  n("ifb", "overview-ifb", 72, 150, 126, 58, "IFB", "1A7"),
  n("lmi", "overview-lmi", 220, 150, 126, 58, "LMI", "1A6"),
  n("emu", "overview-emu", 72, 238, 126, 54, "EMU", "1A1A5"),
  n("niu", "overview-niu", 220, 238, 126, 54, "NIU ×2", "1A1A6/7"),
  n("modem", "overview-modem", 72, 320, 126, 54, "MODEM ×2", "1A1A10/11"),
  n("vau", "overview-vau", 220, 320, 126, 54, "VAU", "1A1A12"),
  n("csp", "overview-csp", 72, 402, 126, 54, "CSP", "1A1A1"),
  n("dcdc-aux", "overview-dcdc-aux", 220, 402, 126, 54, "DC/DC-A ×2", "1A1A8/9"),
  n("scu", "overview-scu", 390, 240, 142, 76, ["SCU ×2", "CONTROL / VOTING"], "1A1A3/4"),

  n("tx1-dcdc", "overview-tx1-dcdc", 584, 50, 98, 50, "DC/DC", "1A2A4"),
  n("tx1-msg", "overview-tx1-msg", 584, 128, 98, 50, "MSG", "1A2A5"),
  n("tx1-syn", "overview-tx1-syn", 704, 128, 98, 50, "SYN", "1A2A6"),
  n("tx1-sma-lsb", "overview-tx1-sma-lsb", 584, 210, 98, 70, ["LSB SMA", "MOD → PA"], "1A2A1", "amplifier"),
  n("tx1-cma", "overview-tx1-cma", 704, 210, 98, 70, ["CMA", "MOD → PA"], "1A2A2", "amplifier"),
  n("tx1-sma-usb", "overview-tx1-sma-usb", 824, 210, 98, 70, ["USB SMA", "MOD → PA"], "1A2A3", "amplifier"),
  n("tx1-fan", "overview-tx1-fan", 824, 50, 98, 50, "FAN", "1A2A8"),
  n("mon1", "overview-mon1", 704, 306, 98, 52, "MON 1", "1A2A7"),

  n("tx2-dcdc", "overview-tx2-dcdc", 584, 520, 98, 50, "DC/DC", "1A3A4"),
  n("tx2-msg", "overview-tx2-msg", 584, 598, 98, 50, "MSG", "1A3A5"),
  n("tx2-syn", "overview-tx2-syn", 704, 598, 98, 50, "SYN", "1A3A6"),
  n("tx2-sma-lsb", "overview-tx2-sma-lsb", 584, 680, 98, 70, ["LSB SMA", "MOD → PA"], "1A3A1", "amplifier"),
  n("tx2-cma", "overview-tx2-cma", 704, 680, 98, 70, ["CMA", "MOD → PA"], "1A3A2", "amplifier"),
  n("tx2-sma-usb", "overview-tx2-sma-usb", 824, 680, 98, 70, ["USB SMA", "MOD → PA"], "1A3A3", "amplifier"),
  n("tx2-fan", "overview-tx2-fan", 824, 520, 98, 50, "FAN", "1A3A8"),
  n("mon2", "overview-mon2", 704, 776, 98, 52, "MON 2", "1A3A7"),

  n("pdc", "overview-pdc", 1000, 330, 128, 84, ["PDC", "CHANGEOVER / DETECT"], "1A8A1"),
  n("asu", "overview-asu", 1198, 330, 126, 84, ["ASU", "TM + 4 SM"], "2A1"),
  n("carrier-ant", "overview-carrier-antenna", 1390, 252, 116, 66, ["CARRIER", "ANTENNA"], undefined, "antenna"),
  n("sideband-ant", "overview-sideband-antennas", 1390, 405, 116, 74, ["48 SIDEBAND", "ANTENNAS"], undefined, "antenna"),
  n("field-ant", "overview-field-antennas", 1390, 594, 116, 66, ["FIELD MON", "ANTENNAS 1-3"], undefined, "antenna"),
  n("divider", "overview-divider", 1000, 570, 128, 76, ["QUINT", "3-WAY DIVIDER"], "1PD1"),
  n("tsg", "overview-tsg", 836, 590, 104, 54, "TSG", "1A1A2"),

  n("pmu", "overview-pmu", 72, 615, 126, 62, "PMU ×2", "1A4A1/2"),
  n("acdc", "overview-acdc", 220, 615, 126, 62, "AC/DC ×3", "1A5"),
  n("battery", "overview-battery", 72, 720, 126, 58, "BAT ×2", undefined, "external"),
];

const overviewEdges: readonly DiagramEdge[] = [
  e("remote-ifb", "remote", "ifb", "data", [[91, 96], [91, 150]], "MODEM / IP", [116, 122], "bidirectional"),
  e("pmdt-ifb", "pmdt", "ifb", "data", [[241, 96], [241, 120], [135, 120], [135, 150]], "USB / RS-232", [188, 113], "bidirectional"),
  e("pmdt-niu", "pmdt", "niu", "data", [[241, 96], [241, 238]], "LAN", [253, 198], "bidirectional"),
  e("ifb-scu", "ifb", "scu", "data", [[198, 179], [300, 179], [300, 258], [390, 258]], undefined, undefined, "bidirectional"),
  e("lmi-scu", "lmi", "scu", "data", [[346, 179], [370, 179], [370, 270], [390, 270]], "LAN / USB", [357, 222], "bidirectional"),
  e("emu-scu", "emu", "scu", "data", [[198, 265], [390, 265]], "CAN", [294, 256], "bidirectional"),
  e("niu-scu", "niu", "scu", "data", [[346, 265], [390, 265]], undefined, undefined, "bidirectional"),
  e("modem-ifb", "modem", "ifb", "data", [[135, 320], [135, 208]], undefined, undefined, "bidirectional"),
  e("vau-msg1", "vau", "tx1-msg", "modulation", [[346, 347], [554, 347], [554, 153], [584, 153]], "VOICE", [530, 336]),
  e("vau-msg2", "vau", "tx2-msg", "modulation", [[346, 347], [554, 347], [554, 623], [584, 623]], undefined),
  e("csp-scu", "csp", "scu", "control", [[198, 429], [350, 429], [350, 298], [390, 298]], undefined, undefined, "bidirectional"),
  e("dcdcaux-bus", "dcdc-aux", "scu", "power", [[346, 429], [365, 429], [365, 303], [390, 303]], "+5 / ±15V", [372, 390]),

  e("scu-msg1", "scu", "tx1-msg", "control", [[532, 252], [560, 252], [560, 153], [584, 153]], "CAN / SWITCH", [565, 215], "bidirectional"),
  e("scu-msg2", "scu", "tx2-msg", "control", [[532, 292], [560, 292], [560, 623], [584, 623]], undefined, undefined, "bidirectional"),
  e("scu-pdc", "scu", "pdc", "control", [[532, 278], [930, 278], [930, 372], [1000, 372]], "CHANGEOVER", [925, 296], "bidirectional"),
  e("dcdc1-syn", "tx1-dcdc", "tx1-syn", "power", [[682, 75], [753, 75], [753, 128]], "+28V", [716, 67]),
  e("dcdc1-msg", "tx1-dcdc", "tx1-msg", "power", [[633, 100], [633, 128]]),
  e("msg1-syn", "tx1-msg", "tx1-syn", "control", [[682, 153], [704, 153]], "SWITCH / SYNC", [693, 144], "bidirectional"),
  e("syn1-lsb", "tx1-syn", "tx1-sma-lsb", "rf", [[753, 178], [753, 193], [633, 193], [633, 210]], "fL", [662, 185]),
  e("syn1-cma", "tx1-syn", "tx1-cma", "rf", [[753, 178], [753, 210]], "fC", [765, 194]),
  e("syn1-usb", "tx1-syn", "tx1-sma-usb", "rf", [[753, 178], [753, 193], [873, 193], [873, 210]], "fU", [845, 185]),
  e("msg1-lsb", "tx1-msg", "tx1-sma-lsb", "modulation", [[633, 178], [633, 210]], "SIN/COS", [615, 194]),
  e("msg1-cma", "tx1-msg", "tx1-cma", "modulation", [[682, 153], [692, 153], [692, 245], [704, 245]], "COMP", [696, 220]),
  e("msg1-usb", "tx1-msg", "tx1-sma-usb", "modulation", [[682, 165], [810, 165], [810, 245], [824, 245]], "SIN/COS", [806, 218]),
  e("lsb1-pdc", "tx1-sma-lsb", "pdc", "rf", [[682, 245], [960, 245], [960, 345], [1000, 345]], "LSB COS/SIN", [902, 236]),
  e("cma1-pdc", "tx1-cma", "pdc", "rf", [[802, 245], [970, 245], [970, 360], [1000, 360]], "CARRIER", [889, 257]),
  e("usb1-pdc", "tx1-sma-usb", "pdc", "rf", [[922, 245], [980, 245], [980, 375], [1000, 375]], "USB COS/SIN", [955, 228]),
  e("pdc-carrier", "pdc", "carrier-ant", "rf", [[1128, 350], [1350, 350], [1350, 285], [1390, 285]], "ACTIVE CARRIER", [1242, 341]),
  e("pdc-asu", "pdc", "asu", "rf", [[1128, 390], [1198, 390]], "4 × SIDEBAND", [1163, 380]),
  e("asu-sideband", "asu", "sideband-ant", "rf", [[1324, 372], [1360, 372], [1360, 442], [1390, 442]], "COMMUTATED", [1368, 393]),

  e("dcdc2-syn", "tx2-dcdc", "tx2-syn", "power", [[682, 545], [753, 545], [753, 598]], "+28V", [716, 537]),
  e("dcdc2-msg", "tx2-dcdc", "tx2-msg", "power", [[633, 570], [633, 598]]),
  e("msg2-syn", "tx2-msg", "tx2-syn", "control", [[682, 623], [704, 623]], "SWITCH / SYNC", [693, 614], "bidirectional"),
  e("syn2-lsb", "tx2-syn", "tx2-sma-lsb", "rf", [[753, 648], [753, 663], [633, 663], [633, 680]], "fL", [662, 655]),
  e("syn2-cma", "tx2-syn", "tx2-cma", "rf", [[753, 648], [753, 680]], "fC", [765, 664]),
  e("syn2-usb", "tx2-syn", "tx2-sma-usb", "rf", [[753, 648], [753, 663], [873, 663], [873, 680]], "fU", [845, 655]),
  e("msg2-lsb", "tx2-msg", "tx2-sma-lsb", "modulation", [[633, 648], [633, 680]], "SIN/COS", [615, 664]),
  e("msg2-cma", "tx2-msg", "tx2-cma", "modulation", [[682, 623], [692, 623], [692, 715], [704, 715]], "COMP", [696, 690]),
  e("msg2-usb", "tx2-msg", "tx2-sma-usb", "modulation", [[682, 635], [810, 635], [810, 715], [824, 715]], "SIN/COS", [806, 688]),
  e("lsb2-pdc", "tx2-sma-lsb", "pdc", "rf", [[682, 715], [950, 715], [950, 399], [1000, 399]], "LSB COS/SIN", [825, 706]),
  e("cma2-pdc", "tx2-cma", "pdc", "rf", [[802, 715], [960, 715], [960, 414], [1000, 414]], "CARRIER", [881, 727]),
  e("usb2-pdc", "tx2-sma-usb", "pdc", "rf", [[922, 715], [970, 715], [970, 429], [1000, 429]], "USB COS/SIN", [946, 735]),

  e("field-divider", "field-ant", "divider", "monitor", [[1390, 627], [1150, 627], [1150, 608], [1128, 608]], "FFM 1-3", [1264, 618]),
  e("pdc-divider", "pdc", "divider", "monitor", [[1064, 414], [1064, 570]], "STANDBY TX", [1077, 496]),
  e("tsg-divider", "tsg", "divider", "monitor", [[940, 617], [1000, 617]], "INTEGRITY TEST", [970, 608]),
  e("divider-mon1", "divider", "mon1", "monitor", [[1000, 585], [900, 585], [900, 332], [802, 332]], "CH A / B", [892, 570], "reverse"),
  e("divider-mon2", "divider", "mon2", "monitor", [[1000, 630], [900, 630], [900, 802], [802, 802]], "CH A / B", [884, 647], "reverse"),
  e("mon1-scu", "mon1", "scu", "control", [[704, 332], [550, 332], [550, 290], [532, 290]], "ALARM / CAN", [616, 322], "bidirectional"),
  e("mon2-scu", "mon2", "scu", "control", [[704, 802], [545, 802], [545, 305], [532, 305]], "ALARM / CAN", [558, 786], "bidirectional"),

  e("ac-acdc", "acdc", "pmu", "power", [[220, 646], [198, 646]], "PMBus / 28V", [209, 636], "bidirectional"),
  e("battery-pmu", "battery", "pmu", "power", [[135, 720], [135, 677]], "CHARGE / DISCHARGE", [151, 699], "bidirectional"),
  e("power-bus", "pmu", "dcdc-aux", "power", [[135, 615], [135, 500], [283, 500], [283, 456]], "+28VDC BUS", [200, 491]),
  e("power-tx1", "pmu", "tx1-dcdc", "power", [[198, 630], [500, 630], [500, 75], [584, 75]], undefined),
  e("power-tx2", "pmu", "tx2-dcdc", "power", [[198, 650], [520, 650], [520, 545], [584, 545]], undefined),
];

const txRfNodes: readonly DiagramNode[] = [
  n("tx1-dcdc", "txrf-tx1-dcdc", 54, 72, 104, 54, "DC/DC", "1A2A4"),
  n("tx1-msg", "txrf-tx1-msg", 54, 180, 104, 58, "MSG", "1A2A5"),
  n("tx1-syn", "txrf-tx1-syn", 196, 180, 104, 58, "SYN", "1A2A6"),
  n("tx1-lsb", "txrf-tx1-sma-lsb", 356, 48, 154, 84, ["LSB SMA", "MOD → PA"], "1A2A1", "amplifier"),
  n("tx1-cma", "txrf-tx1-cma", 356, 164, 154, 84, ["CMA", "MOD → PA"], "1A2A2", "amplifier"),
  n("tx1-usb", "txrf-tx1-sma-usb", 356, 280, 154, 84, ["USB SMA", "MOD → PA"], "1A2A3", "amplifier"),
  n("tx1-fan", "txrf-tx1-fan", 196, 72, 104, 54, "FAN", "1A2A8"),
  n("scu", "txrf-scu", 610, 368, 122, 66, ["SCU ×2", "SWITCHING"], "1A1A3/4"),
  n("pdc", "txrf-pdc", 805, 290, 158, 116, ["PDC", "ACTIVE / STANDBY", "DETECT / VSWR"], "1A8A1"),
  n("asu", "txrf-asu", 1040, 290, 142, 116, ["ASU", "TM + 4 SM"], "2A1"),
  n("carrier", "txrf-carrier-antenna", 1270, 218, 118, 72, ["CARRIER", "ANTENNA"], undefined, "antenna"),
  n("sideband", "txrf-sideband-antennas", 1270, 382, 118, 80, ["48 SIDEBAND", "ANTENNAS"], undefined, "antenna"),
  n("tx2-dcdc", "txrf-tx2-dcdc", 54, 700, 104, 54, "DC/DC", "1A3A4"),
  n("tx2-msg", "txrf-tx2-msg", 54, 592, 104, 58, "MSG", "1A3A5"),
  n("tx2-syn", "txrf-tx2-syn", 196, 592, 104, 58, "SYN", "1A3A6"),
  n("tx2-lsb", "txrf-tx2-sma-lsb", 356, 720, 154, 84, ["LSB SMA", "MOD → PA"], "1A3A1", "amplifier"),
  n("tx2-cma", "txrf-tx2-cma", 356, 604, 154, 84, ["CMA", "MOD → PA"], "1A3A2", "amplifier"),
  n("tx2-usb", "txrf-tx2-sma-usb", 356, 488, 154, 84, ["USB SMA", "MOD → PA"], "1A3A3", "amplifier"),
  n("tx2-fan", "txrf-tx2-fan", 196, 700, 104, 54, "FAN", "1A3A8"),
];

const txRfEdges: readonly DiagramEdge[] = [
  e("pwr1-msg", "tx1-dcdc", "tx1-msg", "power", [[106, 126], [106, 180]], "+28 VDC", [82, 151]),
  e("pwr1-syn", "tx1-dcdc", "tx1-syn", "power", [[158, 99], [248, 99], [248, 180]]),
  e("pwr1-pa", "tx1-dcdc", "tx1-cma", "power", [[158, 112], [330, 112], [330, 206], [356, 206]]),
  e("msg1-syn", "tx1-msg", "tx1-syn", "control", [[158, 209], [196, 209]], "SWITCHING", [177, 199], "bidirectional"),
  e("syn1-lsb", "tx1-syn", "tx1-lsb", "rf", [[300, 196], [330, 196], [330, 90], [356, 90]], "fL", [335, 154]),
  e("syn1-cma", "tx1-syn", "tx1-cma", "rf", [[300, 209], [356, 209]], "fC", [328, 198]),
  e("syn1-usb", "tx1-syn", "tx1-usb", "rf", [[300, 222], [330, 222], [330, 322], [356, 322]], "fU", [335, 268]),
  e("msg1-lsb", "tx1-msg", "tx1-lsb", "modulation", [[158, 193], [316, 193], [316, 106], [356, 106]], "COS / SIN", [284, 184]),
  e("msg1-cma", "tx1-msg", "tx1-cma", "modulation", [[158, 209], [356, 209]], "COMP", [270, 222]),
  e("msg1-usb", "tx1-msg", "tx1-usb", "modulation", [[158, 225], [316, 225], [316, 338], [356, 338]], "COS / SIN", [285, 238]),
  e("fan1-msg", "tx1-msg", "tx1-fan", "control", [[158, 191], [248, 191], [248, 126]], "FAN CTRL", [260, 154], "bidirectional"),
  e("lsb1-pdc", "tx1-lsb", "pdc", "rf", [[510, 90], [760, 90], [760, 314], [805, 314]], "LSB COS / SIN", [636, 80]),
  e("cma1-pdc", "tx1-cma", "pdc", "rf", [[510, 206], [775, 206], [775, 332], [805, 332]], "CARRIER", [650, 196]),
  e("usb1-pdc", "tx1-usb", "pdc", "rf", [[510, 322], [790, 322], [790, 350], [805, 350]], "USB COS / SIN", [651, 312]),

  e("pwr2-msg", "tx2-dcdc", "tx2-msg", "power", [[106, 700], [106, 650]], "+28 VDC", [82, 676], "reverse"),
  e("pwr2-syn", "tx2-dcdc", "tx2-syn", "power", [[158, 727], [248, 727], [248, 650]], undefined, undefined, "reverse"),
  e("pwr2-pa", "tx2-dcdc", "tx2-cma", "power", [[158, 714], [330, 714], [330, 646], [356, 646]], undefined, undefined, "reverse"),
  e("msg2-syn", "tx2-msg", "tx2-syn", "control", [[158, 621], [196, 621]], "SWITCHING", [177, 611], "bidirectional"),
  e("syn2-lsb", "tx2-syn", "tx2-lsb", "rf", [[300, 608], [330, 608], [330, 762], [356, 762]], "fL", [335, 690]),
  e("syn2-cma", "tx2-syn", "tx2-cma", "rf", [[300, 621], [356, 621]], "fC", [328, 610]),
  e("syn2-usb", "tx2-syn", "tx2-usb", "rf", [[300, 634], [330, 634], [330, 530], [356, 530]], "fU", [335, 577]),
  e("msg2-lsb", "tx2-msg", "tx2-lsb", "modulation", [[158, 637], [316, 637], [316, 746], [356, 746]], "COS / SIN", [284, 650]),
  e("msg2-cma", "tx2-msg", "tx2-cma", "modulation", [[158, 621], [356, 621]], "COMP", [270, 634]),
  e("msg2-usb", "tx2-msg", "tx2-usb", "modulation", [[158, 605], [316, 605], [316, 514], [356, 514]], "COS / SIN", [285, 596]),
  e("fan2-msg", "tx2-msg", "tx2-fan", "control", [[158, 639], [248, 639], [248, 700]], "FAN CTRL", [260, 676], "bidirectional"),
  e("lsb2-pdc", "tx2-lsb", "pdc", "rf", [[510, 762], [760, 762], [760, 382], [805, 382]], "LSB COS / SIN", [636, 775]),
  e("cma2-pdc", "tx2-cma", "pdc", "rf", [[510, 646], [775, 646], [775, 364], [805, 364]], "CARRIER", [650, 659]),
  e("usb2-pdc", "tx2-usb", "pdc", "rf", [[510, 530], [790, 530], [790, 346], [805, 346]], "USB COS / SIN", [651, 543]),

  e("scu-msg1", "scu", "tx1-msg", "control", [[610, 385], [540, 385], [540, 238], [106, 238]], "VOICE / SWITCH", [512, 376], "reverse"),
  e("scu-msg2", "scu", "tx2-msg", "control", [[610, 417], [540, 417], [540, 592], [106, 592]], undefined, undefined, "reverse"),
  e("scu-pdc", "scu", "pdc", "control", [[732, 401], [805, 401]], "CHANGEOVER", [768, 391], "bidirectional"),
  e("pdc-carrier", "pdc", "carrier", "rf", [[963, 318], [1208, 318], [1208, 254], [1270, 254]], "ACTIVE CARRIER", [1090, 308]),
  e("pdc-asu", "pdc", "asu", "rf", [[963, 374], [1040, 374]], "4 × SB", [1002, 363]),
  e("asu-sideband", "asu", "sideband", "rf", [[1182, 348], [1230, 348], [1230, 422], [1270, 422]], "COMMUTATION", [1236, 372]),
];

const monitorNodes: readonly DiagramNode[] = [
  n("field", "monitor-field-antennas", 44, 80, 148, 72, ["FIELD MONITOR", "ANTENNAS 1-3"], undefined, "antenna"),
  n("pdc", "monitor-pdc", 44, 244, 148, 72, ["PDC", "STANDBY DVOR"], "1A8A1"),
  n("tsg", "monitor-tsg", 44, 408, 148, 72, ["TSG", "INTEGRITY TEST"], "1A1A2"),
  n("divider", "monitor-divider", 286, 154, 170, 302, ["QUINT 3-WAY", "RF DIVIDER", "FFM1 · FFM2 · FFM3", "STANDBY · TSG"], "1PD1"),
  n("mon1", "monitor-mon1", 560, 120, 178, 130, ["MONITOR 1", "CH A", "CH B1 / B2", "STBY / TSG"], "1A2A7"),
  n("mon2", "monitor-mon2", 560, 350, 178, 130, ["MONITOR 2", "CH A", "CH B1 / B2", "STBY / TSG"], "1A3A7"),
  n("scu", "monitor-scu", 870, 236, 170, 130, ["SCU ×2", "AND / OR VOTING", "CHANGEOVER / SHUTDOWN"], "1A1A3/4"),
];

const monitorEdges: readonly DiagramEdge[] = [
  e("ffm-divider", "field", "divider", "monitor", [[192, 116], [240, 116], [240, 196], [286, 196]], "FFM1 / 2 / 3", [248, 106]),
  e("pdc-divider", "pdc", "divider", "monitor", [[192, 280], [286, 280]], "STANDBY TX", [239, 269]),
  e("tsg-divider", "tsg", "divider", "monitor", [[192, 444], [240, 444], [240, 414], [286, 414]], "TEST SIGNAL", [236, 459]),
  e("divider-mon1", "divider", "mon1", "monitor", [[456, 205], [510, 205], [510, 185], [560, 185]], "CH A / B1 / B2 / STBY / TSG", [505, 191]),
  e("divider-mon2", "divider", "mon2", "monitor", [[456, 405], [510, 405], [510, 415], [560, 415]], "CH A / B1 / B2 / STBY / TSG", [505, 430]),
  e("mon1-scu", "mon1", "scu", "control", [[738, 160], [812, 160], [812, 270], [870, 270]], "ALARM", [780, 151]),
  e("mon2-scu", "mon2", "scu", "control", [[738, 390], [828, 390], [828, 332], [870, 332]], "ALARM", [786, 381]),
  e("can1-scu", "mon1", "scu", "data", [[738, 210], [790, 210], [790, 286], [870, 286]], "CAN", [777, 228], "bidirectional"),
  e("can2-scu", "mon2", "scu", "data", [[738, 440], [806, 440], [806, 316], [870, 316]], "CAN", [817, 421], "bidirectional"),
];

const asuNodes: readonly DiagramNode[] = [
  n("pdc", "asu-pdc", 32, 188, 146, 110, ["PDC", "LSB COS / SIN", "USB COS / SIN"], "1A8A1"),
  n("scu", "asu-scu", 32, 410, 146, 78, ["SCU ×2", "SYNC / CLOCK"], "1A1A3/4"),
  n("interface", "asu-interface", 254, 390, 162, 120, ["ASU-IF", "DC/DC + CPLD", "30 Hz / 1440 Hz"], "2A1A1"),
  n("toggle", "asu-toggle", 254, 188, 162, 110, ["TOGGLE MODULE", "EVEN / ODD", "USB / LSB"], "2A1A2"),
  n("cos-lo", "asu-sm-cos-lo", 520, 44, 178, 104, ["SM COS LO", "A1-A23 ODD"], "2A1A3"),
  n("cos-hi", "asu-sm-cos-hi", 520, 188, 178, 104, ["SM COS HI", "A25-A47 ODD"], "2A1A4"),
  n("sin-lo", "asu-sm-sin-lo", 520, 332, 178, 104, ["SM SIN LO", "A2-A24 EVEN"], "2A1A5"),
  n("sin-hi", "asu-sm-sin-hi", 520, 476, 178, 104, ["SM SIN HI", "A26-A48 EVEN"], "2A1A6"),
  n("antennas", "asu-sideband-antennas", 824, 160, 166, 310, ["48 SIDEBAND", "ANTENNAS", "4 GROUPS × 12"], undefined, "antenna"),
  n("power-monitor", "asu-power-monitor", 254, 580, 444, 80, ["OPTIONAL POWER MONITOR", "CARRIER + FOUR SIDEBAND FORWARD / REVERSE"], "2A1A7"),
];

const asuEdges: readonly DiagramEdge[] = [
  e("pdc-toggle", "pdc", "toggle", "rf", [[178, 243], [254, 243]], "4 × SIDEBAND", [216, 232]),
  e("scu-if", "scu", "interface", "control", [[178, 449], [254, 449]], "SYNC / SW CLOCK / BITE", [216, 438], "bidirectional"),
  e("if-toggle", "interface", "toggle", "control", [[335, 390], [335, 298]], "EVEN / ODD TOGGLE", [346, 344]),
  e("toggle-coslo", "toggle", "cos-lo", "rf", [[416, 216], [470, 216], [470, 96], [520, 96]], "COS", [478, 123]),
  e("toggle-coshi", "toggle", "cos-hi", "rf", [[416, 232], [520, 232]], "COS", [468, 221]),
  e("toggle-sinlo", "toggle", "sin-lo", "rf", [[416, 254], [470, 254], [470, 384], [520, 384]], "SIN", [478, 356]),
  e("toggle-sinhi", "toggle", "sin-hi", "rf", [[416, 270], [454, 270], [454, 528], [520, 528]], "SIN", [465, 477]),
  e("if-coslo", "interface", "cos-lo", "control", [[416, 416], [440, 416], [440, 126], [520, 126]], "12-BIT SELECT", [450, 164]),
  e("if-coshi", "interface", "cos-hi", "control", [[416, 438], [460, 438], [460, 270], [520, 270]]),
  e("if-sinlo", "interface", "sin-lo", "control", [[416, 462], [520, 462], [520, 414]], undefined, undefined, "reverse"),
  e("if-sinhi", "interface", "sin-hi", "control", [[416, 486], [486, 486], [486, 558], [520, 558]]),
  e("coslo-ant", "cos-lo", "antennas", "rf", [[698, 96], [776, 96], [776, 208], [824, 208]], "A1…A23", [758, 86]),
  e("coshi-ant", "cos-hi", "antennas", "rf", [[698, 240], [824, 240]], "A25…A47", [761, 229]),
  e("sinlo-ant", "sin-lo", "antennas", "rf", [[698, 384], [776, 384], [776, 352], [824, 352]], "A2…A24", [757, 398]),
  e("sinhi-ant", "sin-hi", "antennas", "rf", [[698, 528], [790, 528], [790, 416], [824, 416]], "A26…A48", [756, 541]),
  e("pdc-pm", "pdc", "power-monitor", "monitor", [[105, 298], [105, 620], [254, 620]], "RF SAMPLE", [116, 506]),
];

const powerControlNodes: readonly DiagramNode[] = [
  n("battery1", "power-battery1", 44, 70, 120, 58, "BATTERY 1", undefined, "external"),
  n("battery2", "power-battery2", 44, 158, 120, 58, "BATTERY 2", undefined, "external"),
  n("switch", "power-switch-panel", 218, 52, 154, 76, ["POWER PANEL", "AC MAIN / BATT 1 / 2"], "1A4"),
  n("acdc1", "power-acdc1", 218, 174, 98, 58, "AC/DC 1", "1A5A1"),
  n("acdc3", "power-acdc3", 330, 174, 98, 58, "AC/DC 3", "1A5A3"),
  n("acdc5", "power-acdc5", 442, 174, 98, 58, "AC/DC 5", "1A5A5"),
  n("pmu1", "power-pmu1", 218, 286, 132, 70, "PMU 1", "1A4A1"),
  n("pmu2", "power-pmu2", 390, 286, 132, 70, "PMU 2", "1A4A2"),
  n("dcdc-aux", "power-dcdc-aux", 610, 70, 150, 64, "DC/DC-A ×2", "1A1A8/9"),
  n("dcdc-tx1", "power-dcdc-tx1", 610, 174, 150, 64, "TX1 DC/DC", "1A2A4"),
  n("dcdc-tx2", "power-dcdc-tx2", 610, 278, 150, 64, "TX2 DC/DC", "1A3A4"),
  n("scu-power", "power-scu", 610, 382, 150, 64, "SCU ×2", "1A1A3/4"),

  n("remote", "control-remote", 44, 530, 126, 58, "RCU / RSU", undefined, "external"),
  n("pmdt", "control-pmdt", 44, 626, 126, 58, "PMDT", undefined, "external"),
  n("ifb", "control-ifb", 236, 530, 126, 58, "IFB", "1A7"),
  n("niu", "control-niu", 236, 626, 126, 58, "NIU ×2", "1A1A6/7"),
  n("modem", "control-modem", 236, 722, 126, 58, "MODEM ×2", "1A1A10/11"),
  n("lmi", "control-lmi", 418, 530, 126, 58, "LMI", "1A6"),
  n("csp", "control-csp", 418, 626, 126, 58, "CSP", "1A1A1"),
  n("emu", "control-emu", 418, 722, 126, 58, "EMU", "1A1A5"),
  n("scu", "control-scu", 624, 594, 158, 100, ["SCU ×2", "CAN / VOTING", "CHANGEOVER"], "1A1A3/4"),
  n("msg", "control-msg", 870, 500, 132, 58, "MSG TX1/2", "1A2A5/1A3A5"),
  n("mon", "control-mon", 870, 586, 132, 58, "MON 1/2", "1A2A7/1A3A7"),
  n("pdc", "control-pdc", 870, 672, 132, 58, "PDC", "1A8A1"),
  n("pmu", "control-pmu", 870, 758, 132, 58, "PMU 1/2", "1A4A1/2"),
  n("tsg", "control-tsg", 1060, 500, 126, 58, "TSG", "1A1A2"),
  n("vau", "control-vau", 1060, 758, 126, 58, "VAU", "1A1A12"),
];

const powerControlEdges: readonly DiagramEdge[] = [
  e("bat1-switch", "battery1", "switch", "power", [[164, 99], [190, 99], [190, 78], [218, 78]], "BATT 1", [183, 89]),
  e("bat2-switch", "battery2", "switch", "power", [[164, 187], [190, 187], [190, 102], [218, 102]], "BATT 2", [181, 177]),
  e("switch-acdc1", "switch", "acdc1", "power", [[295, 128], [295, 174]], "AC MAINS", [310, 151]),
  e("switch-acdc3", "switch", "acdc3", "power", [[320, 128], [320, 150], [379, 150], [379, 174]]),
  e("switch-acdc5", "switch", "acdc5", "power", [[345, 128], [345, 142], [491, 142], [491, 174]]),
  e("acdc1-pmu1", "acdc1", "pmu1", "power", [[267, 232], [267, 286]], "+28V / PMBus", [278, 259], "bidirectional"),
  e("acdc3-pmu1", "acdc3", "pmu1", "power", [[379, 232], [379, 260], [284, 260], [284, 286]], undefined, undefined, "bidirectional"),
  e("acdc5-pmu2", "acdc5", "pmu2", "power", [[491, 232], [491, 286]], undefined, undefined, "bidirectional"),
  e("pmu-link", "pmu1", "pmu2", "data", [[350, 321], [390, 321]], "REDUNDANT", [370, 310], "bidirectional"),
  e("pmu-bus-aux", "pmu2", "dcdc-aux", "power", [[522, 310], [570, 310], [570, 102], [610, 102]], "+28 VDC BUS", [578, 205]),
  e("pmu-bus-tx1", "pmu2", "dcdc-tx1", "power", [[522, 321], [580, 321], [580, 206], [610, 206]]),
  e("pmu-bus-tx2", "pmu2", "dcdc-tx2", "power", [[522, 332], [590, 332], [590, 310], [610, 310]]),
  e("pmu-can-scu", "pmu2", "scu-power", "data", [[456, 356], [456, 414], [610, 414]], "CAN", [529, 404], "bidirectional"),

  e("remote-ifb", "remote", "ifb", "data", [[170, 559], [236, 559]], "MODEM / IP", [203, 548], "bidirectional"),
  e("pmdt-ifb", "pmdt", "ifb", "data", [[170, 655], [200, 655], [200, 574], [236, 574]], "USB / RS-232", [209, 628], "bidirectional"),
  e("pmdt-niu", "pmdt", "niu", "data", [[170, 655], [236, 655]], "LAN", [203, 644], "bidirectional"),
  e("modem-ifb", "modem", "ifb", "data", [[299, 722], [299, 588]], undefined, undefined, "bidirectional"),
  e("ifb-scu", "ifb", "scu", "data", [[362, 559], [580, 559], [580, 620], [624, 620]], undefined, undefined, "bidirectional"),
  e("niu-scu", "niu", "scu", "data", [[362, 655], [624, 655]], "ETHERNET", [493, 644], "bidirectional"),
  e("lmi-scu", "lmi", "scu", "data", [[544, 559], [602, 559], [602, 620], [624, 620]], "LAN / USB", [589, 548], "bidirectional"),
  e("csp-scu", "csp", "scu", "control", [[544, 655], [624, 655]], undefined, undefined, "bidirectional"),
  e("emu-scu", "emu", "scu", "data", [[544, 751], [602, 751], [602, 670], [624, 670]], "CAN", [588, 740], "bidirectional"),
  e("scu-msg", "scu", "msg", "control", [[782, 610], [824, 610], [824, 529], [870, 529]], "VOICE / SWITCH", [835, 575], "bidirectional"),
  e("scu-mon", "scu", "mon", "control", [[782, 630], [870, 615]], "ALARM", [826, 611], "bidirectional"),
  e("scu-pdc", "scu", "pdc", "control", [[782, 650], [824, 650], [824, 701], [870, 701]], "CHANGEOVER", [836, 675], "bidirectional"),
  e("scu-pmu", "scu", "pmu", "data", [[782, 670], [810, 670], [810, 787], [870, 787]], "CAN", [820, 741], "bidirectional"),
  e("tsg-scu", "tsg", "scu", "data", [[1060, 529], [1020, 529], [1020, 600], [782, 600]], "CAN / TEST", [973, 519], "bidirectional"),
  e("vau-msg", "vau", "msg", "modulation", [[1060, 787], [1030, 787], [1030, 529], [1002, 529]], "VOICE", [1040, 661]),
];

const diagrams: readonly DiagramDefinition[] = [
  {
    id: "overview",
    label: "Tổng thể",
    reference: "Figure 1-8 · Simplified Block Diagram of 220 DVOR",
    width: 1540,
    height: 860,
    nodes: overviewNodes,
    edges: overviewEdges,
    groups: [
      { id: "aux", label: "AUXILIARY ELECTRONICS · 1A1", x: 18, y: 24, width: 340, height: 458 },
      { id: "tx1", label: "TRANSMITTER NO. 1 · 1A2", x: 560, y: 24, width: 380, height: 360 },
      { id: "tx2", label: "TRANSMITTER NO. 2 · 1A3", x: 560, y: 494, width: 380, height: 350 },
      { id: "rf", label: "RF CHANGEOVER / ANTENNA", x: 972, y: 228, width: 556, height: 270 },
      { id: "monitor", label: "MONITORING", x: 972, y: 534, width: 556, height: 160 },
      { id: "power", label: "POWER SUPPLY", x: 18, y: 570, width: 340, height: 230 },
    ],
  },
  {
    id: "tx-rf",
    label: "Máy phát & RF",
    reference: "Figures 1-14 / 1-15 · Transmitter subsystem and PDC changeover",
    width: 1420,
    height: 850,
    nodes: txRfNodes,
    edges: txRfEdges,
    groups: [
      { id: "tx1", label: "TRANSMITTER NO. 1 · 1A2", x: 24, y: 24, width: 516, height: 360 },
      { id: "tx2", label: "TRANSMITTER NO. 2 · 1A3", x: 24, y: 466, width: 516, height: 360 },
      { id: "distribution", label: "RF CHANGEOVER / DISTRIBUTION", x: 780, y: 180, width: 624, height: 390 },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    reference: "Figure 1-17 · Monitor subsystem",
    width: 1080,
    height: 540,
    nodes: monitorNodes,
    edges: monitorEdges,
    groups: [
      { id: "sources", label: "MONITOR RF SOURCES", x: 22, y: 42, width: 190, height: 458 },
      { id: "monitors", label: "DUAL MONITOR", x: 532, y: 82, width: 238, height: 430 },
      { id: "executive", label: "EXECUTIVE ACTION", x: 842, y: 198, width: 226, height: 206 },
    ],
  },
  {
    id: "asu",
    label: "ASU",
    reference: "Figure 3-70 · ASU block diagram",
    width: 1020,
    height: 700,
    nodes: asuNodes,
    edges: asuEdges,
    groups: [
      { id: "asu", label: "ANTENNA SWITCHING UNIT · 2A1", x: 220, y: 22, width: 510, height: 660 },
      { id: "antenna", label: "SIDEBAND ARRAY", x: 790, y: 126, width: 212, height: 380 },
    ],
  },
  {
    id: "power-control",
    label: "Nguồn & điều khiển",
    reference: "Figures 1-18 / 1-19 / 1-20 · Power, control and monitoring",
    width: 1220,
    height: 850,
    nodes: powerControlNodes,
    edges: powerControlEdges,
    groups: [
      { id: "power", label: "POWER SUPPLY", x: 22, y: 26, width: 776, height: 440 },
      { id: "external", label: "LOCAL / REMOTE ACCESS", x: 22, y: 500, width: 550, height: 324 },
      { id: "control", label: "CONTROL AND MONITORING", x: 594, y: 470, width: 604, height: 354 },
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
              <marker key={kind} id={`${markerPrefix}-${kind}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path className={styles[`marker${kind[0]!.toUpperCase()}${kind.slice(1)}`]} d="M0 0L8 4L0 8Z" />
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
