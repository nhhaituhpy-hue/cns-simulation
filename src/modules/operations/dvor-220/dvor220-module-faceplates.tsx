import type { Dvor220BlockId, Dvor220FaceplateKind } from "./block-diagram-data";
import { DVOR_220_BLOCK_BY_ID } from "./block-diagram-data";
import styles from "./dvor220-block-diagram.module.css";

interface Dvor220ModuleFaceplateProps {
  kind: Dvor220FaceplateKind;
  blockId: Dvor220BlockId;
}

function Screw({ x, y, radius = 8 }: { x: number; y: number; radius?: number }) {
  return (
    <g className={styles.faceplateScrew} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      <path d={`M${x - radius * 0.55} ${y}h${radius * 1.1}M${x} ${y - radius * 0.55}v${radius * 1.1}`} />
    </g>
  );
}

function Led({ x, y, label, color = "off", align = "right" }: { x: number; y: number; label?: string; color?: "green" | "red" | "amber" | "blue" | "off"; align?: "left" | "right" | "center" }) {
  const anchor = align === "left" ? "end" : align === "center" ? "middle" : "start";
  const labelX = align === "left" ? x - 12 : align === "center" ? x : x + 12;
  return (
    <g className={styles.faceplateLed} data-color={color} aria-hidden>
      <circle cx={x} cy={y} r="6.5" />
      {label ? <text x={labelX} y={y + (align === "center" ? 23 : 4)} textAnchor={anchor}>{label}</text> : null}
    </g>
  );
}

function PushButton({ x, y, label, size = 28 }: { x: number; y: number; label?: string; size?: number }) {
  return (
    <g className={styles.faceplateButton} aria-hidden>
      <rect x={x - size / 2 - 4} y={y - size / 2 - 4} width={size + 8} height={size + 8} rx="3" />
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx="2" />
      {label ? <text x={x} y={y + size / 2 + 18} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function TestJack({ x, y, label, color = "red" }: { x: number; y: number; label?: string; color?: "red" | "black" }) {
  return (
    <g className={styles.faceplateTestJack} data-color={color} aria-hidden>
      <circle cx={x} cy={y} r="8" />
      <circle cx={x} cy={y} r="3" />
      {label ? <text x={x + 14} y={y + 4}>{label}</text> : null}
    </g>
  );
}

function Coax({ x, y, label, radius = 18 }: { x: number; y: number; label?: string; radius?: number }) {
  return (
    <g className={styles.faceplateCoax} aria-hidden>
      <circle cx={x} cy={y} r={radius + 5} />
      <circle cx={x} cy={y} r={radius} />
      <circle cx={x} cy={y} r={radius * 0.36} />
      {label ? <text x={x} y={y - radius - 12} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function BoxHeader({ x, y, pins, label }: { x: number; y: number; pins: 10 | 14; label?: string }) {
  const rows = pins / 2;
  return (
    <g className={styles.faceplateHeader} aria-hidden>
      <rect x={x - 18} y={y - rows * 5 - 6} width="36" height={rows * 10 + 12} rx="2" />
      {Array.from({ length: rows }, (_, row) => (
        <g key={row}>
          <circle cx={x - 7} cy={y - (rows - 1) * 5 + row * 10} r="2.4" />
          <circle cx={x + 7} cy={y - (rows - 1) * 5 + row * 10} r="2.4" />
        </g>
      ))}
      {label ? <text x={x} y={y + rows * 5 + 19} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function PullHandle({ x, y, height }: { x: number; y: number; height: number }) {
  return (
    <g className={styles.faceplateHandle} aria-hidden>
      <rect x={x - 13} y={y} width="26" height={height} rx="13" />
      <path d={`M${x} ${y + 22}v${height - 44}`} />
      <circle cx={x} cy={y + 18} r="4" />
      <circle cx={x} cy={y + height - 18} r="4" />
    </g>
  );
}

function PanelFrame({ width, height, title, partNumber, children }: { width: number; height: number; title: string; partNumber?: string; children: React.ReactNode }) {
  const gradientId = `dvor220-faceplate-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return (
    <svg className={styles.moduleFaceplate} width={width} height={height} style={{ aspectRatio: `${width} / ${height}` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Mặt panel ${title}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f2f3ef" />
          <stop offset="0.28" stopColor="#c4cac7" />
          <stop offset="0.52" stopColor="#eef0ed" />
          <stop offset="0.78" stopColor="#a5afae" />
          <stop offset="1" stopColor="#d9ddda" />
        </linearGradient>
      </defs>
      <rect className={styles.faceplateShadow} x="8" y="8" width={width - 16} height={height - 16} rx="8" />
      <rect className={styles.faceplateBody} x="4" y="4" width={width - 16} height={height - 16} rx="5" fill={`url(#${gradientId})`} />
      <rect className={styles.faceplateTitleStrip} x="12" y="12" width={width - 32} height="42" rx="3" />
      <text className={styles.faceplateTitle} x={width / 2 - 4} y="40" textAnchor="middle">{title}</text>
      <Screw x={width / 2 - 4} y={24} radius={7} />
      <Screw x={width / 2 - 4} y={height - 28} radius={7} />
      {children}
      <text className={styles.faceplatePartNumber} x={width - 28} y={height - 17} textAnchor="end">{partNumber ?? "MOPIENS 220 DVOR"}</text>
    </svg>
  );
}

function LmiFaceplate() {
  return (
    <PanelFrame width={900} height={520} title="LOCAL MAINTENANCE INTERFACE" partNumber="1A6 · 0130-7530">
      <rect className={styles.lmiFaceScreenFrame} x="48" y="82" width="648" height="362" rx="8" />
      <rect className={styles.lmiFaceScreen} x="66" y="100" width="612" height="326" rx="5" />
      <text className={styles.lmiFaceBrand} x="372" y="242" textAnchor="middle">220 DVOR</text>
      <text className={styles.lmiFaceSubBrand} x="372" y="270" textAnchor="middle">LOCAL STATUS / MAINTENANCE</text>
      <rect className={styles.lmiRightPanel} x="720" y="82" width="136" height="362" rx="8" />
      {[
        ["NORMAL", "green"], ["WARNING", "amber"], ["ALARM", "red"], ["MAINT", "blue"],
      ].map(([label, color], index) => (
        <g key={label}>
          <rect className={styles.lmiLampWindow} x="746" y={105 + index * 66} width="84" height="42" rx="5" />
          <Led x={760} y={126 + index * 66} color={color as "green" | "amber" | "red" | "blue"} />
          <text className={styles.lmiLampLabel} x="789" y={132 + index * 66} textAnchor="middle">{label}</text>
        </g>
      ))}
      <text className={styles.faceplateSmallLabel} x="788" y="382" textAnchor="middle">LOCAL · REM · MAINT</text>
      <circle className={styles.keylockOuter} cx="788" cy="410" r="25" />
      <circle className={styles.keylockInner} cx="788" cy="410" r="16" />
      <path className={styles.keylockKey} d="M788 393v44m0-7h18v10h-18" />
    </PanelFrame>
  );
}

function CspFaceplate() {
  const rowY = [126, 188, 250, 312];
  return (
    <PanelFrame width={300} height={850} title="CSP" partNumber="0230-7560">
      <text className={styles.faceplateSectionTitle} x="150" y="82" textAnchor="middle">TRANSMITTER</text>
      <text className={styles.faceplateSmallLabel} x="74" y="106" textAnchor="middle">1</text>
      <text className={styles.faceplateSmallLabel} x="226" y="106" textAnchor="middle">2</text>
      {rowY.map((y, index) => (
        <g key={y}>
          <PushButton x={74} y={y} size={30} />
          <PushButton x={226} y={y} size={30} />
          <path className={styles.cspBusLine} d={`M94 ${y}h34m44 0h34`} />
          <text className={styles.cspCenterLabel} x="150" y={y + 5} textAnchor="middle">{["MAIN", "ON ANT", "POWER", "ENABLE"][index]}</text>
        </g>
      ))}
      <Led x={42} y={188} label="LOAD" color="green" align="center" />
      <Led x={258} y={188} label="LOAD" color="green" align="center" />
      <Led x={74} y={219} color="red" />
      <Led x={226} y={219} color="red" align="left" />
      <text className={styles.cspCenterLabel} x="150" y="224" textAnchor="middle">FAULT</text>
      <PushButton x={38} y={312} size={26} />
      <PushButton x={262} y={312} size={26} />
      <text className={styles.faceplateSmallLabel} x="38" y="348" textAnchor="middle">SMA</text>
      <text className={styles.faceplateSmallLabel} x="74" y="348" textAnchor="middle">CMA</text>
      <text className={styles.faceplateSmallLabel} x="226" y="348" textAnchor="middle">CMA</text>
      <text className={styles.faceplateSmallLabel} x="262" y="348" textAnchor="middle">SMA</text>
      <path className={styles.faceplateDivider} d="M24 366h252" />
      <text className={styles.faceplateSectionTitle} x="150" y="392" textAnchor="middle">MONITOR</text>
      {[
        ["NORMAL", "green"], ["WARNING", "amber"], ["ALARM", "red"],
      ].map(([label, color], row) => (
        <g key={label}>
          {[54, 94, 206, 246].map((x) => <Led key={x} x={x} y={426 + row * 38} color={color as "green" | "amber" | "red"} />)}
          <text className={styles.cspCenterLabel} x="150" y={431 + row * 38} textAnchor="middle">{label}</text>
        </g>
      ))}
      <text className={styles.faceplateSmallLabel} x="54" y="411" textAnchor="middle">EXEC</text>
      <text className={styles.faceplateSmallLabel} x="94" y="411" textAnchor="middle">STBY</text>
      <text className={styles.faceplateSmallLabel} x="206" y="411" textAnchor="middle">STBY</text>
      <text className={styles.faceplateSmallLabel} x="246" y="411" textAnchor="middle">EXEC</text>
      <PushButton x={74} y={552} label="BYPASS" size={30} />
      <PushButton x={226} y={552} label="BYPASS" size={30} />
      <path className={styles.faceplateDivider} d="M24 600h252" />
      <Led x={54} y={630} label="CHANGEOVER" color="amber" />
      <Led x={54} y={662} label="ANT FAULT" color="red" />
      <PushButton x={232} y={632} label="RESET" size={28} />
      <Led x={54} y={700} label="AC MAIN" color="green" />
      <Led x={54} y={730} label="ON BAT" color="amber" />
      <Led x={54} y={760} label="ENVIRONMENT" color="red" />
      <PushButton x={232} y={706} label="LAMP TEST" size={28} />
      <PushButton x={232} y={774} label="SILENCE" size={28} />
      <g className={styles.volumeScrew} aria-hidden>
        <circle cx="150" cy="790" r="13" />
        <circle cx="150" cy="790" r="6" />
        <path d="M143 790h14" />
        <text x="150" y="816" textAnchor="middle">VOLUME</text>
      </g>
    </PanelFrame>
  );
}

function GenericCard({ blockId }: { blockId: Dvor220BlockId }) {
  const block = DVOR_220_BLOCK_BY_ID.get(blockId)!;
  const title = block.shortName;
  const isTsg = blockId === "tsg";
  const isScu = blockId === "scu";
  return (
    <PanelFrame width={190} height={720} title={title} partNumber={block.partNumber}>
      <Led x={70} y={92} label="POWER" color="green" />
      <Led x={70} y={122} label="FAULT" color="off" />
      {isTsg ? <Led x={70} y={152} label="PLL FAIL" color="off" /> : null}
      {isScu ? <Led x={70} y={152} label="MASTER" color="green" /> : null}
      <BoxHeader x={95} y={230} pins={14} label="MCU JTAG" />
      <PushButton x={95} y={318} label="RESET" size={25} />
      <BoxHeader x={95} y={404} pins={10} label="CPLD / SERVICE" />
      {isTsg ? <Coax x={95} y={530} label="VOR RF SIGNAL" radius={16} /> : null}
      {isScu ? (
        <>
          <TestJack x={70} y={520} label="CAN TxD" />
          <TestJack x={70} y={556} label="CAN RxD" />
        </>
      ) : null}
      {!isTsg && !isScu ? (
        <>
          <rect className={styles.faceplateConnector} x="53" y="500" width="84" height="50" rx="4" />
          <text className={styles.faceplateSmallLabel} x="95" y="570" textAnchor="middle">I/O · CAN · SERVICE</text>
        </>
      ) : null}
      <text className={styles.faceplateVerticalBrand} x="31" y="390" transform="rotate(-90 31 390)" textAnchor="middle">MOPIENS 220 DVOR</text>
    </PanelFrame>
  );
}

function DcdcFaceplate({ auxiliary }: { auxiliary: boolean }) {
  const values = auxiliary ? ["+5V", "+15V", "-15V", "GND"] : ["+5V", "+8V", "+15V", "-15V", "+28V", "+50V", "GND"];
  return (
    <PanelFrame width={auxiliary ? 230 : 260} height={720} title={auxiliary ? "DC/DC-A" : "DC/DC"} partNumber={auxiliary ? "0130-7720" : "0230-7710"}>
      <PullHandle x={54} y={170} height={330} />
      <Led x={auxiliary ? 132 : 145} y={100} label="POWER ON" color="green" />
      <Led x={auxiliary ? 132 : 145} y={136} label="INPUT FAULT" color="off" />
      <Led x={auxiliary ? 132 : 145} y={172} label="OUTPUT FAULT" color="off" />
      {values.map((label, index) => (
        <TestJack key={label} x={auxiliary ? 116 : 132} y={250 + index * (auxiliary ? 58 : 48)} label={label} color={label === "GND" ? "black" : "red"} />
      ))}
      <text className={styles.faceplateVerticalBrand} x={auxiliary ? 202 : 230} y="400" transform={`rotate(-90 ${auxiliary ? 202 : 230} 400)`} textAnchor="middle">INPUT +28 VDC · HOT SWAP</text>
    </PanelFrame>
  );
}

function SmaFaceplate() {
  return (
    <PanelFrame width={250} height={720} title="SMA" partNumber="0230-7160">
      <PullHandle x={54} y={170} height={340} />
      <Led x={142} y={100} label="POWER" color="green" />
      <text className={styles.faceplateSmallLabel} x="112" y="145" textAnchor="end">COS</text>
      <Led x={142} y={140} label="RF ON" color="green" />
      <text className={styles.faceplateSmallLabel} x="112" y="183" textAnchor="end">SIN</text>
      <Led x={142} y={178} label="RF ON" color="green" />
      <text className={styles.faceplateSmallLabel} x="112" y="239" textAnchor="end">COS</text>
      <Led x={142} y={234} label="FAULT" color="off" />
      <text className={styles.faceplateSmallLabel} x="112" y="277" textAnchor="end">SIN</text>
      <Led x={142} y={272} label="FAULT" color="off" />
      <Coax x={144} y={472} label="J5 · COS ENV" radius={19} />
      <Coax x={144} y={560} label="J6 · SIN ENV" radius={19} />
      <text className={styles.faceplateVerticalBrand} x="214" y="390" transform="rotate(-90 214 390)" textAnchor="middle">SIDEBAND MODULATION AMPLIFIER</text>
    </PanelFrame>
  );
}

function CmaFaceplate() {
  return (
    <PanelFrame width={280} height={720} title="CMA" partNumber="0230-7140">
      <PullHandle x={58} y={170} height={340} />
      <Led x={160} y={112} label="POWER" color="green" />
      <Led x={160} y={160} label="RF ON" color="green" />
      <Led x={160} y={208} label="FAULT" color="off" />
      <Coax x={164} y={520} label="J2 · ENV" radius={24} />
      <text className={styles.faceplateVerticalBrand} x="246" y="390" transform="rotate(-90 246 390)" textAnchor="middle">CARRIER MODULATION AMPLIFIER</text>
    </PanelFrame>
  );
}

function MsgFaceplate() {
  return (
    <PanelFrame width={210} height={720} title="MSG" partNumber="0130-7510">
      <Led x={75} y={90} label="POWER" color="green" />
      <Led x={75} y={122} label="FAULT" color="off" />
      <BoxHeader x={105} y={205} pins={14} label="MCU JTAG" />
      <BoxHeader x={105} y={312} pins={10} label="CPLD JTAG" />
      <PushButton x={105} y={386} label="RESET" size={24} />
      <Coax x={105} y={456} label="30 Hz SYNC" radius={15} />
      {[
        ["TP49", "CARRIER MOD"], ["TP61", "USB COS"], ["TP62", "LSB COS"], ["TP63", "USB SIN"], ["TP64", "LSB SIN"],
      ].map(([id, label], index) => <TestJack key={id} x={70} y={520 + index * 30} label={`${id} · ${label}`} />)}
    </PanelFrame>
  );
}

function SynFaceplate() {
  return (
    <PanelFrame width={210} height={720} title="SYN" partNumber="0230-7130">
      <Coax x={105} y={95} label="J1 · CSB MON" radius={17} />
      <Led x={76} y={155} label="POWER" color="green" />
      <Led x={76} y={188} label="PLL FAIL" color="off" />
      <Led x={76} y={221} label="ERROR" color="off" />
      <BoxHeader x={105} y={300} pins={14} label="SERVICE" />
      <PushButton x={105} y={375} label="RESET" size={24} />
      {["TP33 USB COS", "TP34 USB SIN", "TP35 LSB COS", "TP36 LSB SIN"].map((label, index) => <TestJack key={label} x={70} y={445 + index * 35} label={label} />)}
      <Coax x={105} y={625} label="J6 · 40 MHz MON" radius={17} />
    </PanelFrame>
  );
}

function MonFaceplate() {
  const indicators: readonly [string, "green" | "red" | "amber" | "off"][] = [
    ["POWER", "green"], ["FAULT", "off"], ["INTEGRAL ALARM", "off"], ["INTEGRAL WARNING", "off"],
    ["SECONDARY ALARM", "off"], ["STANDBY ALARM", "off"], ["STANDBY WARNING", "off"], ["IDENTITY CODE", "green"],
  ];
  return (
    <PanelFrame width={220} height={720} title="MON" partNumber="0230-7550">
      {indicators.map(([label, color], index) => <Led key={label} x={70} y={82 + index * 31} label={label} color={color} />)}
      <BoxHeader x={110} y={380} pins={14} label="MCU JTAG" />
      <BoxHeader x={110} y={470} pins={10} label="ZYNQ JTAG" />
      <PushButton x={110} y={535} label="RESET" size={23} />
      {[
        ["TP47", "IDENT"], ["TP48", "FM 30 Hz"], ["TP49", "BASEBAND"], ["TP51", "AM 30 Hz"],
      ].map(([id, label], index) => <TestJack key={id} x={70} y={590 + index * 29} label={`${id} · ${label}`} />)}
    </PanelFrame>
  );
}

function FanFaceplate() {
  return (
    <PanelFrame width={820} height={180} title="FAN" partNumber="0130-7910">
      <rect className={styles.fanVent} x="62" y="72" width="490" height="66" rx="4" />
      {[0, 1, 2, 3].map((fan) => (
        <g key={fan} className={styles.fanSymbol} aria-hidden>
          <circle cx={130 + fan * 118} cy="105" r="26" />
          <path d={`M${130 + fan * 118} 105c20-22 30 3 6 8c21 16 1 32-8 8c-17 20-31-1-8-10c-21-17 3-31 10-6Z`} />
        </g>
      ))}
      <Led x={600} y={82} label="POWER" color="green" />
      {["FAN 1 FAULT", "FAN 2 FAULT", "FAN 3 FAULT", "FAN 4 FAULT"].map((label, index) => <Led key={label} x={600} y={108 + index * 14} label={label} color="off" />)}
      <rect className={styles.faceplateConnector} x="728" y="86" width="48" height="38" rx="3" />
      <text className={styles.faceplateSmallLabel} x="752" y="142" textAnchor="middle">6-PIN CONTROL</text>
    </PanelFrame>
  );
}

function PdcFaceplate() {
  return (
    <PanelFrame width={900} height={300} title="PDC · POWER DETECTOR / CHANGEOVER" partNumber="0233-7310">
      <Led x={820} y={78} label="POWER" color="green" align="left" />
      {["J20 · LSB COS", "J21 · LSB SIN", "J22 · USB COS", "J23 · USB SIN", "J24 · CARRIER"].map((label, index) => (
        <Coax key={label} x={108 + index * 162} y={164} label={label} radius={22} />
      ))}
      <PullHandle x={450} y={198} height={50} />
      <text className={styles.faceplateSmallLabel} x="450" y="270" textAnchor="middle">ACTIVE PATH RF MONITOR PORTS · -30 dB COUPLED SAMPLE</text>
    </PanelFrame>
  );
}

function PowerSwitchFaceplate() {
  return (
    <PanelFrame width={700} height={340} title="POWER SWITCH PANEL" partNumber="1A4">
      <circle className={styles.acAvailableLamp} cx="96" cy="118" r="34" />
      <text className={styles.faceplateSectionTitle} x="96" y="174" textAnchor="middle">AC AVAILABLE</text>
      {[
        [230, "AC MAIN"], [390, "BATT 1"], [550, "BATT 2"],
      ].map(([x, label]) => (
        <g key={label as string} className={styles.breaker} aria-hidden>
          <rect x={Number(x) - 55} y="88" width="110" height="146" rx="5" />
          <rect x={Number(x) - 24} y="116" width="48" height="76" rx="4" />
          <path d={`M${Number(x) - 15} 158h30`} />
          <text x={Number(x)} y="262" textAnchor="middle">{label}</text>
        </g>
      ))}
    </PanelFrame>
  );
}

function PmuFaceplate() {
  return (
    <PanelFrame width={720} height={360} title="PMU · POWER MANAGEMENT UNIT" partNumber="0130-7730">
      <BoxHeader x={92} y={112} pins={14} label="MCU JTAG" />
      <TestJack x={170} y={102} label="GND" color="black" />
      <TestJack x={170} y={136} label="BAT VOLT" />
      <TestJack x={170} y={170} label="ACDC VOLT" />
      <rect className={styles.pmuDisplay} x="250" y="86" width="164" height="84" rx="5" />
      <text className={styles.pmuDigits} x="332" y="140" textAnchor="middle">28.0</text>
      <Led x={470} y={102} label="ON BATT" color="off" />
      <Led x={470} y={136} label="AC FAIL" color="off" />
      <Led x={470} y={170} label="BAT CHARGE" color="amber" />
      {[
        [270, "PMU TEMP"], [350, "ACDC I"], [430, "ACDC V"], [510, "BATT I"], [590, "BATT V"],
      ].map(([x, label]) => <PushButton key={label as string} x={Number(x)} y={235} label={label as string} size={27} />)}
      <PushButton x={650} y={118} label="RESET" size={27} />
    </PanelFrame>
  );
}

function AcdcFaceplate() {
  return (
    <PanelFrame width={480} height={220} title="AC/DC CONVERTER" partNumber="3151-0016 · 28 VDC / 1600 W">
      <g className={styles.acdcVent} aria-hidden>
        {[150, 310].map((x) => (
          <g key={x}>
            <circle cx={x} cy="124" r="50" />
            {Array.from({ length: 8 }, (_, index) => <path key={index} d={`M${x - 38} ${92 + index * 9}h76`} />)}
          </g>
        ))}
      </g>
      <Led x={58} y={104} label="DC OK" color="green" />
      <Led x={58} y={144} label="AC OK" color="green" />
      <circle className={styles.acdcRelease} cx="420" cy="124" r="18" />
      <path className={styles.acdcRelease} d="M410 124h20" />
      <text className={styles.faceplateSmallLabel} x="420" y="166" textAnchor="middle">RELEASE</text>
    </PanelFrame>
  );
}

function AsuFaceplate() {
  return (
    <PanelFrame width={720} height={800} title="ANTENNA SWITCHING UNIT" partNumber="2A1 · 0233-7210 / 0233-7211">
      <rect className={styles.asuFaceInterior} x="42" y="78" width="620" height="660" rx="7" />
      <rect className={styles.asuFaceBoard} x="78" y="112" width="250" height="112" rx="4" />
      <text className={styles.faceplateSectionTitle} x="203" y="142" textAnchor="middle">ASU INTERFACE · 2A1A1</text>
      <rect className={styles.asuFaceBoard} x="392" y="112" width="230" height="112" rx="4" />
      <text className={styles.faceplateSectionTitle} x="507" y="142" textAnchor="middle">TOGGLE MODULE · 2A1A2</text>
      {[
        [78, 270, "SM COS LO · 2A1A3"], [372, 270, "SM COS HI · 2A1A4"],
        [78, 448, "SM SIN LO · 2A1A5"], [372, 448, "SM SIN HI · 2A1A6"],
      ].map(([x, y, label]) => (
        <g key={label as string}>
          <rect className={styles.asuFaceBoard} x={Number(x)} y={Number(y)} width="270" height="140" rx="4" />
          <text className={styles.faceplateSectionTitle} x={Number(x) + 135} y={Number(y) + 28} textAnchor="middle">{label}</text>
          <circle className={styles.asuRfInput} cx={Number(x) + 42} cy={Number(y) + 82} r="13" />
          {Array.from({ length: 6 }, (_, index) => <circle key={index} className={styles.asuRfOutput} cx={Number(x) + 166 + (index % 3) * 38} cy={Number(y) + 66 + Math.floor(index / 3) * 42} r="8" />)}
        </g>
      ))}
      <rect className={styles.asuPowerMeterPanel} x="78" y="630" width="544" height="80" rx="4" />
      <circle className={styles.asuAnalogMeter} cx="142" cy="670" r="28" />
      {[230, 308, 386, 464, 542].map((x) => <circle key={x} className={styles.asuSelector} cx={x} cy="670" r="19" />)}
    </PanelFrame>
  );
}

export function Dvor220ModuleFaceplate({ kind, blockId }: Dvor220ModuleFaceplateProps) {
  switch (kind) {
    case "lmi": return <LmiFaceplate />;
    case "csp": return <CspFaceplate />;
    case "card": return <GenericCard blockId={blockId} />;
    case "dcdc-aux": return <DcdcFaceplate auxiliary />;
    case "sma": return <SmaFaceplate />;
    case "cma": return <CmaFaceplate />;
    case "dcdc-tx": return <DcdcFaceplate auxiliary={false} />;
    case "msg": return <MsgFaceplate />;
    case "syn": return <SynFaceplate />;
    case "mon": return <MonFaceplate />;
    case "fan": return <FanFaceplate />;
    case "pdc": return <PdcFaceplate />;
    case "power-switch": return <PowerSwitchFaceplate />;
    case "pmu": return <PmuFaceplate />;
    case "acdc": return <AcdcFaceplate />;
    case "asu": return <AsuFaceplate />;
  }
}
