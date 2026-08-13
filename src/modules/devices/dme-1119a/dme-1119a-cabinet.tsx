"use client";

import type {
  Dme1119aBlockId,
  Dme1119aCabinetHotspot,
  Dme1119aCabinetSurface,
} from "./block-diagram-data";
import {
  DME_1119A_BLOCKS,
  DME_1119A_HOTSPOT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dme-1119a-block-diagram.module.css";

interface Dme1119aCabinetProps {
  surface: Dme1119aCabinetSurface;
  selectedHotspotIds: ReadonlySet<string>;
  onSelect: (blockId: Dme1119aBlockId, hotspot: Dme1119aCabinetHotspot) => void;
}

function Screw({ x, y, radius = 2.5 }: { x: number; y: number; radius?: number }) {
  return (
    <g className={styles.cabinetScrew} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      <path d={`M${x - radius * 0.55} ${y}h${radius * 1.1}M${x} ${y - radius * 0.55}v${radius * 1.1}`} />
    </g>
  );
}

function Handle({ x, y, height, width = 8 }: { x: number; y: number; height: number; width?: number }) {
  return (
    <g className={styles.cabinetHandle} aria-hidden>
      <rect x={x - width / 2} y={y} width={width} height={height} rx={width / 2} />
      <path d={`M${x} ${y + 8}v${Math.max(0, height - 16)}`} />
    </g>
  );
}

function Led({
  x,
  y,
  on = false,
  radius = 2,
  tone = "green",
}: {
  x: number;
  y: number;
  on?: boolean;
  radius?: number;
  tone?: "green" | "red";
}) {
  const className = on
    ? tone === "red" ? styles.cabinetLedAlarm : styles.cabinetLedOn
    : styles.cabinetLedOff;
  return <circle className={className} cx={x} cy={y} r={radius} aria-hidden />;
}

function RailFasteners({ left, right, ys }: { left: number; right: number; ys: readonly number[] }) {
  return (
    <g aria-hidden>
      {ys.flatMap((y) => [
        <Screw key={`l-${left}-${y}`} x={left} y={y} />,
        <Screw key={`r-${right}-${y}`} x={right} y={y} />,
      ])}
    </g>
  );
}

type LowPowerCardVariant = "lpa" | "rtc" | "monitor" | "processor" | "facilities";

function LowPowerCard({
  x,
  width,
  assemblyId,
  shortLabel,
  variant,
}: {
  x: number;
  width: number;
  assemblyId: string;
  shortLabel: string;
  variant: LowPowerCardVariant;
}) {
  const center = x + width / 2;
  const compact = width < 28;

  return (
    <g className={styles.cabinetCardFace} aria-hidden>
      <rect className={styles.cabinetPanel} x={x} y="349" width={width} height="178" />
      <text className={styles.cardAssemblyLabel} x={center} y="365">{assemblyId}</text>
      {!compact ? <text className={styles.cardNameLabel} x={center} y="382">{shortLabel}</text> : null}
      <Screw x={center} y={356} radius={2.2} />
      <Screw x={center} y={520} radius={2.2} />

      {variant === "lpa" ? (
        <>
          <circle className={styles.cardPullRing} cx={x + (x < 220 ? width - 9 : 9)} cy="361" r="7" />
          <circle className={styles.cardPullRing} cx={x + (x < 220 ? width - 9 : 9)} cy="514" r="7" />
          <Led x={center} y={405} on />
          <circle className={styles.cardControl} cx={center - 7} cy="438" r="4" />
          <circle className={styles.cardControl} cx={center + 7} cy="438" r="4" />
          <circle className={styles.cardControl} cx={center - 7} cy="460" r="3.4" />
          <circle className={styles.cardControl} cx={center + 7} cy="460" r="3.4" />
          <path className={styles.cardLever} d={`M${center - 9} 478q9 13 18 0v-15`} />
        </>
      ) : null}

      {variant === "rtc" ? (
        <>
          <rect className={styles.cabinetConnector} x={center - 8} y="354" width="16" height="10" rx="1" />
          {[0, 1, 2, 3].map((row) => <Led key={row} x={center} y={399 + row * 9} on={row === 2} radius={1.7} />)}
          <circle className={styles.cardControl} cx={center - 5} cy="447" r="3.4" />
          <circle className={styles.cardControl} cx={center + 5} cy="447" r="3.4" />
          <circle className={styles.cardControl} cx={center} cy="469" r="3.4" />
          <rect className={styles.cabinetConnector} x={center - 7} y="508" width="14" height="11" rx="1" />
        </>
      ) : null}

      {variant === "monitor" ? (
        <>
          <rect className={styles.cabinetConnector} x={center - 8} y="354" width="16" height="10" rx="1" />
          {[0, 1, 2, 3, 4].map((row) => <Led key={row} x={center - 5 + (row % 2) * 10} y={398 + Math.floor(row / 2) * 10} on={row === 0} radius={1.7} />)}
          <circle className={styles.cardControl} cx={center - 6} cy="444" r="3.4" />
          <circle className={styles.cardControl} cx={center + 6} cy="444" r="3.4" />
          <circle className={styles.cardControl} cx={center - 6} cy="464" r="3.4" />
          <circle className={styles.cardControl} cx={center + 6} cy="464" r="3.4" />
          <rect className={styles.cabinetConnector} x={center - 7} y="508" width="14" height="11" rx="1" />
        </>
      ) : null}

      {variant === "processor" ? (
        <>
          <path className={styles.cardDivider} d={`M${x + width / 2} 350v176`} />
          <rect className={styles.cabinetConnector} x={x + 5} y="355" width={Math.max(8, width / 2 - 8)} height="10" rx="1" />
          <rect className={styles.cabinetConnector} x={center + 3} y="355" width={Math.max(8, width / 2 - 8)} height="10" rx="1" />
          {[0, 1, 2, 3, 4].map((row) => <Led key={row} x={center - 4 + (row % 2) * 8} y={410 + Math.floor(row / 2) * 8} on={row === 4} radius={1.5} />)}
          <rect className={styles.cabinetConnector} x={x + 5} y="507" width={Math.max(8, width / 2 - 8)} height="11" rx="1" />
          <rect className={styles.cabinetConnector} x={center + 3} y="507" width={Math.max(8, width / 2 - 8)} height="11" rx="1" />
        </>
      ) : null}

      {variant === "facilities" ? (
        <>
          {[0, 1, 2, 3].map((row) => <Led key={row} x={center} y={401 + row * 9} on={row === 3} radius={1.5} />)}
          <rect className={styles.cabinetConnector} x={center - 5} y="455" width="10" height="15" rx="1" />
          <rect className={styles.cabinetConnector} x={center - 6} y="507" width="12" height="11" rx="1" />
        </>
      ) : null}
    </g>
  );
}

function HpaModule({ x, assemblyId, label }: { x: number; assemblyId: string; label: string }) {
  return (
    <g className={styles.hpaModule} aria-hidden>
      <rect className={styles.cabinetPanel} x={x} y="169" width="55" height="180" />
      <Screw x={x + 8} y={177} radius={2.2} />
      <Screw x={x + 47} y={341} radius={2.2} />
      <Led x={x + 43} y={198} on radius={1.7} />
      <circle className={styles.cardControl} cx={x + 43} cy="211" r="5" />
      <Handle x={x + 27.5} y={224} height={72} width={8} />
      <text x={x + 27.5} y="319">{assemblyId}</text>
      <text x={x + 27.5} y="331">{label}</text>
    </g>
  );
}

function PowerSupply({ x, assemblyId, label }: { x: number; assemblyId: string; label: string }) {
  return (
    <g className={styles.powerModule} aria-hidden>
      <text x={x + 51} y="705">{assemblyId} · {label}</text>
      <rect x={x} y="713" width="102" height="30" rx="2" />
      {[0, 1, 2, 3].map((row) => <path key={row} d={`M${x + 14} ${720 + row * 5}h38`} />)}
      <rect className={styles.cabinetConnector} x={x + 63} y="718" width="25" height="8" rx="1" />
      <rect className={styles.cabinetConnector} x={x + 63} y="730" width="25" height="8" rx="1" />
      <Handle x={x + 94} y={717} height={22} width={5} />
    </g>
  );
}

function CabinetLcuButton({
  x,
  y,
  width = 48,
  height = 39,
  lines,
  lamp = "off",
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  lines: readonly string[];
  lamp?: "green" | "red" | "off";
}) {
  return (
    <g className={styles.lcuButton}>
      <rect x={x} y={y} width={width} height={height} rx="4" />
      <Led
        x={x + width - 10}
        y={y + 10}
        on={lamp !== "off"}
        tone={lamp === "red" ? "red" : "green"}
        radius={7}
      />
      <text x={x + width / 2} y={y + height / 2 - ((lines.length - 1) * 6)}>
        {lines.map((line, index) => (
          <tspan key={line} x={x + width / 2} dy={index === 0 ? 0 : 12}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}

function CabinetLcuFaceplate() {
  const displayRows = [
    ["Delay", "50.00 µs"],
    ["Spacing", "12.00 µs"],
    ["TX Power", "1000 W"],
    ["ERP", "31.2 dBW"],
    ["Eff", "99.6 %"],
    ["PRF", "2700"],
  ] as const;
  const transmitterRows = ["MAIN SELECT", "ANTENNA", "LOAD", "OFF"] as const;
  const systemIndicators = [
    "MAINTENANCE ALERT",
    "REMOTE CONTROL FAULT",
    "BATTERY FAULT",
    "ON BATTERY",
    "INTERLOCKED OFF",
    "LCU POWER ON",
  ] as const;

  return (
    <svg
      className={styles.cabinetLcuFaceplate}
      x="54"
      y="77"
      width="324"
      height="92"
      viewBox="12 8 1176 334"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect className={styles.lcuFaceShell} x="12" y="12" width="1176" height="326" rx="8" />
      {[36, 1164].flatMap((x) => [55, 294].map((y) => (
        <g className={styles.lcuFaceScrew} key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="8" />
          <path d={`M${x - 5} ${y + 5}l10-10`} />
        </g>
      )))}

      <g className={styles.lcuDisplay}>
        <rect x="80" y="62" width="332" height="226" rx="7" />
        <text className={styles.lcuDisplayTitle} x="246" y="96">Integral Monitor 1</text>
        {displayRows.map(([label, value], index) => (
          <g key={label}>
            <text className={styles.lcuDisplayRowLabel} x="116" y={130 + index * 23}>{label}</text>
            <text className={styles.lcuDisplayRowValue} x="360" y={130 + index * 23}>{value}</text>
          </g>
        ))}
        {[100, 210, 320].map((x) => <rect className={styles.lcuSoftKey} key={x} x={x} y="248" width="72" height="25" rx="2" />)}
        <text x="136" y="266">Prev</text>
        <text x="246" y="266">Main</text>
        <text x="356" y="266">Next</text>
      </g>

      <g className={styles.lcuGroup}>
        <rect x="446" y="44" width="204" height="264" rx="3" />
        <text className={styles.lcuGroupTitle} x="548" y="67">TRANSMITTER</text>
        {transmitterRows.map((label, index) => {
          const y = 88 + index * 55;
          return (
            <g key={label}>
              <CabinetLcuButton x={464} y={y} lines={["1"]} lamp={index < 2 ? "green" : "off"} />
              <text className={styles.lcuRowLabel} x="548" y={y + 24}>{label}</text>
              <CabinetLcuButton x={584} y={y} lines={["2"]} lamp={index === 3 ? "red" : "off"} />
            </g>
          );
        })}
      </g>

      <g className={styles.lcuGroup}>
        <rect x="674" y="44" width="470" height="128" rx="3" />
        <text className={styles.lcuGroupTitle} x="909" y="65">MONITOR</text>
        <path className={styles.lcuGroupDivider} d="M909 73v88" />
        <text className={styles.lcuSubTitle} x="792" y="84">INTEGRAL</text>
        <text className={styles.lcuSubTitle} x="1024" y="84">STANDBY</text>
        {[0, 1].map((row) => (
          <g key={row}>
            <text className={styles.lcuMonitorNumber} x="700" y={112 + row * 31}>{row + 1}</text>
            <Led x={728} y={108 + row * 31} on radius={7} />
            <Led x={777} y={108 + row * 31} radius={7} />
            <Led x={826} y={108 + row * 31} radius={7} />
            <text className={styles.lcuMonitorNumber} x="932" y={112 + row * 31}>{row + 1}</text>
            <Led x={960} y={108 + row * 31} on radius={7} />
            <Led x={1009} y={108 + row * 31} radius={7} />
            <Led x={1058} y={108 + row * 31} radius={7} />
          </g>
        ))}
        {[728, 960].map((x) => <text className={styles.lcuTinyLabel} key={`normal-${x}`} x={x} y="98">NORMAL</text>)}
        {[777, 1009].map((x) => <text className={styles.lcuTinyLabel} key={`primary-${x}`} x={x} y="98">PRIMARY</text>)}
        {[826, 1058].map((x) => <text className={styles.lcuTinyLabel} key={`secondary-${x}`} x={x} y="98">SECONDARY</text>)}
        <CabinetLcuButton x={846} y={101} lines={["BYPASS"]} />
        <CabinetLcuButton x={1078} y={101} lines={["BYPASS"]} />
      </g>

      <g className={styles.lcuGroup}>
        <rect x="674" y="184" width="470" height="124" rx="3" />
        <text className={styles.lcuGroupTitle} x="909" y="205">SYSTEM</text>
        <CabinetLcuButton x={700} y={220} width={62} height={36} lines={["LOCAL", "CONTROL"]} lamp="green" />
        <CabinetLcuButton x={780} y={220} width={62} height={36} lines={["LAMP", "TEST"]} />
        <CabinetLcuButton x={700} y={264} width={62} height={36} lines={["ALARM", "SILENCE"]} />
        <CabinetLcuButton x={780} y={264} width={62} height={36} lines={["RESET"]} />
        {systemIndicators.map((label, index) => (
          <g key={label}>
            <Led x={877} y={225 + index * 14} on={index === 5} radius={6} />
            <text className={styles.lcuSystemLabel} x="892" y={229 + index * 14}>{label}</text>
          </g>
        ))}
        <g className={styles.lcuVolumePot}>
          <text x="1112" y="263">VOLUME</text>
          <circle cx="1112" cy="282" r="13" />
          <path d="M1104 290l16-16" />
        </g>
      </g>
      <text className={styles.lcuPartNumber} x="26" y="330">571118A-0001-032 · FIGURE 3-54</text>
    </svg>
  );
}

function FrontCabinet() {
  const lowPowerCards = [
    { x: 54, width: 63, assemblyId: "1A9", shortLabel: "LPA 1", variant: "lpa" },
    { x: 117, width: 34, assemblyId: "1A10", shortLabel: "RTC 1", variant: "rtc" },
    { x: 151, width: 34, assemblyId: "1A11", shortLabel: "MON 1", variant: "monitor" },
    { x: 185, width: 41, assemblyId: "1A13", shortLabel: "RMS", variant: "processor" },
    { x: 226, width: 20, assemblyId: "1A14", shortLabel: "FAC", variant: "facilities" },
    { x: 246, width: 34, assemblyId: "1A15", shortLabel: "MON 2", variant: "monitor" },
    { x: 280, width: 34, assemblyId: "1A16", shortLabel: "RTC 2", variant: "rtc" },
    { x: 314, width: 64, assemblyId: "1A17", shortLabel: "LPA 2", variant: "lpa" },
  ] as const satisfies readonly {
    x: number;
    width: number;
    assemblyId: string;
    shortLabel: string;
    variant: LowPowerCardVariant;
  }[];

  return (
    <g>
      <rect className={styles.cabinetBackdrop} width="440" height="1280" />
      <rect className={styles.cabinetShadow} x="10" y="18" width="420" height="1230" rx="7" />
      <rect className={styles.cabinetOuter} x="17" y="10" width="406" height="1230" rx="4" />
      <rect className={styles.cabinetInterior} x="46" y="48" width="340" height="1140" />
      <rect className={styles.cabinetMechanicalRail} x="46" y="48" width="8" height="1140" />
      <rect className={styles.cabinetMechanicalRail} x="378" y="48" width="8" height="1140" />
      <rect className={styles.cabinetHeader} x="17" y="21" width="406" height="18" rx="1" />
      <rect className={styles.cabinetHeader} x="17" y="1200" width="406" height="22" rx="1" />

      <g className={styles.frontBlankTop} aria-hidden>
        <rect x="54" y="48" width="324" height="29" />
        <path d="M54 77h324M105 48v29" />
      </g>

      <g className={styles.lcuAssembly}><CabinetLcuFaceplate /></g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="54" y="169" width="324" height="180" />
        <HpaModule x={80} assemblyId="1A3" label="HPA 1" />
        <HpaModule x={298} assemblyId="1A7" label="HPA 2" />
        <path className={styles.cabinetFineLine} d="M135 169v180M298 169v180" />
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="54" y="349" width="324" height="178" />
        {lowPowerCards.map((card) => <LowPowerCard key={card.assemblyId} {...card} />)}
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="54" y="527" width="324" height="224" />
        <path className={styles.cabinetCover} d="M54 527H378V678C344 677 325 654 293 652c-35-3-69 4-104-3-45-9-76-30-135-34Z" />
        <PowerSupply x={92} assemblyId="1A24" label="TX1 PS" />
        <PowerSupply x={241} assemblyId="1A25" label="TX2 PS" />
        <path className={styles.cabinetShelfLine} d="M54 743h324M54 751h324" />
      </g>

      <g className={styles.acMonitorAssembly} aria-hidden>
        <rect className={styles.rackBay} x="54" y="751" width="324" height="136" />
        <path className={styles.cabinetCover} d="M54 751H378v136H260c-24-41-65-45-97-60-39-18-72-34-109-34Z" />
        <rect className={styles.cabinetPanel} x="326" y="781" width="52" height="93" />
        <text x="351" y="794">1A22</text>
        <text x="351" y="804">AC MON</text>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <g key={row}>
            <text className={styles.microLabel} x="337" y={819 + row * 8}>{["SYS V", "SYS I", "OBS V", "OBS I", "PHOTO", "BYPASS"][row]}</text>
            <rect className={styles.cabinetConnector} x="357" y={813 + row * 8} width="14" height="6" rx="1" />
          </g>
        ))}
      </g>

      <rect className={styles.blankBay} x="54" y="887" width="324" height="179" />

      <g className={styles.statusPanel} aria-hidden>
        <rect className={styles.cabinetPanel} x="54" y="1066" width="324" height="122" />
        <text x="216" y="1080">1A26 · STATUS / POWER PANEL</text>
        {[0, 1, 2, 3].map((column) => (
          <g key={column}>
            <text x={82 + column * 24} y="1096">DC{column + 1}</text>
            <rect x={74 + column * 24} y="1101" width="16" height="42" rx="1" />
            <path className={styles.breakerToggle} d={`M${78 + column * 24} 1115h8v14h-8z`} />
          </g>
        ))}
        {[184, 239].map((x, index) => (
          <g key={x}>
            <rect x={x} y="1099" width="47" height="47" rx="1" />
            <text x={x + 23.5} y="1108">TX {index + 1}</text>
            {[0, 1, 2, 3, 4].map((row) => <Led key={row} x={x + 8} y={1116 + row * 6} on={row === 4} radius={1.4} />)}
            <rect className={styles.cabinetConnector} x={x + 31} y="1114" width="10" height="10" rx="1" />
          </g>
        ))}
        <rect className={styles.convenienceOutlet} x="319" y="1097" width="27" height="51" rx="2" />
        <circle cx="332.5" cy="1112" r="3" /><circle cx="332.5" cy="1131" r="3" />
      </g>

      <RailFasteners left={50} right={382} ys={[62, 106, 144, 194, 320, 350, 375, 501, 527, 552, 743, 751, 792, 861, 887, 913, 1041, 1066, 1089, 1152, 1188]} />
      <text className={styles.cabinetOrientation} x="22" y="1248">LEFT</text>
      <text className={styles.cabinetOrientation} x="418" y="1248">RIGHT</text>
      <text className={styles.cabinetDrawingId} x="220" y="1235">5711118A-0001-003</text>
      <text className={styles.cabinetCaption} x="220" y="1270">FIGURE 1-3 · MODEL 1119A HIGH POWER DME · FRONT VIEW</text>
    </g>
  );
}

function RearCabinet() {
  return (
    <g>
      <rect className={styles.cabinetBackdrop} width="440" height="1280" />
      <rect className={styles.cabinetShadow} x="16" y="20" width="408" height="1228" rx="7" />
      <rect className={styles.cabinetOuter} x="25" y="14" width="390" height="1224" rx="4" />
      <rect className={styles.cabinetInterior} x="55" y="31" width="330" height="1162" />
      <rect className={styles.cabinetMechanicalRail} x="55" y="31" width="10" height="1162" />
      <rect className={styles.cabinetMechanicalRail} x="375" y="31" width="10" height="1162" />
      <rect className={styles.cabinetHeader} x="25" y="21" width="390" height="17" rx="1" />
      <rect className={styles.cabinetHeader} x="25" y="1205" width="390" height="18" rx="1" />

      <g className={styles.rearRfAssembly} aria-hidden>
        <rect className={styles.cabinetPanel} x="83" y="31" width="276" height="139" />
        <rect className={styles.rearComponent} x="113" y="42" width="38" height="54" rx="2" />
        <text x="132" y="57">1DC1</text>
        <rect className={styles.rearComponent} x="91" y="98" width="28" height="52" rx="2" />
        <text x="105" y="114">1HY1</text>
        <rect className={styles.rearComponent} x="176" y="48" width="63" height="30" rx="7" />
        <text x="207.5" y="64">1I2</text>
        <rect className={styles.rearComponent} x="270" y="52" width="70" height="29" rx="7" />
        <text x="305" y="68">1I3</text>
        <rect className={styles.rearComponent} x="207" y="93" width="29" height="45" rx="2" />
        <text x="221.5" y="110">1K1</text>
        <rect className={styles.rearComponent} x="267" y="91" width="74" height="27" rx="7" />
        <text x="304" y="107">1I4</text>
        <rect className={styles.rearComponent} x="280" y="127" width="55" height="26" rx="6" />
        <text x="307.5" y="143">1AT1</text>
        <rect className={styles.rearComponent} x="136" y="107" width="40" height="34" rx="2" />
        <text x="156" y="124">1DC2</text>
        <g className={styles.rearCirculator}>
          <rect x="188" y="125" width="20" height="26" rx="2" />
          {[0, 1].map((row) => [0, 1].map((column) => (
            <circle key={`${row}-${column}`} cx={193 + column * 10} cy={132 + row * 10} r="2.2" />
          )))}
        </g>
        <path className={styles.cabinetWire} d="M151 68c15 0 5 33 24 33M239 63c24 0 21 46 42 46M235 109c18 0 17-39 35-39M236 116c29 0 22 24 44 24M119 123c44 0 42 22 88 6" />
        <path className={styles.cabinetHarness} d="M221 138c-9 29-25 48-33 76-12 45 4 148-9 218-7 38-8 74-8 101" />
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="65" y="170" width="310" height="363" />
        <rect className={styles.rearBackplane} x="82" y="170" width="122" height="143" />
        <rect className={styles.rearBackplane} x="236" y="170" width="122" height="143" />
        <rect className={styles.controllerBoard} x="202" y="171" width="106" height="74" rx="2" />
        <text className={styles.rearAssemblyLabel} x="255" y="184">1A2A2 · FAN CONTROLLER</text>
        <rect className={styles.cabinetConnector} x="215" y="195" width="46" height="17" rx="1" />
        {[0, 1, 2, 3].map((column) => <rect className={styles.cabinetTerminal} key={column} x={219 + column * 10} y="198" width="7" height="11" rx="1" />)}
        <rect className={styles.rearBackplane} x="83" y="313" width="275" height="220" />
        {[0, 1, 2, 3].map((row) => <rect className={styles.cabinetTerminal} key={row} x="88" y={337 + row * 38} width="10" height="27" rx="1" />)}
        {[0, 1, 2].map((row) => <rect className={styles.cabinetTerminal} key={row} x="344" y={337 + row * 48} width="10" height="30" rx="1" />)}
        <path className={styles.cabinetWire} d="M95 205C110 268 139 254 178 266M343 207c-18 61-45 48-72 63M99 303c22 44 44 43 78 48M338 307c-32 17-35 55-64 59M100 390c46 0 38 50 75 51M340 426c-22 4-31 37-65 42" />
        <path className={styles.cabinetWire} d="M122 321c43 14 12 73 51 78M316 322c-32 21-11 88-42 96M116 469c25 7 25 38 60 40M315 472c-19 1-28 28-44 39" />
      </g>

      <g className={styles.interfaceAssembly} aria-hidden>
        <rect className={styles.cabinetPanel} x="93" y="533" width="254" height="118" />
        <text className={styles.rearAssemblyLabel} x="220" y="550">1A19 · INTERFACE CCA</text>
        <rect className={styles.cabinetConnector} x="184" y="572" width="74" height="17" rx="2" />
        {[0, 1, 2, 3, 4, 5].map((column) => <path className={styles.cabinetFineLine} key={column} d={`M${191 + column * 11} 577v7`} />)}
        <rect className={styles.cabinetConnector} x="107" y="628" width="42" height="10" rx="1" />
        <path className={styles.cabinetWire} d="M176 533c20 30 7 45 9 72M271 533c-13 27 6 49-8 76M149 632c33 0 24 18 53 18M258 589c24 6 43 15 79 29" />
      </g>

      <g className={styles.bcpsAssembly} aria-hidden>
        <rect className={styles.cabinetPanel} x="75" y="651" width="148" height="121" />
        <rect className={styles.cabinetPanel} x="223" y="651" width="137" height="121" />
        <text className={styles.rearAssemblyLabel} x="149" y="670">1A21 · BCPS 2</text>
        <text className={styles.rearAssemblyLabel} x="291.5" y="670">1A20 · BCPS 1</text>
        {[0, 1].map((side) => [0, 1, 2, 3, 4, 5, 6].map((column) => (
          <g key={`${side}-${column}`}>
            <text className={styles.microLabel} x={(side === 0 ? 91 : 237) + column * 17} y="735">E{column + 1}</text>
            <circle className={styles.cabinetTerminal} cx={(side === 0 ? 91 : 237) + column * 17} cy="746" r="3" />
          </g>
        )))}
        <path className={styles.cabinetWire} d="M90 651c14 20 32 15 38 37M207 651c-22 24-15 42-17 66M239 651c10 19 33 17 38 37M342 651c-24 20-13 43-19 67" />
      </g>

      <g className={styles.rearTerminalStrip} aria-hidden>
        <rect x="65" y="772" width="310" height="23" />
        {Array.from({ length: 18 }, (_, index) => <rect className={styles.cabinetTerminal} key={index} x={72 + index * 16.3} y="778" width="8" height="9" rx="1" />)}
      </g>

      <g aria-hidden>
        <rect className={styles.blankBay} x="65" y="795" width="310" height="278" />
        <rect className={styles.rearVerticalBoard} x="65" y="795" width="43" height="75" rx="2" />
        {[0, 1, 2, 3, 4, 5, 6].map((row) => <rect className={styles.cabinetTerminal} key={row} x="71" y={804 + row * 8} width="15" height="5" rx="1" />)}
        <path className={styles.cabinetWire} d="M82 870c0 65-7 126 6 194M356 793c1 79-7 188 5 270M92 795c46 29 88 19 121 16M344 795c-34 20-71 13-104 16" />
        <path className={styles.cabinetHarness} d="M366 777c-9 68-3 194-7 295" />
      </g>

      <g className={styles.rearStatusArea} aria-hidden>
        <rect className={styles.cabinetPanel} x="73" y="1073" width="304" height="120" />
        <rect className={styles.rearMainsEntry} x="91" y="1105" width="40" height="66" rx="2" />
        <circle cx="111" cy="1138" r="9" />
        <path className={styles.cabinetFineLine} d="M111 1129v18M102 1138h18" />
        <text className={styles.rearAssemblyLabel} x="172.5" y="1113">1A26A2</text>
        <text className={styles.rearAssemblyLabel} x="226.5" y="1113">1A26A1</text>
        <rect className={styles.statusDisplayRear} x="147" y="1124" width="51" height="37" rx="1" />
        <rect className={styles.statusDisplayRear} x="201" y="1124" width="51" height="37" rx="1" />
        {[0, 1].map((side) => [0, 1, 2, 3].map((column) => <path className={styles.cabinetFineLine} key={`${side}-${column}`} d={`M${154 + side * 54 + column * 10} 1134v17`} />))}
        <rect className={styles.rearRelayBank} x="264" y="1099" width="103" height="76" rx="2" />
        {[0, 1, 2, 3].map((column) => <rect className={styles.cabinetTerminal} key={column} x={273 + column * 21} y="1111" width="16" height="28" rx="1" />)}
        <path className={styles.cabinetWire} d="M131 1150c12 0 8 25 22 25h99M252 1148c14 4 8 29 20 29M359 1073v26" />
      </g>

      <RailFasteners left={60} right={380} ys={[51, 118, 170, 188, 242, 313, 380, 452, 533, 574, 651, 690, 772, 795, 867, 997, 1073, 1104, 1186]} />
      <text className={styles.cabinetOrientation} x="22" y="1248">RIGHT</text>
      <text className={styles.cabinetOrientation} x="418" y="1248">LEFT</text>
      <text className={styles.cabinetDrawingId} x="220" y="1235">5711118A-0001-004</text>
      <text className={styles.cabinetCaption} x="220" y="1270">FIGURE 1-4 · MODEL 1119A HIGH POWER DME · REAR VIEW</text>
    </g>
  );
}

function CabinetHotspot({
  hotspot,
  selected,
  onSelect,
}: {
  hotspot: Dme1119aCabinetHotspot;
  selected: boolean;
  onSelect: (blockId: Dme1119aBlockId, hotspot: Dme1119aCabinetHotspot) => void;
}) {
  const blockId = DME_1119A_HOTSPOT_TO_BLOCK.get(hotspot.id);
  if (!blockId) return null;

  const activate = () => onSelect(blockId, hotspot);
  return (
    <g
      className={styles.cabinetHotspot}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Chọn ${hotspot.assemblyId} ${hotspot.shortLabel}`}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <rect className={styles.hotspotTarget} x={hotspot.x} y={hotspot.y} width={hotspot.width} height={hotspot.height} rx="3" />
      <rect className={styles.hotspotOutline} x={hotspot.x + 2} y={hotspot.y + 2} width={Math.max(0, hotspot.width - 4)} height={Math.max(0, hotspot.height - 4)} rx="2" />
    </g>
  );
}

export function Dme1119aCabinet({ surface, selectedHotspotIds, onSelect }: Dme1119aCabinetProps) {
  const hotspots = DME_1119A_BLOCKS.flatMap((block) => block.cabinetHotspots).filter((item) => item.surface === surface);
  const label = surface === "front" ? "Mặt trước cabinet DME 1119A" : "Mặt sau cabinet DME 1119A";

  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 440 1280" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="dme1119a-cabinet-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#69777b" /><stop offset="0.14" stopColor="#d4dcda" /><stop offset="0.5" stopColor="#a5b0b0" /><stop offset="0.86" stopColor="#e2e7e5" /><stop offset="1" stopColor="#637176" />
        </linearGradient>
        <linearGradient id="dme1119a-panel-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5e9e7" /><stop offset="0.48" stopColor="#aeb9b8" /><stop offset="1" stopColor="#77878b" />
        </linearGradient>
        <filter id="dme1119a-hotspot-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {surface === "front" ? <FrontCabinet /> : <RearCabinet />}
      {hotspots.map((item) => <CabinetHotspot key={item.id} hotspot={item} selected={selectedHotspotIds.has(item.id)} onSelect={onSelect} />)}
    </svg>
  );
}
