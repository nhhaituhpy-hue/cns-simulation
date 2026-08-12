import type { ReactNode } from "react";
import type {
  Dme1119aBlockId,
  Dme1119aFaceplateKind,
} from "./block-diagram-data";
import styles from "./dme-1119a-module-faceplates.module.css";

interface FaceplateProps {
  kind: Dme1119aFaceplateKind;
  blockId: Dme1119aBlockId;
}

type LedColor = "green" | "amber" | "red" | "off";

function FaceplateDefs() {
  return (
    <defs>
      <linearGradient id="dme-face-metal" x1="0" x2="1">
        <stop offset="0" stopColor="#79878b" /><stop offset="0.12" stopColor="#d9dfdd" /><stop offset="0.52" stopColor="#aab4b4" /><stop offset="0.88" stopColor="#e3e7e5" /><stop offset="1" stopColor="#69777c" />
      </linearGradient>
      <linearGradient id="dme-face-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#344148" /><stop offset="1" stopColor="#111b20" />
      </linearGradient>
      <radialGradient id="dme-face-green"><stop offset="0" stopColor="#dfffe7" /><stop offset="0.42" stopColor="#43e071" /><stop offset="1" stopColor="#08702d" /></radialGradient>
      <radialGradient id="dme-face-amber"><stop offset="0" stopColor="#fff4c3" /><stop offset="0.42" stopColor="#ffc843" /><stop offset="1" stopColor="#8b5b00" /></radialGradient>
      <radialGradient id="dme-face-red"><stop offset="0" stopColor="#ffd7d2" /><stop offset="0.42" stopColor="#ff604d" /><stop offset="1" stopColor="#8f160c" /></radialGradient>
      <radialGradient id="dme-face-off"><stop offset="0" stopColor="#8b9799" /><stop offset="1" stopColor="#303c40" /></radialGradient>
      <filter id="dme-face-led-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
  );
}

function Panel({ x, y, width, height, radius = 5 }: { x: number; y: number; width: number; height: number; radius?: number }) {
  return <rect className={styles.panel} x={x} y={y} width={width} height={height} rx={radius} />;
}

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.screw} aria-hidden>
      <circle cx={x} cy={y} r="8" /><path d={`M${x - 5} ${y + 5}l10-10`} />
    </g>
  );
}

function Led({ x, y, color = "green", label, anchor = "start" }: { x: number; y: number; color?: LedColor; label?: string; anchor?: "start" | "middle" | "end" }) {
  const gradient = `url(#dme-face-${color})`;
  return (
    <g className={styles.led} aria-hidden>
      <circle cx={x} cy={y} r="7.5" fill={gradient} data-lit={color !== "off" || undefined} />
      {label ? <text x={anchor === "start" ? x + 14 : anchor === "end" ? x - 14 : x} y={y + 4} textAnchor={anchor}>{label}</text> : null}
    </g>
  );
}

function Coax({ x, y, label, connector = "J1" }: { x: number; y: number; label: string; connector?: string }) {
  return (
    <g className={styles.coax} aria-hidden>
      <text x={x} y={y - 22} textAnchor="middle">{label}</text>
      <circle cx={x} cy={y} r="14" /><circle cx={x} cy={y} r="8" /><circle cx={x} cy={y} r="2.8" />
      <text x={x + 20} y={y + 4}>{connector}</text>
    </g>
  );
}

function HexConnector({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className={styles.hexConnector} aria-hidden>
      <text x={x} y={y - 20} textAnchor="middle">{label}</text>
      <path d={`M${x - 14} ${y}l7-12h14l7 12-7 12h-14z`} /><circle cx={x} cy={y} r="5" />
    </g>
  );
}

function Handle({ x, y, width = 60, height = 38 }: { x: number; y: number; width?: number; height?: number }) {
  return (
    <g className={styles.handle} aria-hidden>
      <rect x={x} y={y} width={width} height={height} rx="5" />
      <rect x={x + 8} y={y + 8} width={width - 16} height={height - 16} rx="3" />
    </g>
  );
}

function PushButton({ x, y, width = 56, height = 42, lines, lamp = "off" }: { x: number; y: number; width?: number; height?: number; lines: readonly string[]; lamp?: LedColor }) {
  return (
    <g className={styles.pushButton} aria-hidden>
      <rect x={x} y={y} width={width} height={height} rx="4" />
      <Led x={x + width - 10} y={y + 10} color={lamp} />
      <text x={x + width / 2} y={y + height / 2 - ((lines.length - 1) * 6)} textAnchor="middle">
        {lines.map((line, index) => <tspan key={line} x={x + width / 2} dy={index === 0 ? 0 : 12}>{line}</tspan>)}
      </text>
    </g>
  );
}

function LcuFaceplate() {
  const transmitterRows = ["MAIN SELECT", "ANTENNA", "LOAD", "OFF"] as const;
  const systemIndicators = ["MAINTENANCE ALERT", "REMOTE CONTROL FAULT", "BATTERY FAULT", "ON BATTERY", "INTERLOCKED OFF", "LCU POWER ON"] as const;
  return (
    <svg className={`${styles.faceplate} ${styles.lcuFaceplate}`} viewBox="0 0 1200 350" role="img" aria-label="Mặt trước Local Control Unit DME 1119A theo Figure 3-54">
      <FaceplateDefs /><Panel x={12} y={12} width={1176} height={326} radius={6} />
      <Screw x={36} y={55} /><Screw x={36} y={294} /><Screw x={1164} y={55} /><Screw x={1164} y={294} />

      <g className={styles.lcuDisplay} aria-hidden>
        <rect x="80" y="62" width="332" height="226" rx="7" />
        <text x="246" y="96">Integral Monitor 1</text>
        {[["Delay", "50.00 µs"], ["Spacing", "12.00 µs"], ["TX Power", "1000 W"], ["ERP", "31.2 dBW"], ["Eff", "99.6 %"], ["PRF", "2700"]].map(([label, value], index) => (
          <g key={label}><text x="116" y={130 + index * 23}>{label}</text><text x="360" y={130 + index * 23} textAnchor="end">{value}</text></g>
        ))}
        <rect x="100" y="248" width="72" height="25" rx="2" /><rect x="210" y="248" width="72" height="25" rx="2" /><rect x="320" y="248" width="72" height="25" rx="2" />
        <text x="136" y="266" textAnchor="middle">Prev</text><text x="246" y="266" textAnchor="middle">Main</text><text x="356" y="266" textAnchor="middle">Next</text>
      </g>

      <g aria-hidden>
        <rect className={styles.lcuGroup} x="446" y="44" width="204" height="264" rx="3" />
        <text className={styles.groupTitle} x="548" y="67">TRANSMITTER</text>
        {transmitterRows.map((label, index) => {
          const y = 88 + index * 55;
          return <g key={label}><PushButton x={464} y={y} width={48} height={39} lines={["1"]} lamp={index < 2 ? "green" : index === 3 ? "off" : "off"} /><text className={styles.rowLabel} x="548" y={y + 24} textAnchor="middle">{label}</text><PushButton x={584} y={y} width={48} height={39} lines={["2"]} lamp={index === 3 ? "red" : "off"} /></g>;
        })}
      </g>

      <g aria-hidden>
        <rect className={styles.lcuGroup} x="674" y="44" width="470" height="128" rx="3" />
        <text className={styles.groupTitle} x="909" y="65">MONITOR</text>
        <path className={styles.groupDivider} d="M909 73v88" />
        <text className={styles.subTitle} x="792" y="84">INTEGRAL</text><text className={styles.subTitle} x="1024" y="84">STANDBY</text>
        {[0, 1].map((row) => (
          <g key={row}>
            <text className={styles.monitorNumber} x="700" y={112 + row * 31}>{row + 1}</text>
            <Led x={728} y={108 + row * 31} color="green" /><Led x={777} y={108 + row * 31} color="off" /><Led x={826} y={108 + row * 31} color="off" />
            <text className={styles.monitorNumber} x="932" y={112 + row * 31}>{row + 1}</text>
            <Led x={960} y={108 + row * 31} color="green" /><Led x={1009} y={108 + row * 31} color="off" /><Led x={1058} y={108 + row * 31} color="off" />
          </g>
        ))}
        <text className={styles.tinyLabel} x="728" y="98" textAnchor="middle">NORMAL</text><text className={styles.tinyLabel} x="777" y="98" textAnchor="middle">PRIMARY</text><text className={styles.tinyLabel} x="826" y="98" textAnchor="middle">SECONDARY</text>
        <text className={styles.tinyLabel} x="960" y="98" textAnchor="middle">NORMAL</text><text className={styles.tinyLabel} x="1009" y="98" textAnchor="middle">PRIMARY</text><text className={styles.tinyLabel} x="1058" y="98" textAnchor="middle">SECONDARY</text>
        <PushButton x={846} y={101} width={48} height={42} lines={["BYPASS"]} lamp="off" /><PushButton x={1078} y={101} width={48} height={42} lines={["BYPASS"]} lamp="off" />
      </g>

      <g aria-hidden>
        <rect className={styles.lcuGroup} x="674" y="184" width="470" height="124" rx="3" />
        <text className={styles.groupTitle} x="909" y="205">SYSTEM</text>
        <PushButton x={700} y={220} width={62} height={36} lines={["LOCAL", "CONTROL"]} lamp="green" />
        <PushButton x={780} y={220} width={62} height={36} lines={["LAMP", "TEST"]} />
        <PushButton x={700} y={264} width={62} height={36} lines={["ALARM", "SILENCE"]} />
        <PushButton x={780} y={264} width={62} height={36} lines={["RESET"]} />
        {systemIndicators.map((label, index) => <Led key={label} x={877} y={225 + index * 14} color={index === 5 ? "green" : "off"} label={label} />)}
        <g className={styles.volumePot}><circle cx="1112" cy="282" r="13" /><path d="M1104 290l16-16" /><text x="1112" y="263" textAnchor="middle">VOLUME</text></g>
      </g>
      <text className={styles.partNumber} x="26" y="330">571118A-0001-032 · FIGURE 3-54 RECONSTRUCTION</text>
    </svg>
  );
}

function TallPanelShell({ children, label, partNumber, width = 260 }: { children: ReactNode; label: string; partNumber: string; width?: number }) {
  return (
    <svg className={`${styles.faceplate} ${styles.tallFaceplate}`} style={{ maxWidth: `${width}px` }} viewBox="0 0 260 820" role="img" aria-label={label}>
      <FaceplateDefs /><Panel x={12} y={12} width={236} height={796} /><Screw x={130} y={38} /><Screw x={130} y={782} />
      <Handle x={94} y={56} width={72} height={50} />
      {children}
      <text className={styles.partNumber} x="130" y="800" textAnchor="middle">{partNumber}</text>
    </svg>
  );
}

function HpaFaceplate({ tx }: { tx: 1 | 2 }) {
  return (
    <TallPanelShell label={`Mặt trước High Power Amplifier TX${tx}`} partNumber="FIGURE 3-62 · 571118A-0001-040" width={300}>
      <text className={styles.moduleTitle} x="130" y="142" textAnchor="middle">HIGH POWER AMPLIFIER</text>
      <text className={styles.moduleSubtitle} x="130" y="164" textAnchor="middle">{tx === 1 ? "1A3 · TX1" : "1A7 · TX2"}</text>
      <Coax x={130} y={236} label="DETECTOR" connector="J1" />
      <Led x={130} y={310} color="green" label="PWR OK" anchor="middle" />
      <g className={styles.ventField}>{Array.from({ length: 14 }, (_, index) => <path key={index} d={`M54 ${370 + index * 20}h152`} />)}</g>
      <Handle x={85} y={690} width={90} height={58} />
    </TallPanelShell>
  );
}

function LpaFaceplate({ tx }: { tx: 1 | 2 }) {
  return (
    <TallPanelShell label={`Mặt trước Low Power Amplifier TX${tx}`} partNumber="FIGURE 3-63 · 571118A-0001-041" width={280}>
      <text className={styles.moduleTitle} x="130" y="142" textAnchor="middle">LOW POWER AMPLIFIER</text>
      <text className={styles.moduleSubtitle} x="130" y="164" textAnchor="middle">{tx === 1 ? "1A9 · TX1" : "1A17 · TX2"}</text>
      <Coax x={130} y={258} label="DETECTOR" connector="J1" />
      <HexConnector x={142} y={374} label="TX LO" />
      <g className={styles.connectorCap}><circle cx="78" cy="374" r="12" /><path d="M78 386c0 36 18 52 51 19" /></g>
      <Led x={130} y={566} color="green" label="PWR OK" anchor="middle" />
      <Handle x={85} y={690} width={90} height={58} />
    </TallPanelShell>
  );
}

function RtcFaceplate({ tx }: { tx: 1 | 2 }) {
  return (
    <TallPanelShell label={`Mặt trước Receiver Transmitter Controller ${tx}`} partNumber="FIGURE 3-64 · 571118A-0001-042" width={275}>
      <text className={styles.moduleTitle} x="130" y="142" textAnchor="middle">RTC {tx}</text>
      <Led x={76} y={194} color="off" label="OVERLOAD" />
      <Coax x={102} y={298} label="LOW VIDEO" connector="J5" />
      <Coax x={102} y={398} label="HIGH VIDEO" connector="J3" />
      <HexConnector x={170} y={464} label="RX LO" />
      <Coax x={102} y={530} label="TX TRIG" connector="J4" />
      <Led x={82} y={646} color="green" label="CPU OK" />
      <Led x={82} y={680} color="green" label="PWR OK" />
      <Handle x={94} y={710} width={72} height={50} />
    </TallPanelShell>
  );
}

function MonitorFaceplate({ monitor }: { monitor: 1 | 2 }) {
  return (
    <TallPanelShell label={`Mặt trước Monitor Interrogator ${monitor}`} partNumber="FIGURE 3-65 · 571118A-0001-043" width={275}>
      <text className={styles.moduleTitle} x="130" y="137" textAnchor="middle">MONITOR {monitor}</text>
      <text className={styles.sectionLabel} x="130" y="174" textAnchor="middle">INTEGRAL</text>
      <Led x={70} y={202} color="red" label="PRIMARY ALARM" /><Led x={70} y={230} color="red" label="SECONDARY ALARM" /><Led x={70} y={258} color="amber" label="PRE ALARM" />
      <text className={styles.sectionLabel} x="130" y="300" textAnchor="middle">STANDBY</text>
      <Led x={70} y={328} color="amber" label="PRIMARY ALARM" /><Led x={70} y={356} color="amber" label="SECONDARY ALARM" /><Led x={70} y={384} color="amber" label="PRE ALARM" />
      <Coax x={102} y={482} label="DETECTED VIDEO" connector="J5" />
      <HexConnector x={166} y={548} label="INT LO" />
      <Coax x={102} y={614} label="INT TRIG" connector="J4" />
      <Led x={76} y={684} color="green" label="CPU OK" /><Led x={76} y={714} color="green" label="PWR OK" />
    </TallPanelShell>
  );
}

function UsbPort({ x, y, label, connector }: { x: number; y: number; label: string; connector: string }) {
  return <g className={styles.usbPort} aria-hidden><text x={x} y={y - 14} textAnchor="middle">{label}</text><rect x={x - 24} y={y} width="48" height="28" rx="3" /><rect x={x - 15} y={y + 7} width="30" height="12" rx="1" /><text x={x + 34} y={y + 19}>{connector}</text></g>;
}

function RmsFaceplate() {
  return (
    <TallPanelShell label="Mặt trước Remote Monitoring System CCA" partNumber="FIGURE 3-66 · 571118A-0001-044" width={250}>
      <text className={styles.moduleTitle} x="130" y="142" textAnchor="middle">RMS PROCESSOR</text>
      <text className={styles.moduleSubtitle} x="130" y="164" textAnchor="middle">1A13</text>
      <Screw x={72} y={354} /><Screw x={72} y={438} />
      <UsbPort x={112} y={486} label="AUX USB" connector="J2" />
      <UsbPort x={112} y={578} label="PMDT USB" connector="J1" />
      <Led x={72} y={646} color="green" label="CPU OK" /><Led x={72} y={680} color="green" label="PWR OK" />
      <Handle x={94} y={710} width={72} height={50} />
    </TallPanelShell>
  );
}

function FacilitiesFaceplate() {
  return (
    <TallPanelShell label="Mặt trước Facilities CCA" partNumber="FIGURE 3-67 · 571118A-0001-045" width={235}>
      <text className={styles.moduleTitle} x="130" y="142" textAnchor="middle">FACILITIES</text>
      <text className={styles.moduleSubtitle} x="130" y="164" textAnchor="middle">1A14</text>
      <g className={styles.speaker} aria-hidden>{[[0, -24], [-20, -12], [20, -12], [0, 0], [-20, 12], [20, 12], [0, 24]].map(([dx, dy], index) => <circle key={index} cx={130 + dx} cy={282 + dy} r="7" />)}<text x="130" y="330" textAnchor="middle">SPEAKER</text></g>
      <Screw x={80} y={438} /><Screw x={80} y={540} />
      <Led x={76} y={680} color="green" label="PWR OK" />
      <Handle x={94} y={710} width={72} height={50} />
    </TallPanelShell>
  );
}

function TechnicalAssemblyFaceplate({ kind, blockId }: FaceplateProps) {
  const titles: Record<Exclude<Dme1119aFaceplateKind, "lcu" | "hpa" | "lpa" | "rtc" | "monitor" | "rms" | "facilities">, string> = {
    bcps: "BATTERY CHARGING POWER SUPPLY",
    interface: "INTERFACE CCA",
    "ac-monitor": "AC POWER MONITOR",
    "power-supply": "1500 W POWER SUPPLY",
    "status-panel": "STATUS / POWER PANEL",
    "fan-controller": "FAN CONTROLLER",
    "rf-assembly": "RF PANEL ASSEMBLY",
  };
  const title = titles[kind as keyof typeof titles] ?? "DME ASSEMBLY";
  const wide = kind === "status-panel" || kind === "interface" || kind === "bcps" || kind === "rf-assembly";
  return (
    <svg className={`${styles.faceplate} ${wide ? styles.wideTechnicalFaceplate : styles.technicalFaceplate}`} viewBox={wide ? "0 0 760 360" : "0 0 440 620"} role="img" aria-label={`${title} ${blockId}`}>
      <FaceplateDefs />
      {wide ? (
        <>
          <Panel x={12} y={12} width={736} height={336} /><Screw x={34} y={34} /><Screw x={726} y={34} /><Screw x={34} y={326} /><Screw x={726} y={326} />
          <text className={styles.technicalTitle} x="380" y="54" textAnchor="middle">{title}</text>
          <text className={styles.technicalSubtitle} x="380" y="78" textAnchor="middle">{blockId.toUpperCase()}</text>
          {kind === "status-panel" ? <StatusPanelInterior /> : kind === "interface" ? <InterfaceInterior /> : kind === "bcps" ? <BcpsInterior /> : <RfAssemblyInterior blockId={blockId} />}
        </>
      ) : (
        <>
          <Panel x={12} y={12} width={416} height={596} /><Screw x={34} y={34} /><Screw x={406} y={34} /><Screw x={34} y={586} /><Screw x={406} y={586} />
          <text className={styles.technicalTitle} x="220" y="58" textAnchor="middle">{title}</text>
          <text className={styles.technicalSubtitle} x="220" y="82" textAnchor="middle">{blockId.toUpperCase()}</text>
          {kind === "power-supply" ? <PowerSupplyInterior /> : kind === "ac-monitor" ? <AcMonitorInterior /> : <FanControllerInterior />}
        </>
      )}
    </svg>
  );
}

function StatusPanelInterior() {
  return <g aria-hidden className={styles.statusInterior}>{[0, 1, 2, 3].map((column) => <g key={column}><rect x={78 + column * 62} y="120" width="42" height="110" rx="3" /><path d={`M${88 + column * 62} 158h22v42h-22z`} /><text x={99 + column * 62} y="252" textAnchor="middle">DC{column + 1}</text></g>)}<rect x="365" y="110" width="120" height="142" rx="3" /><rect x="506" y="110" width="120" height="142" rx="3" />{[0, 1, 2, 3, 4].map((row) => <g key={row}><Led x={384} y={137 + row * 22} color={row === 4 ? "green" : "off"} /><Led x={525} y={137 + row * 22} color={row === 4 ? "green" : "off"} /></g>)}<text x="425" y="282" textAnchor="middle">TX1 STATUS</text><text x="566" y="282" textAnchor="middle">TX2 STATUS</text><rect x="656" y="125" width="52" height="91" rx="4" /><text x="682" y="244" textAnchor="middle">OUTLET</text></g>;
}

function InterfaceInterior() {
  return <g aria-hidden className={styles.interfaceInterior}>{[0, 1, 2, 3, 4, 5].map((column) => <rect key={column} x={58 + column * 109} y="116" width="86" height="42" rx="3" />)}<rect x="62" y="194" width="252" height="64" rx="3" /><rect x="344" y="194" width="142" height="64" rx="3" /><rect x="516" y="194" width="168" height="64" rx="3" /><text x="188" y="232" textAnchor="middle">ANALOG / DIGITAL I/O</text><text x="415" y="232" textAnchor="middle">RS232</text><text x="600" y="232" textAnchor="middle">ETHERNET</text></g>;
}

function BcpsInterior() {
  return <g aria-hidden className={styles.bcpsInterior}>{[0, 1, 2, 3, 4].map((row) => <Led key={row} x={92} y={125 + row * 34} color={row === 4 ? "green" : "off"} label={["AC FAIL", "BATTERY FAULT", "ON BATTERY", "FAST CHARGE", "TRICKLE CHARGE"][row]} />)}{[0, 1, 2].map((column) => <g key={column}><rect x={350 + column * 108} y="122" width="78" height="128" rx="4" /><path d={`M${365 + column * 108} 150h48M${365 + column * 108} 174h48M${365 + column * 108} 198h48M${365 + column * 108} 222h48`} /></g>)}</g>;
}

function RfAssemblyInterior({ blockId }: { blockId: Dme1119aBlockId }) {
  return <g aria-hidden className={styles.rfInterior}><rect x="68" y="120" width="176" height="130" rx="4" /><circle cx="156" cy="185" r="45" /><path d="M156 140v90M111 185h90" /><rect x="292" y="120" width="176" height="130" rx="4" /><path d="M318 145h124l-62 78z" /><rect x="516" y="120" width="176" height="130" rx="4" />{[0, 1, 2, 3, 4].map((row) => <path key={row} d={`M540 ${144 + row * 20}h128`} />)}<text x="156" y="280" textAnchor="middle">CIRCULATOR / COUPLER</text><text x="380" y="280" textAnchor="middle">RF SWITCH</text><text x="604" y="280" textAnchor="middle">LOAD / LNA</text><text x="380" y="322" textAnchor="middle">SELECTED: {blockId.toUpperCase()}</text></g>;
}

function PowerSupplyInterior() {
  return <g aria-hidden className={styles.powerInterior}><rect x="62" y="120" width="316" height="326" rx="4" />{Array.from({ length: 14 }, (_, row) => <path key={row} d={`M82 ${145 + row * 18}h210`} />)}<Handle x={308} y={150} width={46} height={228} /><Led x={112} y={492} color="green" label="DC OUTPUT OK" /><rect x="76" y="530" width="288" height="42" rx="3" /><text x="220" y="557" textAnchor="middle">950909-0000 · 1500 W</text></g>;
}

function AcMonitorInterior() {
  return <g aria-hidden className={styles.acMonitorInterior}><rect x="78" y="124" width="284" height="360" rx="4" />{[0, 1, 2].map((row) => <g key={row}><rect x="104" y={164 + row * 90} width="232" height="42" rx="3" /><text x="220" y={190 + row * 90} textAnchor="middle">{["SYSTEM AC SENSE", "OBSTRUCTION LIGHT SENSE", "PHOTO SWITCH / BYPASS"][row]}</text></g>)}<rect x="104" y="438" width="232" height="26" rx="3" /></g>;
}

function FanControllerInterior() {
  return <g aria-hidden className={styles.fanInterior}><rect x="72" y="126" width="296" height="338" rx="4" /><circle cx="154" cy="242" r="62" /><circle cx="286" cy="242" r="62" />{[154, 286].map((x) => <path key={x} d={`M${x} 180v124M${x - 62} 242h124M${x - 44} 198l88 88M${x + 44} 198l-88 88`} />)}<text x="154" y="330" textAnchor="middle">FAN 1</text><text x="286" y="330" textAnchor="middle">FAN 2</text><Led x={112} y={400} color="green" label="FANS OK" /></g>;
}

export function Dme1119aModuleFaceplate({ kind, blockId }: FaceplateProps) {
  if (kind === "lcu") return <LcuFaceplate />;
  if (kind === "hpa") return <HpaFaceplate tx={blockId === "hpa-2" ? 2 : 1} />;
  if (kind === "lpa") return <LpaFaceplate tx={blockId === "lpa-synth-2" ? 2 : 1} />;
  if (kind === "rtc") return <RtcFaceplate tx={blockId === "rtc-2" ? 2 : 1} />;
  if (kind === "monitor") return <MonitorFaceplate monitor={blockId === "monitor-2" ? 2 : 1} />;
  if (kind === "rms") return <RmsFaceplate />;
  if (kind === "facilities") return <FacilitiesFaceplate />;
  return <TechnicalAssemblyFaceplate kind={kind} blockId={blockId} />;
}
