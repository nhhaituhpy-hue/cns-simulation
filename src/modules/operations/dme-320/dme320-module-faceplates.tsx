import type { ReactNode } from "react";
import type { Dme320BlockId, Dme320FaceplateKind } from "./block-diagram-data";
import { DME_320_BLOCK_BY_ID } from "./block-diagram-data";
import styles from "./dme320-block-diagram.module.css";

interface Dme320ModuleFaceplateProps {
  kind: Dme320FaceplateKind;
  blockId: Dme320BlockId;
}

type LedColor = "green" | "red" | "amber" | "blue" | "off";

function Screw({ x, y, radius = 7 }: { x: number; y: number; radius?: number }) {
  return (
    <g className={styles.faceplateScrew} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      <path d={`M${x - radius * 0.55} ${y}h${radius * 1.1}M${x} ${y - radius * 0.55}v${radius * 1.1}`} />
    </g>
  );
}

function Led({
  x,
  y,
  label,
  color = "off",
  align = "right",
  radius = 6.5,
}: {
  x: number;
  y: number;
  label?: string;
  color?: LedColor;
  align?: "left" | "right" | "below";
  radius?: number;
}) {
  const anchor = align === "left" ? "end" : align === "below" ? "middle" : "start";
  const labelX = align === "left" ? x - 12 : align === "below" ? x : x + 12;
  const labelY = align === "below" ? y + radius + 15 : y + 4;
  return (
    <g className={styles.faceplateLed} data-color={color} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      {label ? <text x={labelX} y={labelY} textAnchor={anchor}>{label}</text> : null}
    </g>
  );
}

function PushButton({
  x,
  y,
  label,
  size = 27,
}: {
  x: number;
  y: number;
  label?: string;
  size?: number;
}) {
  return (
    <g className={styles.faceplateButton} aria-hidden>
      <rect x={x - size / 2 - 4} y={y - size / 2 - 4} width={size + 8} height={size + 8} rx="3" />
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx="2" />
      {label ? <text x={x} y={y + size / 2 + 18} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function TestJack({
  x,
  y,
  label,
  color = "red",
}: {
  x: number;
  y: number;
  label?: string;
  color?: "red" | "black";
}) {
  return (
    <g className={styles.faceplateTestJack} data-color={color} aria-hidden>
      <circle cx={x} cy={y} r="8" />
      <circle cx={x} cy={y} r="3" />
      {label ? <text x={x + 14} y={y + 4}>{label}</text> : null}
    </g>
  );
}

function Coax({
  x,
  y,
  label,
  radius = 17,
  labelBelow = false,
}: {
  x: number;
  y: number;
  label?: string;
  radius?: number;
  labelBelow?: boolean;
}) {
  return (
    <g className={styles.faceplateCoax} aria-hidden>
      <circle cx={x} cy={y} r={radius + 5} />
      <circle cx={x} cy={y} r={radius} />
      <circle cx={x} cy={y} r={radius * 0.34} />
      {label ? (
        <text x={x} y={labelBelow ? y + radius + 22 : y - radius - 12} textAnchor="middle">{label}</text>
      ) : null}
    </g>
  );
}

function BoxHeader({ x, y, pins, label }: { x: number; y: number; pins: 10 | 14; label?: string }) {
  const rows = pins / 2;
  return (
    <g className={styles.faceplateHeader} aria-hidden>
      <rect x={x - 20} y={y - rows * 5 - 7} width="40" height={rows * 10 + 14} rx="2" />
      {Array.from({ length: rows }, (_, row) => (
        <g key={row}>
          <circle cx={x - 7} cy={y - (rows - 1) * 5 + row * 10} r="2.4" />
          <circle cx={x + 7} cy={y - (rows - 1) * 5 + row * 10} r="2.4" />
        </g>
      ))}
      {label ? <text x={x} y={y + rows * 5 + 21} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function PullHandle({ x, y, height }: { x: number; y: number; height: number }) {
  return (
    <g className={styles.faceplateHandle} aria-hidden>
      <rect x={x - 13} y={y} width="26" height={height} rx="13" />
      <path d={`M${x} ${y + 24}v${height - 48}`} />
    </g>
  );
}

function DSub({ x, y, label, female = false }: { x: number; y: number; label: string; female?: boolean }) {
  return (
    <g aria-hidden>
      <path
        d={`M${x - 35} ${y - 18}h70l-7 36h-56Z`}
        fill={female ? "#c8cfcd" : "#303b3e"}
        stroke="#11191b"
        strokeWidth="2"
      />
      {Array.from({ length: 9 }, (_, index) => (
        <circle
          key={index}
          cx={x - 22 + (index % 5) * 11 + (index > 4 ? 5.5 : 0)}
          cy={y - 6 + (index > 4 ? 12 : 0)}
          r="2"
          fill={female ? "#202a2d" : "#d9dedb"}
        />
      ))}
      <text className={styles.faceplateSmallLabel} x={x} y={y + 34} textAnchor="middle">{label}</text>
    </g>
  );
}

function PanelFrame({
  width,
  height,
  title,
  partNumber,
  children,
}: {
  width: number;
  height: number;
  title: string;
  partNumber?: string;
  children: ReactNode;
}) {
  const safeName = `${title}-${partNumber ?? "module"}`.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const gradientId = `dme320-faceplate-${safeName}`;
  return (
    <svg
      className={styles.moduleFaceplate}
      width={width}
      height={height}
      style={{ aspectRatio: `${width} / ${height}` }}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`DME 320 ${title} module faceplate`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f1f3ef" />
          <stop offset="0.27" stopColor="#bdc5c2" />
          <stop offset="0.5" stopColor="#edf0ed" />
          <stop offset="0.78" stopColor="#9ea9a9" />
          <stop offset="1" stopColor="#d9ddda" />
        </linearGradient>
      </defs>
      <rect className={styles.faceplateShadow} x="10" y="10" width={width - 16} height={height - 16} rx="8" />
      <rect className={styles.faceplateBody} x="4" y="4" width={width - 8} height={height - 8} rx="5" fill={`url(#${gradientId})`} />
      <rect className={styles.faceplateTitleStrip} x="14" y="14" width={width - 28} height="42" rx="3" />
      <text className={styles.faceplateTitle} x={width / 2} y="42" textAnchor="middle">{title}</text>
      <Screw x={24} y={24} radius={6} />
      <Screw x={width - 24} y={24} radius={6} />
      <Screw x={24} y={height - 24} radius={6} />
      <Screw x={width - 24} y={height - 24} radius={6} />
      {children}
      <text className={styles.faceplatePartNumber} x={width - 38} y={height - 18} textAnchor="end">
        {partNumber ? `P/N ${partNumber}` : "DME 320"}
      </text>
    </svg>
  );
}

function LmiFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={920} height={500} title="LOCAL MAINTENANCE INTERFACE" partNumber={partNumber}>
      <rect className={styles.faceplateScreenFrame} x="45" y="80" width="680" height="354" rx="9" />
      <rect className={styles.faceplateScreen} x="62" y="97" width="646" height="320" rx="5" />
      <text className={styles.faceplateTitle} style={{ fill: "#89d9ef", fontSize: 27 }} x="385" y="190" textAnchor="middle">DME 320</text>
      <text className={styles.faceplateSectionTitle} style={{ fill: "#b8d3da" }} x="385" y="218" textAnchor="middle">LOCAL STATUS / MAINTENANCE</text>
      <path d="M105 270h560M105 315h560" stroke="#355966" strokeWidth="2" />
      {[[145, "TXP 1"], [290, "TXP 2"], [435, "MON 1"], [580, "MON 2"]].map(([x, label]) => (
        <g key={label as string}>
          <circle cx={Number(x)} cy="292" r="10" fill="#31db66" stroke="#135d31" strokeWidth="2" />
          <text className={styles.faceplateSmallLabel} style={{ fill: "#c6d9de" }} x={Number(x)} y="344" textAnchor="middle">{label}</text>
        </g>
      ))}
      <rect x="750" y="80" width="125" height="354" rx="8" fill="#c5ccca" stroke="#536164" strokeWidth="2" />
      {([
        ["NORMAL", "green"],
        ["WARNING", "amber"],
        ["ALARM", "red"],
        ["MAINT", "blue"],
      ] as const).map(([label, color], index) => (
        <g key={label}>
          <rect x="767" y={101 + index * 58} width="91" height="39" rx="4" fill="#dce1de" stroke="#697678" />
          <Led x={785} y={120 + index * 58} color={color} />
          <text className={styles.faceplateSmallLabel} x="818" y={124 + index * 58} textAnchor="middle">{label}</text>
        </g>
      ))}
      <text className={styles.faceplateSmallLabel} x="812" y="357" textAnchor="middle">LOCAL · REM · MAINT</text>
      <circle cx="812" cy="390" r="25" fill="#dfe3e0" stroke="#465458" strokeWidth="2" />
      <circle cx="812" cy="390" r="15" fill="#505b5d" stroke="#263033" strokeWidth="2" />
      <path d="M812 375v31h19" fill="none" stroke="#d6dcda" strokeWidth="5" />
    </PanelFrame>
  );
}

function CspFaceplate({ partNumber }: { partNumber?: string }) {
  const monitorRows: readonly [string, LedColor][] = [
    ["NORMAL", "green"],
    ["WARNING", "amber"],
    ["ALARM", "red"],
  ];
  const lowerLeds: readonly [string, LedColor][] = [
    ["CHANGEOVER", "amber"],
    ["ANT FAULT", "red"],
    ["INTERLOCKED", "amber"],
    ["AC MAIN", "green"],
    ["ON BAT", "amber"],
    ["ENVIRONMENT", "red"],
    ["TxD", "green"],
    ["RxD", "green"],
  ];
  return (
    <PanelFrame width={330} height={990} title="CSP" partNumber={partNumber}>
      <text className={styles.faceplateSectionTitle} x="165" y="84" textAnchor="middle">TRANSPONDER</text>
      <text className={styles.faceplateSmallLabel} x="79" y="108" textAnchor="middle">#1</text>
      <text className={styles.faceplateSmallLabel} x="251" y="108" textAnchor="middle">#2</text>
      {[[140, "MAIN"], [203, "ON ANT"], [300, "POWER"], [366, "ENABLE"]].map(([y, label]) => (
        <g key={label as string}>
          <PushButton x={79} y={Number(y)} size={31} />
          <PushButton x={251} y={Number(y)} size={31} />
          <text className={styles.faceplateSectionTitle} x="165" y={Number(y) + 5} textAnchor="middle">{label}</text>
        </g>
      ))}
      <Led x={43} y={203} label="LOAD" color="green" align="below" />
      <Led x={287} y={203} label="LOAD" color="green" align="below" />
      <Led x={79} y={258} color="red" />
      <Led x={251} y={258} color="red" />
      <text className={styles.faceplateSectionTitle} x="165" y="263" textAnchor="middle">FAULT</text>
      <path className={styles.faceplateDivider} d="M24 409h282" />
      <text className={styles.faceplateSectionTitle} x="165" y="437" textAnchor="middle">MONITOR</text>
      <text className={styles.faceplateSmallLabel} x="58" y="461" textAnchor="middle">#1 EXEC</text>
      <text className={styles.faceplateSmallLabel} x="105" y="461" textAnchor="middle">STBY</text>
      <text className={styles.faceplateSmallLabel} x="225" y="461" textAnchor="middle">#2 STBY</text>
      <text className={styles.faceplateSmallLabel} x="272" y="461" textAnchor="middle">EXEC</text>
      {monitorRows.map(([label, color], row) => (
        <g key={label}>
          {[58, 105, 225, 272].map((x) => <Led key={x} x={x} y={486 + row * 43} color={color} />)}
          <text className={styles.faceplateSmallLabel} x="165" y={490 + row * 43} textAnchor="middle">{label}</text>
        </g>
      ))}
      <PushButton x={82} y={635} label="BYPASS" size={29} />
      <PushButton x={248} y={635} label="BYPASS" size={29} />
      <path className={styles.faceplateDivider} d="M24 684h282" />
      {lowerLeds.map(([label, color], index) => (
        <Led key={label} x={50} y={714 + index * 30} label={label} color={color} />
      ))}
      <PushButton x={245} y={721} label="RESET" size={28} />
      <PushButton x={245} y={795} label="LAMP TEST" size={28} />
      <PushButton x={245} y={870} label="SILENCE" size={28} />
      <circle cx="245" cy="926" r="15" fill="#d6dcda" stroke="#465458" strokeWidth="2" />
      <circle cx="245" cy="926" r="6" fill="#5d696b" />
      <path d="M237 926h16" stroke="#273235" strokeWidth="2" />
      <text className={styles.faceplateSmallLabel} x="245" y="951" textAnchor="middle">VOLUME</text>
    </PanelFrame>
  );
}

function ScuFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={220} height={800} title="SCU" partNumber={partNumber}>
      <Led x={62} y={92} label="POWER" color="green" />
      <Led x={62} y={126} label="FAULT" color="off" />
      <Led x={62} y={160} label="MASTER" color="green" />
      <path className={styles.faceplateDivider} d="M28 194h164" />
      <TestJack x={62} y={230} label="TP9 · CAN TxD, TTL" />
      <TestJack x={62} y={268} label="TP16 · CAN RxD, TTL" />
      <BoxHeader x={110} y={380} pins={14} label="J2 · MCU ISP / DOWNLOAD" />
      <PushButton x={110} y={486} label="SW1 · RESET" size={25} />
      <BoxHeader x={110} y={600} pins={10} label="J3 · CPLD JTAG / DOWNLOAD" />
      <text className={styles.faceplateSmallLabel} x="110" y="690" textAnchor="middle">CAN SYSTEM CONTROLLER</text>
    </PanelFrame>
  );
}

function EmuFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={260} height={760} title="EMU" partNumber={partNumber}>
      <rect x="42" y="82" width="176" height="590" rx="5" fill="#527161" stroke="#243f34" strokeWidth="2" />
      <path d="M62 120h136M62 620h136M76 148v440M184 148v440" fill="none" stroke="#9eb49f" strokeWidth="2" opacity="0.7" />
      {[150, 205, 260, 315, 370, 425, 480, 535].map((y, index) => (
        <g key={y}>
          <rect x="86" y={y - 12} width="88" height="24" rx="2" fill={index % 2 ? "#273c35" : "#d6c082"} stroke="#182a24" />
          <circle cx="70" cy={y} r="4" fill="#d4be76" />
          <circle cx="190" cy={y} r="4" fill="#d4be76" />
        </g>
      ))}
      <text className={styles.faceplateSectionTitle} style={{ fill: "#e2ece4" }} x="130" y="105" textAnchor="middle">ENVIRONMENT MONITOR</text>
      <text className={styles.faceplateSmallLabel} style={{ fill: "#d7e6da" }} x="130" y="654" textAnchor="middle">TEMP · SMOKE · INTRUSION · CAN</text>
      <PullHandle x={24} y={250} height={250} />
      <PullHandle x={236} y={250} height={250} />
    </PanelFrame>
  );
}

function RxuFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={220} height={780} title="RXU" partNumber={partNumber}>
      <Led x={64} y={94} label="POWER" color="green" />
      <Led x={64} y={132} label="PULSES" color="green" />
      <Coax x={110} y={250} label="LOG VIDEO WIDE" radius={20} />
      <Coax x={110} y={405} label="ON CH DET" radius={20} />
      <Coax x={110} y={560} label="LOG VIDEO" radius={20} />
      <text className={styles.faceplateSmallLabel} x="110" y="645" textAnchor="middle">RECEIVER TEST OUTPUTS</text>
      <PullHandle x={33} y={225} height={360} />
    </PanelFrame>
  );
}

function HpaFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={330} height={780} title="HPA" partNumber={partNumber}>
      <PullHandle x={55} y={205} height={390} />
      <Led x={155} y={95} label="POWER" color="green" />
      <Led x={155} y={137} label="RF ON" color="green" />
      <Led x={155} y={179} label="RVS FAULT" color="off" />
      <rect className={styles.faceplateVent} x="112" y="230" width="154" height="210" rx="5" />
      {Array.from({ length: 9 }, (_, index) => (
        <path key={index} className={styles.faceplateVentLine} d={`M128 ${250 + index * 21}h122`} />
      ))}
      <Coax x={190} y={560} label="REPLY ENV" radius={24} />
      <text className={styles.faceplateSmallLabel} x="190" y="602" textAnchor="middle">DETECTED VIDEO</text>
      <text className={styles.faceplateSmallLabel} x="190" y="676" textAnchor="middle">HIGH-POWER RF AMPLIFIER</text>
    </PanelFrame>
  );
}

function TxuFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={250} height={800} title="TXU" partNumber={partNumber}>
      <PullHandle x={40} y={230} height={350} />
      <Led x={115} y={92} label="POWER" color="green" />
      <Led x={115} y={128} label="RF ON" color="green" />
      <Led x={115} y={164} label="PLL FAIL" color="off" />
      <Led x={115} y={200} label="FAULT" color="off" />
      <Coax x={145} y={385} label="DETECTED VIDEO" radius={21} />
      <Coax x={145} y={570} label="FREQ." radius={21} />
      <text className={styles.faceplateSmallLabel} x="145" y="650" textAnchor="middle">960–1215 MHz · 0.1 MHz STEP</text>
    </PanelFrame>
  );
}

function DcdcFaceplate({ partNumber, auxiliary }: { partNumber?: string; auxiliary: boolean }) {
  const rails = auxiliary ? ["+5V", "+15V", "-15V", "GND"] : ["+5V", "+8V", "+15V", "-15V", "+28V", "+50V", "GND"];
  const width = auxiliary ? 220 : 300;
  const startY = auxiliary ? 300 : 330;
  const step = auxiliary ? 66 : 48;
  return (
    <PanelFrame width={width} height={800} title={auxiliary ? "DC/DC-A" : "DC/DC"} partNumber={partNumber}>
      {!auxiliary ? <PullHandle x={48} y={245} height={355} /> : null}
      <Led x={auxiliary ? 70 : 145} y={92} label="POWER" color="green" />
      <Led x={auxiliary ? 70 : 145} y={130} label="FAULT" color="off" />
      <Led x={auxiliary ? 70 : 145} y={168} label="BITE OK" color="green" />
      {!auxiliary ? (
        <>
          <circle cx="145" cy="228" r="13" fill="#d6dcda" stroke="#465458" strokeWidth="2" />
          <path d="M137 228h16" stroke="#273235" strokeWidth="2" />
          <text className={styles.faceplateSmallLabel} x="170" y="232">ADJ1 · +28V</text>
          <circle cx="145" cy="274" r="13" fill="#d6dcda" stroke="#465458" strokeWidth="2" />
          <path d="M137 274h16" stroke="#273235" strokeWidth="2" />
          <text className={styles.faceplateSmallLabel} x="170" y="278">ADJ2 · +50V</text>
        </>
      ) : null}
      {rails.map((label, index) => (
        <TestJack
          key={label}
          x={auxiliary ? 80 : 140}
          y={startY + index * step}
          label={label}
          color={label === "GND" ? "black" : "red"}
        />
      ))}
      <text className={styles.faceplateSmallLabel} x={width / 2} y="735" textAnchor="middle">INPUT +28 VDC</text>
    </PanelFrame>
  );
}

function TcuFaceplate({ partNumber }: { partNumber?: string }) {
  const upperPoints = ["TOA PULSE", "DECODED", "DEAD TIME", "GAUSSIAN PULSE", "RECTANGULAR PULSE", "GND"];
  const lowerPoints = ["RX INHIBIT", "LDES", "ID CODE", "ID PULSE", "SQUITTER"];
  return (
    <PanelFrame width={255} height={990} title="TCU" partNumber={partNumber}>
      <Led x={65} y={88} label="POWER ON" color="green" />
      <Led x={65} y={121} label="TCU FAULT" color="off" />
      <Led x={65} y={154} label="CW ALERT" color="amber" />
      {upperPoints.map((label, index) => (
        <TestJack key={label} x={58} y={208 + index * 34} label={label} color={label === "GND" ? "black" : "red"} />
      ))}
      <PushButton x={178} y={270} label="RESET" size={24} />
      <BoxHeader x={128} y={485} pins={14} label="MCU ISP" />
      <BoxHeader x={128} y={620} pins={10} label="FPGA ISP" />
      {lowerPoints.map((label, index) => <TestJack key={label} x={58} y={725 + index * 38} label={label} />)}
    </PanelFrame>
  );
}

function MonFaceplate({ partNumber }: { partNumber?: string }) {
  const lowerPoints = ["INPUT ENVELOPE", "INTERROGATION TRIGGER", "IDENT"];
  return (
    <PanelFrame width={265} height={950} title="MON · REV. D+" partNumber={partNumber}>
      <Led x={62} y={88} label="POWER ON" color="green" />
      <Led x={62} y={121} label="MON FAULT" color="off" />
      <TestJack x={62} y={173} label="FPGA STATUS" />
      <TestJack x={62} y={207} label="MCU STATUS" />
      <TestJack x={62} y={241} label="INTG PULSE" />
      <Led x={62} y={299} label="ALARM" color="off" />
      <Led x={62} y={333} label="WARNING" color="amber" />
      <Led x={62} y={367} label="INTEGRITY" color="off" />
      <Led x={62} y={401} label="ANTENNA FAULT" color="off" />
      <PushButton x={188} y={350} label="RESET" size={24} />
      <BoxHeader x={132} y={525} pins={14} label="MCU ISP" />
      <BoxHeader x={132} y={660} pins={10} label="FPGA ISP" />
      {lowerPoints.map((label, index) => <TestJack key={label} x={58} y={765 + index * 48} label={label} />)}
    </PanelFrame>
  );
}

function RfgFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={235} height={790} title="RFG" partNumber={partNumber}>
      <Coax x={118} y={125} label="68 MHz OSC FREQUENCY" radius={18} labelBelow />
      <TestJack x={68} y={220} label="PULSE DETECT" />
      <Led x={68} y={282} label="POWER ON" color="green" />
      <Led x={68} y={319} label="RF ON" color="green" />
      <Led x={68} y={356} label="PLL FAIL" color="off" />
      <Coax x={118} y={560} label="RFG FREQUENCY" radius={22} />
    </PanelFrame>
  );
}

function FanFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={930} height={235} title="FAN UNIT" partNumber={partNumber}>
      {[130, 270, 410, 550].map((x, index) => (
        <g key={x} aria-hidden>
          <circle cx={x} cy="130" r="45" fill="#5d686a" stroke="#303b3e" strokeWidth="3" />
          <circle cx={x} cy="130" r="12" fill="#bfc7c4" stroke="#303b3e" strokeWidth="2" />
          {[0, 90, 180, 270].map((angle) => (
            <path key={angle} d={`M${x} 118c26-30 43-12 19 15c30 18 8 41-18 17Z`} fill="#929d9d" transform={`rotate(${angle} ${x} 130)`} />
          ))}
          <text className={styles.faceplateSmallLabel} x={x} y="194" textAnchor="middle">FAN {index + 1}</text>
        </g>
      ))}
      <Led x={660} y={92} label="POWER" color="green" />
      {["FAN 1 FAIL", "FAN 2 FAIL", "FAN 3 FAIL", "FAN 4 FAIL"].map((label, index) => (
        <Led key={label} x={660 + (index > 1 ? 130 : 0)} y={130 + (index % 2) * 36} label={label} color="off" />
      ))}
    </PanelFrame>
  );
}

function PmuFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={820} height={350} title="PMU · POWER MONITORING UNIT" partNumber={partNumber}>
      <PullHandle x={410} y={66} height={45} />
      <rect className={styles.faceplateDisplay} x="72" y="91" width="180" height="76" rx="5" />
      <text className={styles.faceplateDigits} x="162" y="143" textAnchor="middle">28.0</text>
      <Led x={300} y={94} label="AC FAIL" color="off" />
      <Led x={300} y={130} label="ON BATT" color="amber" />
      <Led x={300} y={166} label="CHARGING" color="amber" />
      {["+5V", "+15V", "-15V", "GND"].map((label, index) => (
        <TestJack key={label} x={470} y={92 + index * 35} label={label} color={label === "GND" ? "black" : "red"} />
      ))}
      {[[115, "TEMP"], [245, "DC V"], [375, "DC I"], [505, "BATT V"], [635, "BATT I"]].map(([x, label]) => (
        <g key={label as string}>
          <Led x={Number(x)} y={230} color="green" />
          <PushButton x={Number(x)} y={264} label={label as string} size={27} />
        </g>
      ))}
    </PanelFrame>
  );
}

function AcdcFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={680} height={300} title="AC/DC POWER SUPPLY" partNumber={partNumber}>
      <rect className={styles.faceplateVent} x="80" y="78" width="390" height="154" rx="7" />
      {Array.from({ length: 14 }, (_, index) => (
        <path key={index} className={styles.faceplateVentLine} d={`M98 ${94 + index * 10}h354`} />
      ))}
      <circle cx="550" cy="142" r="40" fill="#657174" stroke="#303b3e" strokeWidth="3" />
      <path d="M520 142h60M550 112v60" stroke="#c1c9c7" strokeWidth="5" />
      <rect x="610" y="89" width="26" height="108" rx="8" fill="#437da4" stroke="#23465e" strokeWidth="3" />
      <text className={styles.faceplateSmallLabel} x="550" y="207" textAnchor="middle">110/220 VAC IN → +28 VDC</text>
      <text className={styles.faceplateSmallLabel} x="275" y="258" textAnchor="middle">OVERVOLTAGE / OVERCURRENT PROTECTED</text>
    </PanelFrame>
  );
}

function IfbFaceplate({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={940} height={470} title="IFB · INTERFACE BOARD" partNumber={partNumber}>
      <rect x="42" y="77" width="856" height="332" rx="6" fill="#617b68" stroke="#294638" strokeWidth="3" />
      <path d="M66 115h806M66 360h806" fill="none" stroke="#9db19d" strokeWidth="2" opacity="0.8" />
      <DSub x={135} y={145} label="RS-232 · PMDT 1" />
      <DSub x={320} y={145} label="RS-232 · PMDT 2" />
      <DSub x={505} y={145} label="RS-232 · PMDT 3" />
      <DSub x={690} y={145} label="RS-232 · RCU" female />
      <g aria-hidden>
        <path d="M92 258h64v53H92z" fill="#d3dad7" stroke="#253236" strokeWidth="2" />
        <path d="M105 271h38v25h-38z" fill="#38464a" />
        <text className={styles.faceplateSmallLabel} x="124" y="330" textAnchor="middle">USB-B · PC</text>
      </g>
      <g aria-hidden>
        <rect x="205" y="258" width="72" height="54" rx="3" fill="#d3dad7" stroke="#253236" strokeWidth="2" />
        <rect x="218" y="270" width="46" height="29" fill="#354449" />
        {Array.from({ length: 8 }, (_, index) => <path key={index} d={`M222 ${274 + index * 3}h38`} stroke="#c7a946" />)}
        <text className={styles.faceplateSmallLabel} x="241" y="330" textAnchor="middle">RJ-45 · ETHERNET</text>
      </g>
      <g aria-hidden>
        <rect x="340" y="250" width="235" height="66" fill="#283a31" stroke="#15271f" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, index) => <rect key={index} x={349 + index * 18} y="261" width="12" height="44" fill="#d6d9cb" stroke="#4a574f" />)}
        <text className={styles.faceplateSmallLabel} x="458" y="337" textAnchor="middle">I²C · TEMP · SMOKE · INTRUSION · STATUS · IDENT</text>
      </g>
      <g aria-hidden>
        <rect x="625" y="250" width="220" height="66" fill="#283a31" stroke="#15271f" strokeWidth="2" />
        {Array.from({ length: 10 }, (_, index) => <rect key={index} x={634 + index * 20} y="261" width="13" height="44" fill="#d6d9cb" stroke="#4a574f" />)}
        <text className={styles.faceplateSmallLabel} x="735" y="337" textAnchor="middle">TIP / RING · PMDT ×2 · RCU · VOICE</text>
      </g>
      <text className={styles.faceplateSmallLabel} style={{ fill: "#edf5ef" }} x="470" y="391" textAnchor="middle">SURGE-PROTECTED CABINET INTERFACE · 1A7</text>
    </PanelFrame>
  );
}

function RearDpx({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={900} height={360} title="DPX-MSC · DUPLEXER / MUTE SWITCH / COMBINER" partNumber={partNumber}>
      <rect x="70" y="82" width="690" height="205" rx="8" fill="#8d9898" stroke="#38474a" strokeWidth="3" />
      {[145, 255, 365, 475, 585, 695].map((x) => <rect key={x} x={x} y="98" width="7" height="170" fill="#d2d8d6" opacity="0.72" />)}
      <PullHandle x={815} y={102} height={165} />
      <Coax x={135} y={184} label="RXU" radius={18} />
      <Coax x={275} y={184} label="RFG 1" radius={18} />
      <Coax x={415} y={184} label="RFG 2" radius={18} />
      <Coax x={555} y={184} label="TX / COUPLER" radius={18} />
      <rect className={styles.faceplateConnector} x="655" y="160" width="55" height="48" rx="3" />
      <text className={styles.faceplateSmallLabel} x="682" y="229" textAnchor="middle">TCU CONTROL</text>
      <text className={styles.faceplateSmallLabel} x="450" y="321" textAnchor="middle">DME 320 PATH · 10 dB ATTENUATION SELECTED</text>
    </PanelFrame>
  );
}

function RearRfDetector({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={620} height={290} title="RF DETECTOR" partNumber={partNumber}>
      <rect x="115" y="83" width="390" height="135" rx="8" fill="#8d9898" stroke="#38474a" strokeWidth="3" />
      <Coax x={160} y={150} label="RF SAMPLE IN" radius={18} />
      <path d="M205 150h185" stroke="#263438" strokeWidth="5" />
      <path d="m375 136 28 14-28 14Z" fill="#263438" />
      <Coax x={460} y={150} label="DETECTED VIDEO OUT" radius={18} />
      <text className={styles.faceplateSmallLabel} x="310" y="250" textAnchor="middle">ANTENNA MONITOR SAMPLE · DME 320 10 dB ATTENUATION</text>
    </PanelFrame>
  );
}

function RearCirculator({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={570} height={420} title="RF CIRCULATOR" partNumber={partNumber}>
      <circle cx="285" cy="220" r="105" fill="#8f9999" stroke="#374548" strokeWidth="5" />
      <path d="M248 166a64 64 0 0 1 81 8l-18-3 6-18M339 223a64 64 0 0 1-48 58l13-13 13 13M240 272a64 64 0 0 1-8-83l4 18-18-1" fill="none" stroke="#263438" strokeWidth="8" />
      <Coax x={285} y={92} label="J3 · ANTENNA / COMMON" radius={19} />
      <Coax x={150} y={290} label="J1 · RXU / DPX-MSC" radius={19} />
      <Coax x={420} y={290} label="J2 · HPA / TX INPUT" radius={19} />
    </PanelFrame>
  );
}

function RearCoupler({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={880} height={330} title="DIRECTIONAL COUPLER · 27 dB" partNumber={partNumber}>
      <rect x="145" y="125" width="590" height="88" rx="42" fill="#8e9999" stroke="#38474a" strokeWidth="4" />
      <Coax x={90} y={169} label="J1 · RF IN" radius={17} />
      <Coax x={790} y={169} label="J2 · RF OUT" radius={17} />
      <Coax x={255} y={92} label="J4" radius={12} />
      <Coax x={380} y={92} label="J6 · REVERSE" radius={12} />
      <Coax x={500} y={246} label="J3 · FORWARD" radius={12} labelBelow />
      <Coax x={625} y={246} label="J5 · TX SAMPLE" radius={12} labelBelow />
      <path d="M185 169h510m-35-13 28 13-28 13" fill="none" stroke="#263438" strokeWidth="5" />
    </PanelFrame>
  );
}

function RearRelay({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={650} height={430} title="COAXIAL CHANGEOVER RELAY · DPDT" partNumber={partNumber}>
      <rect x="245" y="135" width="160" height="155" rx="16" fill="#889494" stroke="#354346" strokeWidth="4" />
      <path d="M285 175l80 74M365 175l-80 74" stroke="#263438" strokeWidth="7" />
      <Coax x={145} y={125} label="J4 · ANTENNA" radius={18} />
      <Coax x={505} y={125} label="J3 · DUMMY LOAD" radius={18} />
      <Coax x={145} y={320} label="J2 · TXP 1" radius={18} labelBelow />
      <Coax x={505} y={320} label="J1 · TXP 2" radius={18} labelBelow />
      <path d="M165 137 245 175M485 137l-80 38M165 307l80-58M485 307l-80-58" fill="none" stroke="#354346" strokeWidth="4" />
    </PanelFrame>
  );
}

function RearDummyLoad({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={760} height={310} title="RF TERMINATION · DUMMY LOAD" partNumber={partNumber}>
      <Coax x={105} y={155} label="J1 · RF INPUT" radius={20} />
      <rect x="155" y="94" width="500" height="122" rx="7" fill="#667274" stroke="#303c3f" strokeWidth="4" />
      {Array.from({ length: 22 }, (_, index) => <path key={index} d={`M${170 + index * 22} 101v108`} stroke="#c0c8c6" strokeWidth="7" />)}
      <text className={styles.faceplateSmallLabel} x="405" y="252" textAnchor="middle">HIGH-POWER 50 Ω RF LOAD</text>
    </PanelFrame>
  );
}

function RearLpf({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={800} height={260} title="LOW PASS FILTER" partNumber={partNumber}>
      <Coax x={100} y={135} label="RF IN" radius={19} />
      <rect x="145" y="92" width="510" height="86" rx="39" fill="#9ba5a4" stroke="#38474a" strokeWidth="4" />
      {[220, 300, 380, 460, 540, 620].map((x) => <path key={x} d={`M${x} 98v74`} stroke="#d6dcda" strokeWidth="5" />)}
      <Coax x={700} y={135} label="RF OUT" radius={19} />
      <text className={styles.faceplateSmallLabel} x="400" y="213" textAnchor="middle">HARMONIC FILTER · COMMON ANTENNA PATH</text>
    </PanelFrame>
  );
}

function RearVswr({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={690} height={330} title="VSWR MONITOR" partNumber={partNumber}>
      <rect x="120" y="88" width="450" height="160" rx="8" fill="#8f9999" stroke="#374548" strokeWidth="4" />
      <rect className={styles.faceplateConnector} x="145" y="128" width="75" height="42" rx="3" />
      <rect className={styles.faceplateConnector} x="145" y="190" width="75" height="42" rx="3" />
      <text className={styles.faceplateSmallLabel} x="182" y="118" textAnchor="middle">PL1 · MON 1</text>
      <text className={styles.faceplateSmallLabel} x="182" y="255" textAnchor="middle">PL2 · MON 2</text>
      <Coax x={485} y={139} label="J1 · FORWARD" radius={17} />
      <Coax x={485} y={210} label="J2 · REVERSE" radius={17} labelBelow />
      <path d="M230 149h220M230 211h220" stroke="#334245" strokeWidth="4" />
      <text className={styles.faceplateSmallLabel} x="345" y="292" textAnchor="middle">DME 320 · FORWARD / REVERSE INPUTS ATTENUATED 10 dB</text>
    </PanelFrame>
  );
}

function RearLightning({ partNumber }: { partNumber?: string }) {
  return (
    <PanelFrame width={430} height={360} title="LIGHTNING ARRESTER" partNumber={partNumber}>
      <Coax x={215} y={100} label="RF IN" radius={19} />
      <rect x="168" y="140" width="94" height="105" rx="14" fill="#939e9d" stroke="#374548" strokeWidth="4" />
      <path d="m222 152-31 50h25l-10 34 34-54h-25Z" fill="#e2b638" stroke="#684f13" strokeWidth="2" />
      <Coax x={215} y={290} label="RF OUT" radius={19} labelBelow />
      <path d="M263 210h75v30m-18 0h36m-30 12h24m-18 12h12" fill="none" stroke="#263438" strokeWidth="4" />
      <text className={styles.faceplateSmallLabel} x="332" y="198" textAnchor="middle">EARTH</text>
    </PanelFrame>
  );
}

function GenericRearRf({ title, partNumber }: { title: string; partNumber?: string }) {
  return (
    <PanelFrame width={680} height={300} title={title} partNumber={partNumber}>
      <rect x="110" y="86" width="460" height="135" rx="10" fill="#8f9999" stroke="#374548" strokeWidth="4" />
      <Coax x={155} y={154} label="RF IN" radius={18} />
      <Coax x={525} y={154} label="RF OUT" radius={18} />
      <path d="M205 154h270m-28-14 28 14-28 14" fill="none" stroke="#263438" strokeWidth="6" />
      <text className={styles.faceplateSmallLabel} x="340" y="260" textAnchor="middle">REAR-CABINET RF ASSEMBLY</text>
    </PanelFrame>
  );
}

function RearRfFaceplate({ blockId, partNumber }: { blockId: Dme320BlockId; partNumber?: string }) {
  switch (blockId) {
    case "dpx-msc": return <RearDpx partNumber={partNumber} />;
    case "rf-detector": return <RearRfDetector partNumber={partNumber} />;
    case "circulator": return <RearCirculator partNumber={partNumber} />;
    case "directional-coupler": return <RearCoupler partNumber={partNumber} />;
    case "coaxial-relay": return <RearRelay partNumber={partNumber} />;
    case "dummy-load": return <RearDummyLoad partNumber={partNumber} />;
    case "lpf": return <RearLpf partNumber={partNumber} />;
    case "vswr-monitor": return <RearVswr partNumber={partNumber} />;
    case "lightning-arrester": return <RearLightning partNumber={partNumber} />;
    default: {
      const block = DME_320_BLOCK_BY_ID.get(blockId);
      return <GenericRearRf title={block?.shortName ?? "REAR RF MODULE"} partNumber={partNumber} />;
    }
  }
}

export function Dme320ModuleFaceplate({ kind, blockId }: Dme320ModuleFaceplateProps) {
  const partNumber = DME_320_BLOCK_BY_ID.get(blockId)?.partNumber;
  switch (kind) {
    case "lmi": return <LmiFaceplate partNumber={partNumber} />;
    case "csp": return <CspFaceplate partNumber={partNumber} />;
    case "scu": return <ScuFaceplate partNumber={partNumber} />;
    case "emu": return <EmuFaceplate partNumber={partNumber} />;
    case "rxu": return <RxuFaceplate partNumber={partNumber} />;
    case "hpa": return <HpaFaceplate partNumber={partNumber} />;
    case "txu": return <TxuFaceplate partNumber={partNumber} />;
    case "dcdc": return <DcdcFaceplate partNumber={partNumber} auxiliary={false} />;
    case "tcu": return <TcuFaceplate partNumber={partNumber} />;
    case "mon": return <MonFaceplate partNumber={partNumber} />;
    case "rfg": return <RfgFaceplate partNumber={partNumber} />;
    case "dcdc-a": return <DcdcFaceplate partNumber={partNumber} auxiliary />;
    case "fan": return <FanFaceplate partNumber={partNumber} />;
    case "pmu": return <PmuFaceplate partNumber={partNumber} />;
    case "acdc": return <AcdcFaceplate partNumber={partNumber} />;
    case "ifb": return <IfbFaceplate partNumber={partNumber} />;
    case "rear-rf": return <RearRfFaceplate blockId={blockId} partNumber={partNumber} />;
  }
}
