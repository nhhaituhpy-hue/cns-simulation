import { createContext, useContext, useId } from "react";
import type { Dvor220BlockId, Dvor220FaceplateKind, Dvor220TestPoint } from "./block-diagram-data";
import { DVOR_220_BLOCK_BY_ID } from "./block-diagram-data";
import styles from "./dvor220-block-diagram.module.css";

interface Dvor220ModuleFaceplateProps {
  kind: Dvor220FaceplateKind;
  blockId: Dvor220BlockId;
  onSelectPoint?: (point: Dvor220TestPoint) => void;
}

const MeasurementContext = createContext<{ points: readonly Dvor220TestPoint[]; onSelect?: (point: Dvor220TestPoint) => void }>({ points: [] });

function MeasurementConnector({ pointId, label, kind, x, y, children }: { pointId?: string; label?: string; kind: "test-pin" | "test-jack" | "bnc"; x: number; y: number; children: React.ReactNode }) {
  const { points, onSelect } = useContext(MeasurementContext);
  const compact = (value: string) => value.replaceAll(/\s/g, "").toLowerCase();
  const point = points.find((item) => pointId
    ? item.id === pointId || item.id.split(/\s*\/\s*/).includes(pointId)
    : label && (compact(item.label) === compact(label) || compact(item.label).startsWith(compact(label))));
  const interactive = !!point && !!onSelect;
  const targetHeight = kind === "bnc" ? 40 : kind === "test-jack" ? 26 : 16;
  const targetWidth = kind === "test-jack" ? 24 : 46;
  return <g className={styles.measurementConnector} data-connector-kind={kind} data-point-id={point?.id} role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
    aria-label={interactive ? `Xem tín hiệu ${point.id} ${point.label} trên panel` : undefined}
    onClick={interactive ? () => onSelect(point) : undefined}
    onKeyDown={interactive ? (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(point); }
    } : undefined}>
    {interactive ? <rect className={styles.measurementHitTarget} x={x - targetWidth / 2} y={y - targetHeight / 2} width={targetWidth} height={targetHeight} rx="4" /> : null}
    {children}
  </g>;
}

function TestPin({ x, y, id, label }: { x: number; y: number; id: string; label: string }) {
  return <MeasurementConnector pointId={id} label={label} kind="test-pin" x={x} y={y}>
    <g className={styles.faceplateTestPin} aria-hidden>
      <rect x={x - 5} y={y - 5} width="10" height="10" rx="1" />
      <path d={`M${x} ${y - 9}v18`} />
      <text x={x + 14} y={y + 4}>{label.startsWith(id) ? label : `${id} · ${label}`}</text>
    </g>
  </MeasurementConnector>;
}

function Screw({ x, y, radius = 8 }: { x: number; y: number; radius?: number }) {
  return (
    <g className={styles.faceplateScrew} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      <path d={`M${x - radius * 0.55} ${y}h${radius * 1.1}M${x} ${y - radius * 0.55}v${radius * 1.1}`} />
    </g>
  );
}

function Led({ x, y, label, color = "off", align = "right", lit = true }: { x: number; y: number; label?: string; color?: "green" | "red" | "amber" | "blue" | "off"; align?: "left" | "right" | "center"; lit?: boolean }) {
  const anchor = align === "left" ? "end" : align === "center" ? "middle" : "start";
  const labelX = align === "left" ? x - 12 : align === "center" ? x : x + 12;
  return (
    <g className={styles.faceplateLed} data-color={color} data-unlit={lit ? undefined : ""} aria-hidden>
      <circle cx={x} cy={y} r="6.5" />
      {label ? <text x={labelX} y={y + (align === "center" ? 23 : 4)} textAnchor={anchor}>{label}</text> : null}
    </g>
  );
}

function PushButton({ x, y, label, size = 28, lamp }: { x: number; y: number; label?: string; size?: number; lamp?: "green" | "amber" }) {
  return (
    <g className={styles.faceplateButton} aria-hidden>
      <rect x={x - size / 2 - 4} y={y - size / 2 - 4} width={size + 8} height={size + 8} rx="3" />
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx="2" />
      {lamp ? <Led x={x} y={y} color={lamp} /> : null}
      {label ? <text x={x} y={y + size / 2 + 18} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function TestJack({ x, y, pointId, label, color = "red" }: { x: number; y: number; pointId: string; label?: string; color?: "red" | "black" }) {
  return (
    <MeasurementConnector pointId={pointId} label={label} kind="test-jack" x={x} y={y}>
    <g className={styles.faceplateTestJack} data-color={color} aria-hidden>
      <circle cx={x} cy={y} r="8" />
      <circle cx={x} cy={y} r="3" />
      {label ? <text x={x + 14} y={y + 4}>{label}</text> : null}
    </g>
    </MeasurementConnector>
  );
}

function Coax({ x, y, pointId, label, radius = 18, labelRight = false, flange = false }: { x: number; y: number; pointId?: string; label?: string; radius?: number; labelRight?: boolean; flange?: boolean }) {
  return (
    <MeasurementConnector pointId={pointId ?? label?.match(/^J\d+/)?.[0] ?? (label === "VOR RF SIGNAL" ? "BNC" : undefined)} label={label} kind="bnc" x={x} y={y}>
    <g className={styles.faceplateCoax} aria-hidden>
      {flange ? <rect x={x - radius - 8} y={y - radius - 8} width={(radius + 8) * 2} height={(radius + 8) * 2} rx="2" /> : null}
      <circle cx={x} cy={y} r={radius + 5} />
      <circle cx={x} cy={y} r={radius} />
      <circle cx={x} cy={y} r={radius * 0.36} />
      {label ? <text x={labelRight ? x + radius + 13 : x} y={labelRight ? y + 4 : y - radius - 12} textAnchor={labelRight ? "start" : "middle"}>{label}</text> : null}
    </g>
    </MeasurementConnector>
  );
}

function BoxHeader({ x, y, pins, label, labelRight = false, horizontal = false }: { x: number; y: number; pins: 10 | 14; label?: string; labelRight?: boolean; horizontal?: boolean }) {
  const rows = pins / 2;
  return (
    <g className={styles.faceplateHeader} aria-hidden>
      <g transform={horizontal ? `rotate(90 ${x} ${y})` : undefined}>
        <rect x={x - 18} y={y - rows * 5 - 6} width="36" height={rows * 10 + 12} rx="2" />
        {Array.from({ length: rows }, (_, row) => (
          <g key={row}>
            <circle cx={x - 7} cy={y - (rows - 1) * 5 + row * 10} r="2.4" />
            <circle cx={x + 7} cy={y - (rows - 1) * 5 + row * 10} r="2.4" />
          </g>
        ))}
      </g>
      {label ? <text x={labelRight ? x + 24 : x} y={y + (labelRight ? 4 : horizontal ? 30 : rows * 5 + 19)} textAnchor={labelRight ? "start" : "middle"}>{label}</text> : null}
    </g>
  );
}

function PullHandle({ x, y, height, horizontal = false }: { x: number; y: number; height: number; horizontal?: boolean }) {
  return (
    <g className={styles.faceplateHandle} transform={horizontal ? `rotate(-90 ${x} ${y})` : undefined} aria-hidden>
      <rect x={x - 13} y={y} width="26" height={height} rx="13" />
      <path d={`M${x} ${y + 22}v${height - 44}`} />
      <circle cx={x} cy={y + 18} r="4" />
      <circle cx={x} cy={y + height - 18} r="4" />
    </g>
  );
}

function PanelFrame({ width, height, title, partNumber, mounting = "screw", ejectorHeight = 98, bodyInset = 0, children }: { width: number; height: number; title: string; partNumber?: string; mounting?: "screw" | "ejector" | "plain"; ejectorHeight?: number; bodyInset?: number; children: React.ReactNode }) {
  const gradientId = useId();
  const { onSelect } = useContext(MeasurementContext);
  return (
    <svg className={styles.moduleFaceplate} width={width} height={height} style={{ aspectRatio: `${width} / ${height}` }} viewBox={`0 0 ${width} ${height}`} role={onSelect ? "group" : "img"} aria-label={`Mặt panel ${title}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f2f3ef" />
          <stop offset="0.28" stopColor="#c4cac7" />
          <stop offset="0.52" stopColor="#eef0ed" />
          <stop offset="0.78" stopColor="#a5afae" />
          <stop offset="1" stopColor="#d9ddda" />
        </linearGradient>
      </defs>
      <rect className={styles.faceplateShadow} x="8" y={8 + bodyInset} width={width - 16} height={height - 16 - bodyInset * 2} rx="8" />
      <rect className={styles.faceplateBody} x="4" y={4 + bodyInset} width={width - 16} height={height - 16 - bodyInset * 2} rx="5" fill={`url(#${gradientId})`} />
      {mounting === "screw" ? <>
        <rect className={styles.faceplateTitleStrip} x="12" y="12" width={width - 32} height="42" rx="3" />
        <text className={styles.faceplateTitle} x={width / 2 - 4} y="40" textAnchor="middle">{title}</text>
        <Screw x={width / 2 - 4} y={24} radius={7} />
        <Screw x={width / 2 - 4} y={height - 28} radius={7} />
      </> : null}
      {mounting === "ejector" ? <>
        {[8, height - ejectorHeight - 12].map((y) => (
          <g key={y} className={styles.faceplateEjector} aria-hidden>
            <rect x="34" y={y} width="48" height={ejectorHeight} rx="4" />
            <path d={`M34 ${y + 18}h48m-48 ${ejectorHeight - 36}h48`} />
          </g>
        ))}
        <text className={styles.faceplateTitle} x={width - 28} y="46" textAnchor="end">{title}</text>
      </> : null}
      {children}
      {partNumber || mounting === "screw" ? <text className={styles.faceplatePartNumber} x={width - 28} y={height - 17} textAnchor="end">{partNumber ?? "MOPIENS 220 DVOR"}</text> : null}
    </svg>
  );
}

function LmiFaceplate() {
  return (
    <PanelFrame width={900} height={485} title="LOCAL MAINTENANCE INTERFACE" mounting="plain">
      <rect className={styles.lmiFaceScreenFrame} x="103" y="57" width="602" height="360" rx="3" />
      <rect className={styles.lmiRightPanel} x="725" y="49" width="149" height="377" rx="9" />
      {["NORMAL", "WARNING", "ALARM", "MAINT"].map((label, index) => (
        <g key={label}>
          <rect className={styles.lmiLampWindow} x="754" y={71 + index * 66} width="91" height="38" rx="5" />
          <text className={styles.lmiLampLabel} x="799.5" y={97 + index * 66} textAnchor="middle">{label}</text>
        </g>
      ))}
      {["LOCAL", "REM", "MAINT"].map((label, index) => (
        <text key={label} className={styles.lmiLockLabel} x={756 + index * 43} y="345" textAnchor="middle">{label}</text>
      ))}
      <g aria-hidden data-control-kind="keylock">
        <rect className={styles.keylockOuter} x="766" y="355" width="67" height="53" rx="3" />
        <circle className={styles.keylockInner} cx="799.5" cy="381" r="22" />
        <path className={styles.keylockKey} d="M799.5 361v43" />
        <circle className={styles.keylockRing} cx="799.5" cy="409" r="13" />
        <path className={styles.keylockKey} d="M799.5 417v34" />
      </g>
    </PanelFrame>
  );
}

function CspFaceplate() {
  const rowY = [104, 149, 234, 277];
  return (
    <PanelFrame width={300} height={850} title="CSP" partNumber="0230-7560" mounting="plain">
      <rect className={styles.faceplateTitleStrip} x="4" y="4" width="284" height="33" />
      <rect className={styles.faceplateTitleStrip} x="4" y="807" width="284" height="31" />
      <Screw x={146} y={20} radius={12} />
      <Screw x={146} y={822} radius={12} />
      <text className={styles.faceplateSmallLabel} x="272" y="822" textAnchor="end">CSP</text>
      <text className={styles.faceplateSectionTitle} x="150" y="66" textAnchor="middle">TRANSMITTER</text>
      <text className={styles.faceplateSmallLabel} x="74" y="66" textAnchor="middle">1</text>
      <text className={styles.faceplateSmallLabel} x="226" y="66" textAnchor="middle">2</text>
      {rowY.map((y, index) => (
        <g key={y}>
          <PushButton x={74} y={y} size={28} lamp="green" />
          <PushButton x={226} y={y} size={28} lamp="green" />
          <path className={styles.cspBusLine} d={`M94 ${y}h34m44 0h34`} />
          <text className={styles.cspCenterLabel} x="150" y={y + 5} textAnchor="middle">{["MAIN", "ON ANT", "POWER", "ENABLE"][index]}</text>
        </g>
      ))}
      <Led x={34} y={149} label="LOAD" color="green" align="center" />
      <Led x={266} y={149} label="LOAD" color="green" align="center" />
      <path className={styles.cspBusLine} d="M40 149h16m188 0h16M74 122v10m152-10v10M74 168v48m152-48v48M74 252v8m152-8v8M54 277h3m187 0h3" />
      <Led x={74} y={191} color="red" />
      <Led x={226} y={191} color="red" />
      <text className={styles.cspCenterLabel} x="150" y="196" textAnchor="middle">FAULT</text>
      <PushButton x={37} y={277} size={24} lamp="green" />
      <PushButton x={263} y={277} size={24} lamp="green" />
      {[[37, "SMA"], [74, "CMA"], [226, "CMA"], [263, "SMA"]].map(([x, label]) => (
        <text key={x} className={styles.faceplateSmallLabel} x={x} y="309" textAnchor="middle">{label}</text>
      ))}
      <path className={styles.faceplateDivider} d="M24 322h252" />
      <text className={styles.faceplateSectionTitle} x="150" y="343" textAnchor="middle">MONITOR</text>
      <text className={styles.faceplateSmallLabel} x="74" y="343" textAnchor="middle">1</text>
      <text className={styles.faceplateSmallLabel} x="226" y="343" textAnchor="middle">2</text>
      <path className={styles.cspBusLine} d="M54 379v74m40-74v74m112-74v74m40-74v74M54 391h65m62 0h65M54 422h65m62 0h65M54 453h65m62 0h65M74 453v36m152-36v36" />
      {[
        ["NORMAL", "green"], ["WARNING", "amber"], ["ALARM", "red"],
      ].map(([label, color], row) => (
        <g key={label}>
          {[54, 94, 206, 246].map((x) => <Led key={x} x={x} y={391 + row * 31} color={color as "green" | "amber" | "red"} />)}
          <text className={styles.cspCenterLabel} x="150" y={396 + row * 31} textAnchor="middle">{label}</text>
        </g>
      ))}
      {[[54, "EXEC"], [94, "STBY"], [206, "STBY"], [246, "EXEC"]].map(([x, label]) => (
        <text key={x} className={styles.faceplateSmallLabel} x={x} y="371" textAnchor="middle">{label}</text>
      ))}
      <PushButton x={74} y={509} size={30} lamp="amber" />
      <PushButton x={226} y={509} size={30} lamp="amber" />
      <path className={styles.cspBusLine} d="M94 509h25m62 0h25" />
      <text className={styles.cspCenterLabel} x="150" y="514" textAnchor="middle">BYPASS</text>
      <path className={styles.faceplateDivider} d="M24 541h252" />
      <Led x={66} y={570} label="CHANGEOVER" color="amber" />
      <Led x={66} y={599} label="ANT FAULT" color="red" />
      <PushButton x={232} y={574} label="RESET" size={28} lamp="green" />
      <Led x={66} y={658} label="AC MAIN" color="green" />
      <Led x={66} y={687} label="ON BAT" color="amber" />
      <Led x={66} y={716} label="ENVIRONMENT" color="red" />
      <Led x={66} y={745} label="TxD" color="green" />
      <Led x={66} y={774} label="RxD" color="green" />
      <path className={styles.cspBusLine} d="M54 658H46v29h8m0 58H46v29h8" />
      <PushButton x={232} y={639} label="LAMP TEST" size={28} lamp="green" />
      <PushButton x={232} y={704} label="SILENCE" size={28} lamp="green" />
      <g className={styles.volumeScrew} aria-hidden>
        <circle cx="232" cy="766" r="7" />
        <text x="232" y="792" textAnchor="middle">VOLUME</text>
      </g>
    </PanelFrame>
  );
}

function GenericCard({ blockId }: { blockId: Dvor220BlockId }) {
  const block = DVOR_220_BLOCK_BY_ID.get(blockId)!;
  const title = block.shortName;
  if (blockId === "tsg" || blockId === "scu") {
    const isScu = blockId === "scu";
    return (
      <PanelFrame width={190} height={720} title={title} partNumber={block.partNumber} mounting="ejector">
        <Led x={58} y={138} label="POWER" color="green" />
        <Led x={58} y={171} label="FAULT" color="red" lit={false} />
        {isScu ? <>
          <Led x={58} y={207} label="MASTER/SLAVE" color="green" />
          <TestPin x={58} y={236} id="CAN TxD" label="CAN TxD TTL" />
          <TestPin x={58} y={261} id="CAN RxD" label="CAN RxD TTL" />
        </> : <Led x={58} y={205} label="PLL FAULT" color="red" lit={false} />}
        <BoxHeader x={58} y={318} pins={14} label="MCU JTAG" labelRight />
        <PushButton x={58} y={380} size={21} />
        <text className={styles.faceplateSmallLabel} x="82" y="384">RESET</text>
        <BoxHeader x={58} y={484} pins={10} label="CPLD JTAG" labelRight />
        {!isScu ? <Coax x={58} y={554} label="VOR RF SIGNAL" radius={15} labelRight flange /> : null}
      </PanelFrame>
    );
  }
  if (blockId === "niu") {
    return (
      <PanelFrame width={190} height={720} title={title} partNumber={block.partNumber} mounting="ejector">
        <g aria-hidden>
          <rect className={styles.faceplateTitleStrip} x="37" y="306" width="42" height="48" rx="2" />
          <path className={styles.faceplateConnector} d="M43 314h30v30H64v4H52v-4H43z" />
          <text className={styles.faceplateSmallLabel} x="91" y="334">RJ1 LAN</text>
          <rect className={styles.faceplateConnector} x="44" y="409" width="28" height="12" rx="6" />
          <text className={styles.faceplateSmallLabel} x="91" y="419">USB2 TYPE-C</text>
        </g>
      </PanelFrame>
    );
  }
  if (blockId === "vau") {
    return (
      <PanelFrame width={190} height={720} title={title} partNumber={block.partNumber} mounting="ejector">
        <g aria-hidden>
          <rect className={styles.faceplateTitleStrip} x="36" y="385" width="44" height="43" rx="3" />
          <circle className={styles.faceplateConnector} cx="58" cy="406" r="11" />
          <text className={styles.faceplateSmallLabel} x="95" y="410">MIC</text>
        </g>
      </PanelFrame>
    );
  }
  return (
    <PanelFrame width={190} height={720} title={title} partNumber={block.partNumber}>
      <Led x={70} y={92} label="POWER" color="green" />
      <Led x={70} y={122} label="FAULT" color="off" />
      <BoxHeader x={95} y={230} pins={14} label="MCU JTAG" />
      <PushButton x={95} y={318} label="RESET" size={25} />
      <BoxHeader x={95} y={404} pins={10} label="CPLD / SERVICE" />
      <rect className={styles.faceplateConnector} x="53" y="500" width="84" height="50" rx="4" />
      <text className={styles.faceplateSmallLabel} x="95" y="570" textAnchor="middle">I/O · CAN · SERVICE</text>
      <text className={styles.faceplateVerticalBrand} x="31" y="390" transform="rotate(-90 31 390)" textAnchor="middle">MOPIENS 220 DVOR</text>
    </PanelFrame>
  );
}

function DcdcFaceplate({ auxiliary }: { auxiliary: boolean }) {
  if (auxiliary) {
    const jacks = [["+5 V", 371], ["+15 V", 405], ["-15 V", 437], ["GND", 472]] as const;
    return (
      <PanelFrame width={230} height={720} title="DC/DC-A" partNumber="0130-7720" mounting="ejector" ejectorHeight={212}>
        <Led x={58} y={253} label="POWER ON" color="green" />
        <Led x={58} y={289} label="INPUT VOLTAGE FAULT" color="red" lit={false} />
        <Led x={58} y={326} label="OUTPUT VOLTAGE FAULT" color="green" lit={false} />
        {jacks.map(([label, y]) => (
          <TestJack key={label} pointId={label} x={58} y={y} label={label} color={label === "GND" ? "black" : "red"} />
        ))}
      </PanelFrame>
    );
  }
  const jacks = [
    ["+5 V", 279], ["+8 V", 333], ["+15 V", 376], ["-15 V", 419],
    ["+28 V", 463], ["+50 V", 506], ["GND", 563],
  ] as const;
  return (
    <PanelFrame width={238} height={720} title="DC/DC" mounting="plain" bodyInset={64}>
      <MountingEar x={108} y={7} width={100} />
      <MountingEar x={108} y={645} width={100} />
      <text className={styles.faceplateTitle} x="108" y="96" textAnchor="middle">DC/DC</text>
      <PullHandle x={36} y={170} height={380} />
      <Led x={92} y={146} label="POWER ON" color="green" />
      <Led x={92} y={179} label="INPUT VOLTAGE FAULT" color="red" lit={false} />
      <Led x={92} y={212} label="OUTPUT VOLTAGE FAULT" color="green" lit={false} />
      {jacks.map(([label, y]) => (
        <TestJack key={label} pointId={label} x={92} y={y} label={label} color={label === "GND" ? "black" : "red"} />
      ))}
      <text className={styles.faceplateSmallLabel} x="98" y="633">0230-7710</text>
    </PanelFrame>
  );
}

function MountingEar({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g aria-hidden>
      <rect className={styles.faceplateTitleStrip} x={x - width / 2} y={y} width={width} height="61" rx="2" />
      <Screw x={x} y={y + 30.5} radius={12} />
    </g>
  );
}

function SmaFaceplate() {
  return (
    <PanelFrame width={140} height={720} title="SMA" mounting="plain" bodyInset={64}>
      <MountingEar x={85} y={7} width={86} />
      <MountingEar x={85} y={644} width={86} />
      <text className={styles.faceplateTitle} x="85" y="90" textAnchor="middle">SMA</text>
      <PullHandle x={28} y={188} height={349} />
      <Led x={80} y={148} label="POWER" color="green" />
      {[["COS", 180], ["SIN", 213], ["COS", 245], ["SIN", 278]].map(([label, y], index) => (
        <Led key={y} x={80} y={Number(y)} label={String(label)} align="left" color={index < 2 ? "green" : "red"} lit={index < 2} />
      ))}
      <path className={styles.cspBusLine} d="M80 189v15m0-8h6m-6 58v15m0-8h6" />
      <text className={styles.faceplateSmallLabel} x="89" y="200">RF ON</text>
      <text className={styles.faceplateSmallLabel} x="89" y="265">FAULT</text>
      <text className={styles.faceplateSmallLabel} x="96" y="502" textAnchor="middle">ENV</text>
      <text className={styles.faceplateSmallLabel} x="69" y="537" textAnchor="end">COS</text>
      <text className={styles.faceplateSmallLabel} x="69" y="591" textAnchor="end">SIN</text>
      <Coax x={96} y={533} pointId="J5" radius={15} flange />
      <Coax x={96} y={587} pointId="J6" radius={15} flange />
      <text className={styles.faceplateSmallLabel} x="119" y="635" textAnchor="end">0230-7160</text>
    </PanelFrame>
  );
}

function CmaFaceplate() {
  return (
    <PanelFrame width={232} height={720} title="CMA" mounting="plain" bodyInset={64}>
      <MountingEar x={170} y={7} width={104} />
      <MountingEar x={170} y={645} width={104} />
      <path className={styles.faceplateDivider} d="M118 68v576m0-548h103m-103 529h103" />
      <text className={styles.faceplateTitle} x="168" y="87" textAnchor="middle">CMA</text>
      <PullHandle x={105} y={182} height={348} />
      <Led x={164} y={149} label="POWER" color="green" />
      <Led x={164} y={182} label="RF ON" color="green" />
      <Led x={164} y={215} label="FAULT" color="red" lit={false} />
      <Coax x={153} y={588} pointId="J2" label="ENV" radius={17} flange />
      <text className={styles.faceplateSmallLabel} x="215" y="640" textAnchor="end">0230-7140</text>
    </PanelFrame>
  );
}

function MsgFaceplate() {
  const pins = [
    ["TP49", "CARRIER MOD", 482], ["TP61", "USB COS", 542], ["TP62", "LSB COS", 562],
    ["TP63", "USB SIN", 582], ["TP64", "LSB SIN", 602],
  ] as const;
  return (
    <PanelFrame width={210} height={720} title="MSG" partNumber="0130-7510" mounting="ejector">
      <Led x={58} y={136} label="POWER" color="green" />
      <Led x={58} y={171} label="FAULT" color="red" lit={false} />
      <BoxHeader x={58} y={259} pins={14} label="MCU JTAG" labelRight />
      <BoxHeader x={58} y={338} pins={10} label="CPLD JTAG" labelRight />
      <PushButton x={58} y={396} size={20} />
      <text className={styles.faceplateSmallLabel} x="82" y="400">RESET</text>
      <Coax x={58} y={445} pointId="sync-30hz" label="30 Hz SYNC" radius={14} labelRight flange />
      {[191, 211, 502, 522].map((y) => (
        <rect key={y} className={styles.faceplateUnlabeledPin} x="54" y={y - 2} width="8" height="4" aria-hidden />
      ))}
      {pins.map(([id, label, y]) => <TestPin key={id} id={id} x={58} y={y} label={label} />)}
    </PanelFrame>
  );
}

function SynFaceplate() {
  const switches = [364, 389, 414, 441, 466];
  const pins = [["TP33", "USB COS", 493], ["TP34", "USB SIN", 511], ["TP35", "LSB COS", 528], ["TP36", "LSB SIN", 545]] as const;
  return (
    <PanelFrame width={210} height={720} title="SYN" partNumber="0230-7130" mounting="ejector">
      <Coax x={58} y={138} label="J1 · CSB MON" radius={15} labelRight flange />
      <PushButton x={58} y={183} size={15} />
      <Led x={58} y={210} label="POWER" color="green" />
      <Led x={58} y={227} label="PLL" color="red" lit={false} />
      <Led x={58} y={244} label="ERROR" color="red" lit={false} />
      <Led x={58} y={262} />
      <BoxHeader x={58} y={308} pins={14} />
      <g className={styles.rotarySwitches}>
        <title>SW2–SW6 · Chọn tần số · hình minh họa cố định, không mô phỏng hiệu chỉnh</title>
        {switches.map((y, index) => (
          <g key={y} data-control-kind="rotary-switch" aria-hidden>
            <circle cx="58" cy={y} r="8" />
            <path d={`M54 ${y + 2}l8-4`} />
            <text x="73" y={y + 3}>{`SW${index + 2}`}</text>
          </g>
        ))}
      </g>
      {pins.map(([id, label, y]) => <TestPin key={id} id={id} x={58} y={y} label={label} />)}
      <Coax x={58} y={582} label="J6 · 40 MHz MON" radius={15} labelRight flange />
    </PanelFrame>
  );
}

function MonFaceplate() {
  const indicators = [
    ["POWER", "green", 136], ["FAULT", "red", 154], ["INTEGRAL ALARM", "red", 175],
    ["INTEGRAL WARNING", "amber", 193], ["SECONDARY ALARM", "red", 211],
    ["STANDBY ALARM", "red", 228], ["STANDBY WARNING", "amber", 246],
    ["SECONDARY ALARM", "red", 263], ["IDENTITY CODE", "green", 285],
  ] as const;
  const pins = [["TP47", "IDENT", 542], ["TP48", "FM 30 Hz", 562], ["TP49", "BASEBAND", 582], ["TP51", "AM 30 Hz", 602]] as const;
  return (
    <PanelFrame width={220} height={720} title="MON" partNumber="0230-7550" mounting="ejector">
      {indicators.map(([label, color, y]) => <Led key={y} x={58} y={y} label={label} color={color} lit={color === "green"} />)}
      <BoxHeader x={58} y={397} pins={14} label="MCU JTAG" labelRight />
      <BoxHeader x={58} y={465} pins={10} label="ZYNQ JTAG" labelRight />
      <PushButton x={58} y={514} size={19} />
      <text className={styles.faceplateSmallLabel} x="82" y="518">RESET</text>
      {pins.map(([id, label, y]) => <TestPin key={id} id={id} x={58} y={y} label={label} />)}
    </PanelFrame>
  );
}

function FanFaceplate() {
  const lamps = ["POWER", "FAN 1 FAULT", "FAN 2 FAULT", "FAN 3 FAULT", "FAN 4 FAULT"];
  return (
    <PanelFrame width={820} height={112} title="FAN" partNumber="0130-7910" mounting="plain">
      <rect className={styles.faceplateTitleStrip} x="49" y="12" width="719" height="18" rx="1" />
      <path className={styles.faceplateDivider} d="M65 31v37h535V31m-333 0v37m34-37v37m202-37v37" />
      {[5, 764].map((x) => (
        <g key={x} aria-hidden>
          <rect className={styles.faceplateTitleStrip} x={x} y="6" width="48" height="72" rx="2" />
          <Screw x={x + 15} y={67} radius={6} />
        </g>
      ))}
      <text className={styles.faceplateTitle} x="78" y="51">FAN</text>
      {lamps.map((label, index) => {
        const x = 553 + index * 20;
        return (
          <g key={label}>
            <Led x={x} y={36} color={index === 0 ? "green" : "red"} lit={index === 0} />
            <text className={styles.faceplateSmallLabel} x={x} y="51" textAnchor="end" transform={`rotate(-46 ${x} 51)`} dominantBaseline="middle" direction="ltr">{label}</text>
          </g>
        );
      })}
      <g data-connector-kind="molex">
        <rect className={styles.faceplateConnector} x="683" y="29" width="42" height="14" rx="2" />
        {Array.from({ length: 6 }, (_, pin) => (
          <rect key={pin} className={styles.faceplateUnlabeledPin} x={687 + pin * 6} y="34" width="4" height="6" />
        ))}
        <text className={styles.faceplateSmallLabel} x="704" y="58" textAnchor="middle">6-PIN MOLEX</text>
      </g>
    </PanelFrame>
  );
}

function PdcFaceplate() {
  const ports = [
    [125, "J20 · LSB COS"], [297, "J21 · LSB SIN"], [501, "J22 · USB COS"],
    [672, "J23 · USB SIN"], [769, "J24 · CARRIER"],
  ] as const;
  return (
    <PanelFrame width={900} height={250} title="PDC · POWER DETECTOR / CHANGEOVER" mounting="plain">
      <rect className={styles.faceplateTitleStrip} x="58" y="104" width="781" height="133" rx="1" />
      <path className={styles.faceplateDivider} d="M58 5v232m781-232v232M58 28h781" />
      <text className={styles.faceplateTitle} x="450" y="58" textAnchor="middle">PDC · POWER DETECTOR / CHANGEOVER</text>
      <text className={styles.faceplateSmallLabel} x="450" y="80" textAnchor="middle">COUPLED RF SAMPLE · APPLY PORT-SPECIFIC LOSS</text>
      {ports.map(([x, label], index) => (
        <Coax key={label} x={x} y={181} label={label} radius={13} flange={index !== 4} />
      ))}
      <PullHandle x={300} y={210} height={197} horizontal />
      {[171, 731].map((x) => <Screw key={x} x={x} y={224} radius={10} />)}
      <text className={styles.faceplateSmallLabel} x="824" y="224" textAnchor="end">0233-7310</text>
    </PanelFrame>
  );
}

function QuintDividerFaceplate() {
  return (
    <PanelFrame width={760} height={185} title="QUINT 3-WAY RF DIVIDER" partNumber="0230-7370" mounting="plain">
      <rect className={styles.faceplateTitleStrip} x="18" y="16" width="713" height="122" rx="2" />
      {[116, 252, 391, 531, 669].map((x) => <Coax key={x} x={x} y={74} radius={19} flange />)}
      <text className={styles.faceplateSmallLabel} x="30" y="167">5 × BNC 50 Ω · PIR · CHƯA XÁC NHẬN THỨ TỰ NHÁNH</text>
    </PanelFrame>
  );
}

function PowerSwitchFaceplate() {
  return (
    <PanelFrame width={530} height={560} title="POWER SWITCH PANEL" partNumber="1A4" mounting="plain">
      <circle className={styles.acAvailableLamp} cx="128" cy="116" r="40" />
      <text className={styles.faceplateTitle} x="203" y="122">AC AVAILABLE</text>
      <path className={styles.faceplateDivider} d="M45 182h456" />
      {[
        [127, "AC MAIN"], [297, "BATT 1"], [435, "BATT 2"],
      ].map(([x, label], index) => (
        <g key={label} className={styles.breaker} data-breaker={label} aria-hidden>
          <rect x={Number(x) - (index === 0 ? 88 : 64)} y="211" width={index === 0 ? 176 : 128} height="240" rx="3" />
          {index === 0 ? <>
            <rect x={Number(x) - 61} y="288" width="122" height="55" rx="27" />
            <path d={`M${Number(x) - 40} 313v22m80-22v22m-91 0h102v22h-102Z`} />
          </> : <>
            <rect x={Number(x) - 42} y="247" width="84" height="150" rx="2" />
            <path d={`M${Number(x) - 20} 330h40v49h-40Zm0 24h40`} />
          </>}
          <text x={x} y="485" textAnchor="middle">{label}</text>
        </g>
      ))}
    </PanelFrame>
  );
}

function PmuFaceplate() {
  const points = [[437, "GND", "GND"], [463, "Battery Voltage", "BAT V"], [489, "AC/DC Voltage", "ACDC V"]] as const;
  return (
    <PanelFrame width={720} height={484} title="PMU · POWER MANAGEMENT UNIT" partNumber="0130-7730" mounting="plain">
      <rect className={styles.faceplateTitleStrip} x="14" y="8" width="682" height="106" rx="4" />
      <PullHandle x={97} y={52} height={514} horizontal />
      <Screw x={36} y={78} radius={16} />
      <Screw x={674} y={78} radius={16} />
      <BoxHeader x={203} y={143} pins={14} label="MCU JTAG" horizontal />
      {points.map(([x, pointId, label], index) => (
        <g key={pointId}>
          <TestJack x={x} y={143} pointId={pointId} color={index === 0 ? "black" : "red"} />
          <text className={styles.faceplateSmallLabel} x={x} y={index === 1 ? 184 : 172} textAnchor="middle">{label}</text>
        </g>
      ))}
      <PushButton x={524} y={143} label="RESET" size={17} />
      <rect className={styles.faceplateTitleStrip} x="91" y="198" width="524" height="195" rx="22" />
      {[112, 591].flatMap((x) => [219, 370].map((y) => <Screw key={`${x}-${y}`} x={x} y={y} radius={7} />))}
      <rect className={styles.pmuDisplay} x="111" y="249" width="245" height="79" rx="3" />
      <path className={styles.pmuDisplayDividers} d="M172 249v79m61-79v79m61-79v79" />
      <text className={styles.pmuDigits} x="234" y="302" textAnchor="middle" textLength="210" lengthAdjust="spacing">----</text>
      <Led x={387} y={245} label="AC FAIL" color="red" lit={false} align="center" />
      <Led x={483} y={245} label="ON BAT" color="amber" lit={false} align="center" />
      <Led x={579} y={245} label="BAT CHARGE" color="amber" align="center" />
      {["PMU TEMP", "AC/DC V", "AC/DC I", "BAT V", "BAT I"].map((label, index) => (
        <PushButton key={label} x={387 + index * 48} y={299} label={label} size={28} />
      ))}
    </PanelFrame>
  );
}

function AcdcFaceplate() {
  return (
    <PanelFrame width={480} height={225} title="AC/DC CONVERTER" partNumber="3151-0016" mounting="plain">
      <rect className={styles.faceplateTitleStrip} x="11" y="12" width="454" height="199" rx="5" />
      <path className={styles.acdcHandle} d="M15 207V20q0-10 10-10h426q10 0 10 10v187" />
      <g className={styles.acdcVent} aria-hidden>
        {[false, true].map((reverse) => (
          <g key={String(reverse)} transform={reverse ? "translate(475 0) scale(-1 1)" : undefined}>
            <path d="M119 31Q61 41 48 90m-1 34q16 50 72 61M121 57Q83 62 73 95m2 26q11 34 44 39M122 84q-15 11-15 23t15 22" />
            {[31, 56, 81, 107, 134, 158].map((y, index) => (
              <rect key={y} x={index === 3 ? 120 : 141} y={y - 6} width={index === 3 ? 64 : 80} height="12" rx="6" />
            ))}
          </g>
        ))}
      </g>
      <rect className={styles.acdcRelease} x="146" y="190" width="56" height="17" rx="5" />
      <text className={styles.faceplateSmallLabel} x="174" y="184" textAnchor="middle">RELEASE</text>
      <Led x={215} y={193} label="AC OK/FAIL" color="green" lit={false} align="center" />
      <Led x={269} y={193} label="DC OK/FAIL" color="green" lit={false} align="center" />
    </PanelFrame>
  );
}

function AsuFaceplate() {
  return (
    <PanelFrame width={600} height={800} title="ANTENNA SWITCHING UNIT" mounting="plain">
      <rect className={styles.asuFaceDoor} x="13" y="8" width="567" height="776" rx="3" />
      {[89, 651].map((y) => (
        <rect className={styles.faceplateTitleStrip} key={y} x="580" y={y} width="13" height="58" rx="2" />
      ))}
      {[142, 638].map((y) => (
        <rect className={styles.faceplateTitleStrip} key={y} x="4" y={y} width="9" height="27" rx="2" />
      ))}
      <text className={styles.asuFaceMark} x="544" y="57" textAnchor="end">ASU</text>
      <text className={styles.asuFaceMark} x="44" y="463" transform="rotate(90 44 463)">MOPIENS</text>
    </PanelFrame>
  );
}

function ModuleVisual({ kind, blockId }: Dvor220ModuleFaceplateProps) {
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
    case "quint-divider": return <QuintDividerFaceplate />;
    case "power-switch": return <PowerSwitchFaceplate />;
    case "pmu": return <PmuFaceplate />;
    case "acdc": return <AcdcFaceplate />;
    case "asu": return <AsuFaceplate />;
  }
}

export function Dvor220ModuleFaceplate({ kind, blockId, onSelectPoint }: Dvor220ModuleFaceplateProps) {
  return <MeasurementContext.Provider value={{ points: DVOR_220_BLOCK_BY_ID.get(blockId)?.testPoints ?? [], onSelect: onSelectPoint }}>
    <ModuleVisual kind={kind} blockId={blockId} />
  </MeasurementContext.Provider>;
}
