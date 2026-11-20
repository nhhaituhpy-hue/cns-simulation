"use client";

import type {
  Dvor1150BlockId,
  Dvor1150DiagramOccurrence,
} from "./block-diagram-data";
import { DVOR_1150_BLOCK_BY_ID } from "./block-diagram-data";
import styles from "./dvor-1150-block-diagram.module.css";

interface Dvor1150SystemDiagramProps {
  selectedOccurrenceId: string | null;
  onSelect: (blockId: Dvor1150BlockId, occurrence: Dvor1150DiagramOccurrence) => void;
}

interface DiagramBlockProps extends Dvor1150SystemDiagramProps {
  blockId: Dvor1150BlockId;
  occurrenceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: readonly string[];
  compact?: boolean;
}

const sidebandRows = [
  { occurrenceId: "diagram-sideband-tx1-sb12", label: "TX1 SB1/2 · A5", band: "LSB", y: 264 },
  { occurrenceId: "diagram-sideband-tx1-sb34", label: "TX1 SB3/4 · A6", band: "USB", y: 326 },
  { occurrenceId: "diagram-sideband-tx2-sb12", label: "TX2 SB1/2 · A21", band: "LSB", y: 388 },
  { occurrenceId: "diagram-sideband-tx2-sb34", label: "TX2 SB3/4 · A22", band: "USB", y: 450 },
] as const;

function getOccurrence(blockId: Dvor1150BlockId, occurrenceId: string) {
  const occurrence = DVOR_1150_BLOCK_BY_ID
    .get(blockId)
    ?.diagramOccurrences.find((item) => item.id === occurrenceId);
  if (!occurrence) throw new Error(`Missing DVOR 1150 occurrence: ${occurrenceId}`);
  return occurrence;
}

function DiagramBlock({
  selectedOccurrenceId,
  onSelect,
  blockId,
  occurrenceId,
  x,
  y,
  width,
  height,
  lines,
  compact = false,
}: DiagramBlockProps) {
  const occurrence = getOccurrence(blockId, occurrenceId);
  const selected = selectedOccurrenceId === occurrenceId;
  const lineHeight = compact ? 13 : 16;
  const textStart = y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + 4;

  return (
    <g
      className={styles.diagramBlock}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Chọn ${occurrence.label}`}
      onClick={() => onSelect(blockId, occurrence)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(blockId, occurrence);
        }
      }}
    >
      <rect x={x} y={y} width={width} height={height} rx="4" />
      <text x={x + width / 2} y={textStart} data-compact={compact || undefined}>
        {lines.map((line, index) => (
          <tspan key={line} x={x + width / 2} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}

function AntennaSymbol({ x, y, label }: { x: number; y: number; label: readonly string[] }) {
  return (
    <g aria-hidden className={styles.antennaSymbol}>
      <path d={`M${x} ${y + 56}V${y + 24}M${x} ${y + 24}l-22-24M${x} ${y + 24}l22-24M${x - 22} ${y}h44`} />
      <text x={x} y={y - 24}>
        {label.map((line, index) => <tspan key={line} x={x} dy={index === 0 ? 0 : 13}>{line}</tspan>)}
      </text>
    </g>
  );
}

function SignalLegend() {
  return (
    <g aria-hidden className={styles.signalLegend}>
      <rect x="24" y="774" width="386" height="48" rx="5" />
      <path className={styles.rfPath} d="M40 793h32" />
      <text x="80" y="797">RF</text>
      <path className={styles.audioPath} d="M126 793h32" />
      <text x="166" y="797">AUDIO</text>
      <path className={styles.samplePath} d="M240 793h32" />
      <text x="280" y="797">SAMPLE / MONITOR</text>
      <path className={styles.controlPath} d="M40 811h32" />
      <text x="80" y="815">CONTROL / DATA</text>
      <path className={styles.externalPath} d="M240 811h32" />
      <text x="280" y="815">EXTERNAL</text>
    </g>
  );
}

export function Dvor1150SystemDiagram({
  selectedOccurrenceId,
  onSelect,
}: Dvor1150SystemDiagramProps) {
  return (
    <svg
      className={styles.systemDiagram}
      viewBox="0 0 1360 840"
      role="group"
      aria-label="Sơ đồ khối hệ thống DVOR 1150 dựng lại theo Figure 2-2"
    >
      <defs>
        <marker id="dvor1150-arrow-rf" viewBox="0 0 8 8" refX="7.6" refY="4" markerWidth="6.5" markerHeight="5.5" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0.8L8 4L0 7.2Z" />
        </marker>
        <marker id="dvor1150-arrow-audio" viewBox="0 0 8 8" refX="7.6" refY="4" markerWidth="6.5" markerHeight="5.5" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0.8L8 4L0 7.2Z" />
        </marker>
        <marker id="dvor1150-arrow-sample" viewBox="0 0 8 8" refX="7.6" refY="4" markerWidth="6.5" markerHeight="5.5" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0.8L8 4L0 7.2Z" />
        </marker>
        <marker id="dvor1150-arrow-control" viewBox="0 0 8 8" refX="7.6" refY="4" markerWidth="6.5" markerHeight="5.5" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0.8L8 4L0 7.2Z" />
        </marker>
        <marker id="dvor1150-arrow-external" viewBox="0 0 8 8" refX="7.6" refY="4" markerWidth="6.5" markerHeight="5.5" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0.8L8 4L0 7.2Z" />
        </marker>
        <filter id="dvor1150-diagram-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect className={styles.diagramPaper} width="1360" height="840" rx="8" />
      <rect className={styles.transmitterGroup} x="28" y="34" width="850" height="494" rx="5" />
      <text className={styles.diagramGroupLabel} x="45" y="56">TRANSMITTER (MAIN / STANDBY)</text>
      <rect className={styles.commutatorGroup} x="1020" y="150" width="218" height="510" rx="5" />
      <text className={styles.diagramGroupLabel} x="1129" y="174" textAnchor="middle">DVOR COMMUTATOR</text>

      <g className={styles.signalPaths}>
        <g className={styles.rfPath}>
          <path d="M180 124H228" />
          <path d="M358 124H400" />
          <path d="M530 124H576" />
          <path d="M722 124H896V96H940" />
          <path d="M82 164V200H250V276H276" />
          <path d="M96 164V216H238V338H276" />
          <path d="M138 164V232H226V400H276" />
          <path d="M152 164V248H214V462H276" />
          {sidebandRows.map(({ occurrenceId, y }) => (
            <g key={occurrenceId}>
              <path d={`M430 ${y + 22}H496`} />
              <path d={`M430 ${y + 42}H496`} />
            </g>
          ))}
          <path d="M634 286H716V328H894" />
          <path d="M634 306H706V374H894" />
          <path d="M634 326H696V420H894" />
          <path d="M634 346H686V466H894" />
          <path d="M942 328H1000V238H1068" />
          <path d="M942 374H990V258H1068" />
          <path d="M942 420H980V278H1068" />
          <path d="M942 466H970V298H1068" />
          <path d="M1194 268H1216V116" />
        </g>
        <g className={styles.audioPath}>
          <path d="M204 326H258M258 294V480" />
          <path d="M204 358H266M266 304V490" />
          {sidebandRows.map(({ occurrenceId, y }) => (
            <g key={occurrenceId}>
              <path d={`M258 ${y + 30}H276`} />
              <path d={`M266 ${y + 40}H276`} />
            </g>
          ))}
          <path d="M157 300V184H293V164" />
        </g>
        <g className={styles.samplePath}>
          <path d="M606 164V176H748V228H770" />
          <path d="M690 164V188H738V250H770" />
          {[328, 374, 420, 466].map((y, index) => (
            <g key={y}>
              <g role="img" aria-label={`Mẫu sideband ISO${index + 1} REV → RF Monitor A2`}>
                <path d={`M906 ${y - 16}V${y - 22}H${780 + index * 20}V282`} />
                <text x="950" y={y - 7}>REV</text>
              </g>
              <g role="img" aria-label={`Mẫu sideband ISO${index + 1} FWD → RF Monitor A2`}>
                <path d={`M930 ${y + 16}V${y + 22}H${790 + index * 20}V282`} />
                <text x="950" y={y + 14}>FWD</text>
              </g>
            </g>
          ))}
          <path d="M634 278H652V190H246V164" />
          <path d="M1068 626H786V646H756" />
        </g>
        <g className={styles.controlPath}>
          <path d="M420 622H438V567H450" />
          <path d="M620 646H420" />
          <path d="M157 390V520H1020V543H1068" />
          <path d="M1128 500V338" />
        </g>
        <g className={styles.externalPath}>
          <path d="M36 318H110" />
          <path d="M110 358H64V625H36" />
          <path d="M224 654H36" />
          <path d="M688 686V716H36" />
          <path d="M1290 626H1194" />
        </g>
      </g>

      <g aria-hidden className={styles.pathLabels}>
        <text x="204" y="88" textAnchor="middle" data-compact>
          <tspan x="204">108-118</tspan>
          <tspan x="204" dy="11">MHz</tspan>
          <tspan x="204" dy="11">CARRIER</tspan>
        </text>
        <text x="396" y="204">
          <tspan x="396">30 Hz +</tspan>
          <tspan x="396" dy="12">1020 Hz +</tspan>
          <tspan x="396" dy="12">VOICE +</tspan>
          <tspan x="396" dy="12">DC</tspan>
        </text>
        <text x="160" y="194">TX1 LSB / USB RF</text>
        <text x="160" y="242">TX2 LSB / USB RF</text>
        <text x="230" y="316" textAnchor="middle">360 Hz SIN</text>
        <text x="230" y="350" textAnchor="middle">360 Hz COS</text>
        {sidebandRows.map(({ occurrenceId, band, y }) => (
          <g key={occurrenceId}>
            <text x="436" y={y + 17}>{band} SIN</text>
            <text x="436" y={y + 37}>{band} COS</text>
          </g>
        ))}
        <text x="728" y="214" textAnchor="end">FWD / REV</text>
        <text x="68" y="296" textAnchor="middle">
          <tspan x="68">MIC / VOICE</tspan>
          <tspan x="68" dy="12">INPUT</tspan>
        </text>
        <text x="74" y="614">IDENT SYNC TO DME</text>
        <text x="48" y="640">VIDEO TERMINAL</text>
        <text x="48" y="702">AUDIO OUT</text>
      </g>

      <DiagramBlock blockId="frequency-synthesizer" occurrenceId="diagram-synth-tx1" x={68} y={84} width={56} height={80} lines={["SYNTH", "TX1", "A4"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="frequency-synthesizer" occurrenceId="diagram-synth-tx2" x={124} y={84} width={56} height={80} lines={["SYNTH", "TX2", "A20"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="csb-power-amplifier" occurrenceId="diagram-csb-tx1" x={228} y={84} width={65} height={80} lines={["CSB AMP", "TX1", "A3"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="csb-power-amplifier" occurrenceId="diagram-csb-tx2" x={293} y={84} width={65} height={80} lines={["CSB AMP", "TX2", "A19"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="low-pass-filter" occurrenceId="diagram-low-pass" x={400} y={84} width={130} height={80} lines={["LOW PASS", "FILTER", "A35 / A36"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="bidirectional-coupler" occurrenceId="diagram-coupler" x={576} y={84} width={146} height={80} lines={["BI-DIRECTIONAL", "COUPLER", "DC1 / DC2"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="rf-monitor" occurrenceId="diagram-rf-monitor" x={770} y={192} width={92} height={90} lines={["RF", "MONITOR", "A2"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="audio-generator" occurrenceId="diagram-audio-tx1" x={110} y={300} width={47} height={90} lines={["AUDIO", "TX1", "A7"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="audio-generator" occurrenceId="diagram-audio-tx2" x={157} y={300} width={47} height={90} lines={["AUDIO", "TX2", "A23"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      {sidebandRows.map(({ occurrenceId, label, y }) => (
        <DiagramBlock key={occurrenceId} blockId="sideband-generator" occurrenceId={occurrenceId} x={276} y={y} width={154} height={50} lines={["SB GEN", label]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      ))}
      <DiagramBlock blockId="sideband-sample" occurrenceId="diagram-sideband-sample" x={496} y={268} width={138} height={230} lines={["SIDEBAND", "SAMPLE ASSY", "A29-A32", "MAIN / STANDBY"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />

      {[328, 374, 420, 466].map((y, index) => (
        <g key={y} aria-hidden className={styles.isolatorBlock}>
          <rect x="894" y={y - 16} width="48" height="32" rx="2" />
          <text x="918" y={y + 4}>ISO{index + 1}</text>
        </g>
      ))}

      <DiagramBlock blockId="commutator-cca" occurrenceId="diagram-commutator" x={1068} y={218} width={126} height={100} lines={["COMMUTATOR", "CCA", "2A2 / 2A3"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="pin-diode-driver" occurrenceId="diagram-pin-driver" x={1068} y={500} width={126} height={86} lines={["PIN DIODE", "DRIVER", "2A1"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="field-detector" occurrenceId="diagram-field-detector" x={1068} y={590} width={126} height={72} lines={["FIELD DETECTOR", "2A6A1 / 2A6A2"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />

      <DiagramBlock blockId="rms-cpu" occurrenceId="diagram-rms" x={224} y={606} width={196} height={80} lines={["SYSTEM CONTROL AND", "INTERFACE PROCESSOR", "(SCIP / RMS)"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="status-display" occurrenceId="diagram-display" x={450} y={540} width={130} height={54} lines={["DISPLAY", "1A1A1 / 1A1A2"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="monitor-cca" occurrenceId="diagram-monitor-1" x={620} y={606} width={68} height={80} lines={["MONITOR", "1", "A8"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="monitor-cca" occurrenceId="diagram-monitor-2" x={688} y={606} width={68} height={80} lines={["MONITOR", "2", "A24"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />

      <g
        className={styles.diagramAntennaButton}
        data-selected={selectedOccurrenceId === "diagram-carrier-antenna" || undefined}
        role="button"
        tabIndex={0}
        aria-pressed={selectedOccurrenceId === "diagram-carrier-antenna"}
        aria-label="Chọn Carrier Antenna"
        onClick={() => onSelect("carrier-antenna", getOccurrence("carrier-antenna", "diagram-carrier-antenna"))}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect("carrier-antenna", getOccurrence("carrier-antenna", "diagram-carrier-antenna"));
          }
        }}
      >
        <rect x="902" y="42" width="78" height="92" rx="4" />
        <AntennaSymbol x={940} y={70} label={["CARRIER", "ANTENNA"]} />
      </g>

      <g
        className={styles.diagramAntennaButton}
        data-selected={selectedOccurrenceId === "diagram-sideband-antennas" || undefined}
        role="button"
        tabIndex={0}
        aria-pressed={selectedOccurrenceId === "diagram-sideband-antennas"}
        aria-label="Chọn Sideband Antennas 1 đến 48"
        onClick={() => onSelect("sideband-antennas", getOccurrence("sideband-antennas", "diagram-sideband-antennas"))}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect("sideband-antennas", getOccurrence("sideband-antennas", "diagram-sideband-antennas"));
          }
        }}
      >
        <rect x="1180" y="42" width="82" height="102" rx="4" />
        <AntennaSymbol x={1220} y={78} label={["SIDEBAND", "ANTENNAS 1-48"]} />
      </g>

      <g
        className={styles.diagramAntennaButton}
        data-selected={selectedOccurrenceId === "diagram-field-monitor" || undefined}
        role="button"
        tabIndex={0}
        aria-pressed={selectedOccurrenceId === "diagram-field-monitor"}
        aria-label="Chọn Field Monitor Antenna"
        onClick={() => onSelect("field-monitor-antenna", getOccurrence("field-monitor-antenna", "diagram-field-monitor"))}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect("field-monitor-antenna", getOccurrence("field-monitor-antenna", "diagram-field-monitor"));
          }
        }}
      >
        <rect x="1244" y="536" width="92" height="114" rx="4" />
        <AntennaSymbol x={1290} y={570} label={["FIELD", "MONITOR"]} />
      </g>

      <SignalLegend />
      <text className={styles.diagramReference} x="1340" y="820">FIGURE 2-2 · REV. K · JANUARY 2008</text>
    </svg>
  );
}
