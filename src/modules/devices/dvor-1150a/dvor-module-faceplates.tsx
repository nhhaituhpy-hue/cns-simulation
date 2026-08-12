import type { DvorBlockId } from "./block-diagram-data";
import styles from "./dvor-module-faceplates.module.css";

interface FaceplateRow {
  label: string;
  id: string;
  y: number;
  kind?: "test-point" | "trim";
  trimAngle?: number;
}

type LampColor = "green" | "amber" | "red" | "off";

interface LabelLinesProps {
  x: number;
  y: number;
  lines: readonly string[];
  anchor?: "start" | "middle" | "end";
  className?: string;
  lineHeight?: number;
}

const rebuiltModuleIds: ReadonlySet<DvorBlockId> = new Set([
  "audio-generator",
  "bcps",
  "carrier-amplifier",
  "monitor-cca",
  "rf-monitor",
  "rms",
  "sideband",
  "synthesizer",
]);

function FaceplateDefs() {
  return (
    <defs>
      <linearGradient id="sideband-panel-metal" x1="0" x2="1">
        <stop offset="0" stopColor="#aeb5b6" />
        <stop offset="0.035" stopColor="#f5f7f6" />
        <stop offset="0.18" stopColor="#d5d9d8" />
        <stop offset="0.5" stopColor="#f3f5f4" />
        <stop offset="0.82" stopColor="#c7cccb" />
        <stop offset="0.97" stopColor="#f6f8f7" />
        <stop offset="1" stopColor="#a1aaac" />
      </linearGradient>
      <linearGradient id="sideband-handle-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f8f9f8" />
        <stop offset="0.45" stopColor="#c4c9c8" />
        <stop offset="1" stopColor="#919a9c" />
      </linearGradient>
      <radialGradient id="sideband-jack-metal" cx="35%" cy="28%">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.42" stopColor="#d5d9d8" />
        <stop offset="0.76" stopColor="#899396" />
        <stop offset="1" stopColor="#eef0ef" />
      </radialGradient>
      <radialGradient id="sideband-trim-metal" cx="34%" cy="28%">
        <stop offset="0" stopColor="#f8faf9" />
        <stop offset="0.55" stopColor="#c4cac9" />
        <stop offset="1" stopColor="#778286" />
      </radialGradient>
      <radialGradient id="sideband-screw-metal" cx="35%" cy="28%">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.45" stopColor="#d3d8d7" />
        <stop offset="1" stopColor="#7f898c" />
      </radialGradient>
      <radialGradient id="sideband-led-green" cx="35%" cy="30%">
        <stop offset="0" stopColor="#baffc9" />
        <stop offset="0.45" stopColor="#35da63" />
        <stop offset="1" stopColor="#087b2d" />
      </radialGradient>
      <radialGradient id="faceplate-led-amber" cx="35%" cy="30%">
        <stop offset="0" stopColor="#fff2a6" />
        <stop offset="0.45" stopColor="#ffc83d" />
        <stop offset="1" stopColor="#b76d00" />
      </radialGradient>
      <radialGradient id="faceplate-led-red" cx="35%" cy="30%">
        <stop offset="0" stopColor="#ffd5d5" />
        <stop offset="0.45" stopColor="#f05454" />
        <stop offset="1" stopColor="#a20f1c" />
      </radialGradient>
      <radialGradient id="faceplate-led-off" cx="35%" cy="30%">
        <stop offset="0" stopColor="#d7dddd" />
        <stop offset="0.48" stopColor="#7c8789" />
        <stop offset="1" stopColor="#394448" />
      </radialGradient>
      <linearGradient id="faceplate-black-handle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1b2022" />
        <stop offset="0.18" stopColor="#4a5051" />
        <stop offset="0.5" stopColor="#171b1d" />
        <stop offset="0.82" stopColor="#555b5c" />
        <stop offset="1" stopColor="#14191b" />
      </linearGradient>
      <pattern id="sideband-brush" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 1H6M0 4H6" stroke="#fff" strokeWidth="0.45" opacity="0.18" />
        <path d="M0 2.5H6" stroke="#536064" strokeWidth="0.35" opacity="0.08" />
      </pattern>
      <filter id="sideband-panel-shadow" x="-30%" y="-10%" width="160%" height="125%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#142126" floodOpacity="0.34" />
      </filter>
      <filter id="sideband-led-glow" x="-150%" y="-150%" width="400%" height="400%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#27ce59" floodOpacity="0.72" />
      </filter>
      <filter id="faceplate-led-amber-glow" x="-150%" y="-150%" width="400%" height="400%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffc229" floodOpacity="0.65" />
      </filter>
      <filter id="faceplate-led-red-glow" x="-150%" y="-150%" width="400%" height="400%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ee3545" floodOpacity="0.68" />
      </filter>
    </defs>
  );
}

function LabelLines({ x, y, lines, anchor = "start", className = styles.controlLabel, lineHeight = 19 }: LabelLinesProps) {
  const firstLineY = y - ((lines.length - 1) * lineHeight) / 2;

  return (
    <text x={x} y={firstLineY} textAnchor={anchor} className={className}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>
      ))}
    </text>
  );
}

function PanelFrame({ width, height = 1640 }: { width: number; height?: number }) {
  return (
    <g aria-hidden>
      <rect x="18" y="12" width={width - 36} height={height - 24} rx="5" fill="#273338" opacity="0.34" filter="url(#sideband-panel-shadow)" />
      <rect x="18" y="12" width={width - 36} height={height - 24} rx="5" fill="url(#sideband-panel-metal)" stroke="#3f4d52" strokeWidth="2.5" />
      <rect x="25" y="20" width={width - 50} height={height - 50} rx="2" fill="url(#sideband-brush)" stroke="#f9fbfa" strokeWidth="1.2" opacity="0.95" />
      <path d={`M31 26V${height - 37}M${width - 31} 26V${height - 37}`} stroke="#7f898c" strokeWidth="1" opacity="0.68" />
    </g>
  );
}

function PartNumber({ width, value, y = 1574 }: { width: number; value: string; y?: number }) {
  const plateWidth = Math.min(250, width - 80);
  return (
    <g>
      <rect x={(width - plateWidth) / 2} y={y} width={plateWidth} height="29" rx="3" fill="#26343a" opacity="0.94" />
      <text x={width / 2} y={y + 20} textAnchor="middle" className={styles.partNumber}>{value}</text>
    </g>
  );
}

const sidebandUpperRows: readonly FaceplateRow[] = [
  { label: "SB1 PHS DET", id: "TP1", y: 240 },
  { label: "SB1 FWD PWR", id: "TP2", y: 290 },
  { label: "SB1/CSB PHS", id: "TP3", y: 340 },
  { label: "MEAN/DYN PHS", id: "TP4", y: 390 },
  { label: "PHS ERROR", id: "TP5", y: 440 },
  { label: "PHS OFFSET", id: "R1", y: 510, kind: "trim", trimAngle: -32 },
  { label: "PWR CAL", id: "R2", y: 560, kind: "trim", trimAngle: 18 },
  { label: "PWR ADJ", id: "R3", y: 610, kind: "trim", trimAngle: -12 },
];

const sidebandLowerRows: readonly FaceplateRow[] = [
  { label: "SB1/2 PHS DIFF", id: "TP6", y: 735 },
  { label: "SB2 PHS DET", id: "TP7", y: 785 },
  { label: "SB2 FWD PWR", id: "TP8", y: 835 },
  { label: "SB2/CSB PHS", id: "TP9", y: 1035 },
  { label: "MEAN/DYN PHS", id: "TP10", y: 1085 },
  { label: "PHS ERROR", id: "TP11", y: 1135 },
  { label: "PHS OFFSET", id: "R4", y: 1210, kind: "trim", trimAngle: 28 },
  { label: "PWR CAL", id: "R5", y: 1260, kind: "trim", trimAngle: -24 },
  { label: "PWR ADJ", id: "R6", y: 1310, kind: "trim", trimAngle: 12 },
  { label: "GND", id: "TP0", y: 1380 },
];

function PanelScrew({ x, y, size = 13, angle = 0 }: { x: number; y: number; size?: number; angle?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} aria-hidden>
      <circle r={size} fill="url(#sideband-screw-metal)" stroke="#586366" strokeWidth="1.5" />
      <circle r={size - 3} fill="none" stroke="#f8faf9" strokeWidth="1" opacity="0.8" />
      <path d={`M-${size - 5} 0H${size - 5}M0 -${size - 5}V${size - 5}`} stroke="#263236" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M-${size - 7} -1H${size - 5}`} stroke="#fff" strokeWidth="1" opacity="0.75" />
    </g>
  );
}

function TestPoint({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r="15" fill="#626b6d" opacity="0.22" />
      <circle r="13" fill="url(#sideband-jack-metal)" stroke="#435055" strokeWidth="1.5" />
      <circle r="9" fill="#20292c" stroke="#f5f7f6" strokeWidth="1.2" />
      <circle r="5.5" fill="#bfc6c5" stroke="#4a5558" strokeWidth="1" />
      <circle r="2.4" fill="#111719" />
      <path d="M-8.5 -8.5A12 12 0 0 1 6 -11" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.75" />
    </g>
  );
}

function TrimPot({ x, y, angle = 0 }: { x: number; y: number; angle?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r="14" fill="#566164" opacity="0.2" />
      <circle r="12.5" fill="url(#sideband-trim-metal)" stroke="#4c585c" strokeWidth="1.4" />
      <circle r="8.5" fill="none" stroke="#8b9698" strokeWidth="1" strokeDasharray="1.5 2" />
      <path d="M-5.5 0H5.5" transform={`rotate(${angle})`} stroke="#263236" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-4.5 -1H4.5" transform={`rotate(${angle})`} stroke="#fff" strokeWidth="0.9" opacity="0.68" />
    </g>
  );
}

function IndicatorLamp({ x, y, color = "green", size = 11 }: { x: number; y: number; color?: LampColor; size?: number }) {
  const fill = color === "green"
    ? "url(#sideband-led-green)"
    : color === "amber"
      ? "url(#faceplate-led-amber)"
      : color === "red"
        ? "url(#faceplate-led-red)"
        : "url(#faceplate-led-off)";
  const stroke = color === "green" ? "#1d6f37" : color === "amber" ? "#936500" : color === "red" ? "#7f1520" : "#3c484b";
  const filter = color === "green"
    ? "url(#sideband-led-glow)"
    : color === "amber"
      ? "url(#faceplate-led-amber-glow)"
      : color === "red"
        ? "url(#faceplate-led-red-glow)"
        : undefined;

  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r={size} fill="#273236" stroke="#657176" strokeWidth="1.5" />
      <circle r={size - 4} fill={fill} stroke={stroke} strokeWidth="1" filter={filter} />
      <circle cx={-size * 0.22} cy={-size * 0.24} r={size * 0.18} fill="#f4fffa" opacity="0.82" />
    </g>
  );
}

function ExtractionHandle({ bottom = false, width = 360 }: { bottom?: boolean; width?: number }) {
  const offset = (width - 360) / 2;
  const group = (
    <g transform={`translate(${offset} 0)`} aria-hidden>
      <path d="M119 43V32Q119 25 127 25H142Q150 25 150 32V43" fill="none" stroke="#4d595d" strokeWidth="3" />
      <rect x="100" y="43" width="142" height="92" rx="4" fill="url(#sideband-handle-metal)" stroke="#4b585c" strokeWidth="2" />
      <rect x="109" y="53" width="124" height="72" rx="2" fill="#d9dddc" stroke="#788184" strokeWidth="1.3" />
      <path d="M112 57H230" stroke="#fff" strokeWidth="2" opacity="0.78" />
      <path d="M234 62V116" stroke="#a5acad" strokeWidth="2" opacity="0.75" />
      <PanelScrew x={260} y={89} size={13} />
      <PanelScrew x={271} y={30} size={11} angle={28} />
    </g>
  );

  return bottom ? <g transform="translate(0 1640) scale(1 -1)">{group}</g> : group;
}

function RoundConnector({ x, y, radius = 23 }: { x: number; y: number; radius?: number }) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 6;
    return `${(Math.cos(angle) * (radius + 6)).toFixed(2)},${(Math.sin(angle) * (radius + 6)).toFixed(2)}`;
  }).join(" ");

  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <polygon points={points} fill="#b9c0c0" stroke="#475357" strokeWidth="1.8" />
      <circle r={radius} fill="url(#sideband-jack-metal)" stroke="#465256" strokeWidth="1.8" />
      <circle r={radius - 7} fill="#e6e9e8" stroke="#697477" strokeWidth="1.4" />
      <circle r={radius - 13} fill="#222a2d" stroke="#f7f9f8" strokeWidth="1.3" />
      <circle r="3.2" fill="#cbd1d0" />
    </g>
  );
}

function UsbConnector({ x, y, width = 54, height = 64 }: { x: number; y: number; width?: number; height?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx="3" fill="#40494c" stroke="#1d272a" strokeWidth="2" />
      <rect x={-width / 2 + 6} y={-height / 2 + 7} width={width - 12} height={height - 14} rx="2" fill="#d8dcdb" stroke="#7f898b" strokeWidth="1.4" />
      <rect x={-width / 2 + 12} y={-height / 2 + 12} width={width - 24} height={height - 24} rx="1" fill="#1d2528" />
      <path d={`M${-width / 2 + 16} ${-height / 2 + 18}H${width / 2 - 16}`} stroke="#d8b970" strokeWidth="3" strokeDasharray="4 3" />
    </g>
  );
}

function PushButton({ x, y, size = 15 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r={size} fill="#596467" opacity="0.22" />
      <circle r={size - 2} fill="url(#sideband-jack-metal)" stroke="#485559" strokeWidth="1.5" />
      <circle r={size - 7} fill="#263135" stroke="#f1f4f3" strokeWidth="1" />
    </g>
  );
}

function CarrierHandle() {
  return (
    <g aria-hidden>
      <path d="M226 501Q226 479 247 479H303Q324 479 324 501V1123Q324 1145 303 1145H247Q226 1145 226 1123Z" fill="#171c1e" opacity="0.22" />
      <path d="M240 505Q240 493 253 493H297Q310 493 310 505V1112Q310 1125 297 1125H253Q240 1125 240 1112Z" fill="url(#faceplate-black-handle)" stroke="#080b0c" strokeWidth="3" />
      <path d="M251 510V1108" stroke="#707779" strokeWidth="3" opacity="0.65" />
      <path d="M299 510V1108" stroke="#050708" strokeWidth="3" opacity="0.82" />
      <path d="M249 495Q275 476 301 495M249 1124Q275 1143 301 1124" fill="none" stroke="#82898a" strokeWidth="3" />
    </g>
  );
}

function FaceplateRow({ row }: { row: FaceplateRow }) {
  return (
    <g>
      <text x="205" y={row.y} textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>{row.label}</text>
      {row.kind === "trim" ? <TrimPot x={229} y={row.y} angle={row.trimAngle} /> : <TestPoint x={229} y={row.y} />}
      <text x="254" y={row.y} dominantBaseline="middle" className={styles.controlId}>{row.id}</text>
    </g>
  );
}

function BcpsFaceplate() {
  const statusRows: readonly { lines: readonly string[]; y: number; color: LampColor }[] = [
    { lines: ["AC ON"], y: 222, color: "green" },
    { lines: ["DC ON"], y: 273, color: "green" },
    { lines: ["AC FAIL"], y: 324, color: "red" },
    { lines: ["BATTERY", "FAULT"], y: 376, color: "red" },
    { lines: ["ON", "BATTERY"], y: 432, color: "amber" },
    { lines: ["FAST", "CHARGE"], y: 488, color: "amber" },
    { lines: ["TRICKLE", "CHARGE"], y: 547, color: "green" },
  ];

  return (
    <svg className={`${styles.faceplate} ${styles.faceplateWide}`} viewBox="0 0 540 1640" role="img" aria-labelledby="bcps-title" aria-describedby="bcps-description">
      <title id="bcps-title">Mặt panel Battery Charging Power Supply DVOR 1150A</title>
      <desc id="bcps-description">Mặt panel vector theo Figure 3-64 với bảy đèn trạng thái, nút Charger Reset và đèn CPU OK.</desc>
      <FaceplateDefs />
      <PanelFrame width={540} />
      <ExtractionHandle width={540} />

      <g>
        {statusRows.map((row) => (
          <g key={row.lines.join("-")}>
            <LabelLines x={176} y={row.y} lines={row.lines} anchor="end" lineHeight={17} />
            <IndicatorLamp x={200} y={row.y} color={row.color} />
          </g>
        ))}
        <path d="M236 202H258V344L239 365L258 386V544L237 565" fill="none" stroke="#556164" strokeWidth="2" />
        <LabelLines x={280} y={284} lines={["POWER", "STATUS"]} className={styles.groupLabel} lineHeight={22} />
        <LabelLines x={280} y={450} lines={["CHARGER", "STATUS"]} className={styles.groupLabel} lineHeight={22} />
        <IndicatorLamp x={326} y={520} color="green" size={15} />
      </g>

      <g>
        <rect x="282" y="81" width="223" height="80" rx="3" fill="#d0d5d4" stroke="#6c7779" />
        <path d="M298 92L315 108L298 124L281 108Z" fill="#f2c84a" stroke="#293336" strokeWidth="2" />
        <text x="298" y="114" textAnchor="middle" className={styles.warningMark}>!</text>
        <LabelLines x={326} y={118} lines={["WARNING: TURN OFF", "AC POWER BEFORE", "REMOVING MODULE"]} className={styles.warningLabel} lineHeight={19} />
      </g>

      <PanelScrew x={240} y={733} size={13} angle={12} />
      <PanelScrew x={240} y={945} size={13} angle={42} />
      <PanelScrew x={326} y={1108} size={14} angle={18} />

      <LabelLines x={176} y={1278} lines={["S1", "CHARGER RESET"]} anchor="end" lineHeight={18} />
      <PushButton x={200} y={1278} />
      <text x="176" y="1366" textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>CPU OK</text>
      <IndicatorLamp x={200} y={1366} color="green" />

      <ExtractionHandle bottom width={540} />
      <PartNumber width={540} value="571150A-0002-046" />
    </svg>
  );
}

function CarrierAmplifierFaceplate() {
  return (
    <svg className={`${styles.faceplate} ${styles.faceplatePower}`} viewBox="0 0 580 1640" role="img" aria-labelledby="carrier-title" aria-describedby="carrier-description">
      <title id="carrier-title">Mặt panel Carrier Amplifier DVOR 1150A</title>
      <desc id="carrier-description">Mặt panel vector theo Figure 3-65, đúng tỷ lệ card công suất, gồm CSB Sample P1, tay kéo, Detected CSB và DC Power OK.</desc>
      <FaceplateDefs />
      <PanelFrame width={580} />

      <g aria-hidden>
        <circle cx="420" cy="82" r="46" fill="#202628" opacity="0.22" />
        <circle cx="420" cy="76" r="40" fill="url(#sideband-handle-metal)" stroke="#4c575a" strokeWidth="2.5" />
        <circle cx="420" cy="76" r="25" fill="#cfd4d3" stroke="#737d80" strokeWidth="1.5" />
        <path d="M405 62L435 90M435 62L405 90" stroke="#303a3d" strokeWidth="4" strokeLinecap="round" />
      </g>
      <PanelScrew x={276} y={96} size={13} angle={0} />

      <LabelLines x={355} y={225} lines={["CSB SAMPLE", "100 - 300 mW", "AT 100 W"]} anchor="end" className={styles.powerLabel} lineHeight={27} />
      <RoundConnector x={407} y={225} radius={20} />
      <text x="445" y="232" className={styles.powerId}>P1</text>
      <path d="M407 248C448 276 447 331 418 345" fill="none" stroke="#384448" strokeWidth="2" strokeDasharray="5 5" />
      <PanelScrew x={407} y={350} size={13} angle={20} />
      <PanelScrew x={222} y={424} size={13} angle={14} />
      <PanelScrew x={310} y={464} size={13} angle={0} />
      <circle cx="438" cy="510" r="26" fill="#151a1c" stroke="#060809" strokeWidth="2" />

      <CarrierHandle />
      <PanelScrew x={222} y={824} size={13} angle={8} />
      <PanelScrew x={310} y={1190} size={13} angle={0} />
      <PanelScrew x={222} y={1236} size={13} angle={0} />

      <text x="340" y="1360" textAnchor="end" dominantBaseline="middle" className={styles.powerLabel}>DETECTED CSB</text>
      <RoundConnector x={414} y={1360} radius={28} />
      <text x="340" y="1450" textAnchor="end" dominantBaseline="middle" className={styles.powerLabel}>DC POWER OK</text>
      <IndicatorLamp x={386} y={1450} color="green" size={12} />

      <g aria-hidden>
        <circle cx="420" cy="1541" r="40" fill="url(#sideband-handle-metal)" stroke="#4c575a" strokeWidth="2.5" />
        <circle cx="420" cy="1541" r="25" fill="#cfd4d3" stroke="#737d80" strokeWidth="1.5" />
        <path d="M405 1527L435 1555M435 1527L405 1555" stroke="#303a3d" strokeWidth="4" strokeLinecap="round" />
      </g>
      <PanelScrew x={276} y={1541} size={13} angle={22} />
      <PartNumber width={580} value="571150A-0002-047" />
    </svg>
  );
}

function AlarmGroup({ x, y, heading, colors }: { x: number; y: number; heading: string; colors: readonly LampColor[] }) {
  const rows = ["PRIMARY", "SECONDARY", "PRE ALARM"];
  return (
    <g>
      <path d={`M${x} ${y + 13}H${x - 17}V${y + 149}H${x}`} fill="none" stroke="#536064" strokeWidth="2" />
      <text x={x + 7} y={y} className={styles.groupLabel}>{heading}</text>
      {rows.map((row, index) => {
        const rowY = y + 43 + index * 45;
        return (
          <g key={row}>
            <IndicatorLamp x={x + 2} y={rowY} color={colors[index]} size={10} />
            <LabelLines x={x + 28} y={rowY} lines={row === "PRE ALARM" ? ["PRE ALARM"] : [row, "ALARM"]} lineHeight={17} />
          </g>
        );
      })}
    </g>
  );
}

function MonitorFaceplate() {
  return (
    <svg className={`${styles.faceplate} ${styles.faceplateNarrow}`} viewBox="0 0 360 1640" role="img" aria-labelledby="monitor-title" aria-describedby="monitor-description">
      <title id="monitor-title">Mặt panel Monitor CCA DVOR 1150A</title>
      <desc id="monitor-description">Mặt panel vector theo Figure 3-66, gồm hai nhóm alarm Integral và Standby, cổng Test J3, Sync J2 và đèn CPU OK.</desc>
      <FaceplateDefs />
      <PanelFrame width={360} />
      <ExtractionHandle />

      <AlarmGroup x={92} y={226} heading="INTEGRAL" colors={["red", "amber", "amber"]} />
      <AlarmGroup x={92} y={430} heading="STANDBY" colors={["off", "off", "off"]} />

      <text x="180" y="804" textAnchor="middle" className={styles.connectorLabel}>TEST</text>
      <RoundConnector x={180} y={850} radius={30} />
      <text x="230" y="858" className={styles.controlId}>J3</text>
      <text x="180" y="972" textAnchor="middle" className={styles.connectorLabel}>SYNC</text>
      <RoundConnector x={180} y={1018} radius={30} />
      <text x="230" y="1026" className={styles.controlId}>J2</text>

      <IndicatorLamp x={132} y={1165} color="green" />
      <text x="157" y="1171" className={styles.controlLabel}>CPU OK</text>

      <ExtractionHandle bottom />
      <PartNumber width={360} value="571150A-0002-048" />
    </svg>
  );
}

function RmsFaceplate() {
  return (
    <svg className={`${styles.faceplate} ${styles.faceplateMedium}`} viewBox="0 0 440 1640" role="img" aria-labelledby="rms-title" aria-describedby="rms-description">
      <title id="rms-title">Mặt panel Remote Monitoring System CCA DVOR 1150A</title>
      <desc id="rms-description">Mặt panel vector theo Figure 3-67, đã loại bỏ các mũi tên callout ngoài panel và giữ cổng AUX USB J2, PMDT USB J1 cùng hai đèn trạng thái.</desc>
      <FaceplateDefs />
      <PanelFrame width={440} />
      <ExtractionHandle width={440} />
      <PanelScrew x={138} y={712} size={13} angle={45} />
      <PanelScrew x={138} y={930} size={13} angle={-36} />

      <text x="88" y="1040" className={styles.connectorLabel}>AUX USB</text>
      <UsbConnector x={122} y={1092} width={56} height={78} />
      <text x="162" y="1100" className={styles.controlId}>J2</text>

      <text x="88" y="1245" className={styles.connectorLabel}>PMDT USB</text>
      <UsbConnector x={130} y={1303} width={75} height={69} />
      <text x="178" y="1312" className={styles.controlId}>J1</text>

      <IndicatorLamp x={104} y={1388} color="green" />
      <text x="130" y="1394" className={styles.controlLabel}>CPU OK</text>
      <IndicatorLamp x={104} y={1443} color="green" />
      <text x="130" y="1449" className={styles.controlLabel}>PWR OK</text>

      <ExtractionHandle bottom width={440} />
      <PartNumber width={440} value="571150A-0002-049" />
    </svg>
  );
}

function SynthesizerFaceplate() {
  const points = [
    { label: "PHASE ERROR", id: "TP1", y: 340 },
    { label: "PHASE OFFSET", id: "TP2", y: 400 },
    { label: "SB/CSB PHASE", id: "TP3", y: 460 },
    { label: "GND", id: "TP0", y: 570 },
  ];
  return (
    <svg className={`${styles.faceplate} ${styles.faceplateMedium}`} viewBox="0 0 420 1640" role="img" aria-labelledby="synth-title" aria-describedby="synth-description">
      <title id="synth-title">Mặt panel Synthesizer CCA DVOR 1150A</title>
      <desc id="synth-description">Mặt panel vector theo Figure 3-69 gồm TP1 đến TP3, TP0 Ground, Frequency Sample J2 và đèn Power OK.</desc>
      <FaceplateDefs />
      <PanelFrame width={420} />
      <ExtractionHandle width={420} />

      {points.map((point) => (
        <g key={point.id}>
          <text x="220" y={point.y} textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>{point.label}</text>
          <TestPoint x={246} y={point.y} />
          <text x="276" y={point.y} dominantBaseline="middle" className={styles.controlId}>{point.id}</text>
        </g>
      ))}

      <LabelLines x={205} y={720} lines={["FREQ", "SAMPLE"]} anchor="end" lineHeight={20} />
      <RoundConnector x={246} y={720} radius={24} />
      <text x="286" y="728" className={styles.controlId}>J2</text>
      <PanelScrew x={246} y={792} size={13} angle={10} />
      <PanelScrew x={290} y={970} size={13} angle={0} />

      <text x="220" y="1414" textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>PWR OK</text>
      <IndicatorLamp x={246} y={1414} color="green" />

      <ExtractionHandle bottom width={420} />
      <PartNumber width={420} value="571150A-0002-051" />
    </svg>
  );
}

function AudioGeneratorFaceplate() {
  const points: readonly { id: string; label: string; y: number }[] = [
    { id: "TP1", label: "CARRIER", y: 350 },
    { id: "TP2", label: "VOICE", y: 420 },
    { id: "TP3", label: "SYNC", y: 490 },
    { id: "TP0", label: "GND", y: 610 },
  ];
  return (
    <svg className={`${styles.faceplate} ${styles.faceplateNarrow}`} viewBox="0 0 340 1640" role="img" aria-labelledby="audio-title" aria-describedby="audio-description">
      <title id="audio-title">Mặt panel Audio Generator CCA DVOR 1150A</title>
      <desc id="audio-description">Mặt panel vector theo Figure 3-71 với TP1 Carrier, TP2 Voice, TP3 Sync, TP0 Ground và đèn CPU OK.</desc>
      <FaceplateDefs />
      <PanelFrame width={340} />
      <ExtractionHandle width={340} />

      {points.map((point) => (
        <g key={point.id}>
          <TestPoint x={135} y={point.y} />
          <text x="166" y={point.y - 7} className={styles.controlId}>{point.id}</text>
          <text x="166" y={point.y + 14} className={styles.controlLabel}>{point.label}</text>
        </g>
      ))}

      <PanelScrew x={135} y={760} size={13} angle={0} />
      <PanelScrew x={135} y={930} size={13} angle={0} />

      <IndicatorLamp x={130} y={1384} color="green" />
      <text x="156" y="1390" className={styles.controlLabel}>CPU OK</text>

      <ExtractionHandle bottom width={340} />
      <PartNumber width={340} value="571150A-0002-053" />
    </svg>
  );
}

function RfMonitorFaceplate() {
  const controls: readonly FaceplateRow[] = [
    { label: "CSB FWD ADJ", id: "R1", y: 280, kind: "trim", trimAngle: -24 },
    { label: "CSB RFL ADJ", id: "R2", y: 335, kind: "trim", trimAngle: 18 },
    { label: "STANDBY ADJ", id: "R3", y: 390, kind: "trim", trimAngle: -9 },
    { label: "CSB FWD", id: "TP1", y: 500 },
    { label: "CSB RFL", id: "TP2", y: 555 },
    { label: "STANDBY TX", id: "TP3", y: 610 },
    { label: "GND", id: "TP0", y: 665 },
  ];
  return (
    <svg className={`${styles.faceplate} ${styles.faceplateMedium}`} viewBox="0 0 390 1640" role="img" aria-labelledby="rf-monitor-title" aria-describedby="rf-monitor-description">
      <title id="rf-monitor-title">Mặt panel RF Monitor Assembly DVOR 1150A</title>
      <desc id="rf-monitor-description">Mặt panel vector theo Figure 3-73 gồm R1 đến R3, TP0 đến TP3 và đèn DC Power OK.</desc>
      <FaceplateDefs />
      <PanelFrame width={390} />
      <ExtractionHandle width={390} />

      {controls.map((row) => (
        <g key={row.id}>
          <text x="212" y={row.y} textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>{row.label}</text>
          {row.kind === "trim" ? <TrimPot x={238} y={row.y} angle={row.trimAngle} /> : <TestPoint x={238} y={row.y} />}
          <text x="268" y={row.y} dominantBaseline="middle" className={styles.controlId}>{row.id}</text>
        </g>
      ))}

      <PanelScrew x={238} y={735} size={13} angle={0} />
      <PanelScrew x={238} y={905} size={13} angle={0} />

      <text x="212" y="1400" textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>DC PWR OK</text>
      <IndicatorLamp x={238} y={1400} color="green" />

      <ExtractionHandle bottom width={390} />
      <PartNumber width={390} value="571150A-0002-055" />
    </svg>
  );
}

function SidebandFaceplate() {
  return (
    <svg
      className={styles.faceplate}
      viewBox="0 0 360 1640"
      role="img"
      aria-labelledby="sideband-faceplate-title"
      aria-describedby="sideband-faceplate-description"
    >
      <title id="sideband-faceplate-title">Mặt panel Sideband Generator DVOR 1150A</title>
      <desc id="sideband-faceplate-description">Mặt panel dựng lại dạng vector theo Figure 3-70, gồm TP0 đến TP11, R1 đến R6 và đèn DC PWR OK.</desc>
      <FaceplateDefs />

      <rect x="18" y="12" width="324" height="1606" rx="5" fill="#273338" opacity="0.34" filter="url(#sideband-panel-shadow)" />
      <rect x="18" y="12" width="324" height="1606" rx="5" fill="url(#sideband-panel-metal)" stroke="#3f4d52" strokeWidth="2.5" />
      <rect x="25" y="20" width="310" height="1590" rx="2" fill="url(#sideband-brush)" stroke="#f9fbfa" strokeWidth="1.2" opacity="0.95" />
      <path d="M31 26V1603M329 26V1603" stroke="#7f898c" strokeWidth="1" opacity="0.68" />

      <ExtractionHandle />

      <g aria-hidden>
        <rect x="39" y="194" width="282" height="445" rx="8" fill="#dae0df" opacity="0.34" stroke="#7d888b" strokeWidth="1" />
        <path d="M52 468H308" stroke="#8a9597" strokeWidth="1" opacity="0.65" />
        <path d="M52 470H308" stroke="#fff" strokeWidth="1" opacity="0.72" />
        <rect x="39" y="700" width="282" height="708" rx="8" fill="#d5dad9" opacity="0.3" stroke="#7d888b" strokeWidth="1" />
        <path d="M52 884H308M52 1168H308" stroke="#8a9597" strokeWidth="1" opacity="0.62" />
        <path d="M52 886H308M52 1170H308" stroke="#fff" strokeWidth="1" opacity="0.7" />
      </g>

      {sidebandUpperRows.map((row) => <FaceplateRow key={row.id} row={row} />)}
      <PanelScrew x={229} y={675} size={13} />
      {sidebandLowerRows.map((row) => <FaceplateRow key={row.id} row={row} />)}
      <PanelScrew x={229} y={920} size={13} />

      <text x="205" y="1440" textAnchor="end" dominantBaseline="middle" className={styles.controlLabel}>DC PWR OK</text>
      <IndicatorLamp x={229} y={1440} />

      <ExtractionHandle bottom />
      <rect x="72" y="1574" width="216" height="29" rx="3" fill="#26343a" opacity="0.94" />
      <text x="180" y="1594" textAnchor="middle" className={styles.partNumber}>571150A-0002-052</text>
    </svg>
  );
}

export function hasRebuiltModuleFaceplate(blockId: DvorBlockId): boolean {
  return rebuiltModuleIds.has(blockId);
}

export function DvorModuleFaceplate({ blockId }: { blockId: DvorBlockId }) {
  switch (blockId) {
    case "audio-generator":
      return <AudioGeneratorFaceplate />;
    case "bcps":
      return <BcpsFaceplate />;
    case "carrier-amplifier":
      return <CarrierAmplifierFaceplate />;
    case "monitor-cca":
      return <MonitorFaceplate />;
    case "rf-monitor":
      return <RfMonitorFaceplate />;
    case "rms":
      return <RmsFaceplate />;
    case "sideband":
      return <SidebandFaceplate />;
    case "synthesizer":
      return <SynthesizerFaceplate />;
    default:
      return null;
  }
}
