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
      viewBox="0 0 1280 840"
      role="img"
      aria-label="Sơ đồ khối hệ thống DVOR 1150 dựng lại theo Figure 2-2"
    >
      <defs>
        <marker id="dvor1150-arrow-rf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 8 4 0 8z" />
        </marker>
        <marker id="dvor1150-arrow-audio" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 8 4 0 8z" />
        </marker>
        <marker id="dvor1150-arrow-sample" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 8 4 0 8z" />
        </marker>
        <marker id="dvor1150-arrow-control" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 8 4 0 8z" />
        </marker>
        <marker id="dvor1150-arrow-external" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 8 4 0 8z" />
        </marker>
        <filter id="dvor1150-diagram-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect className={styles.diagramPaper} width="1280" height="840" rx="8" />
      <rect className={styles.transmitterGroup} x="28" y="34" width="790" height="494" rx="5" />
      <text className={styles.diagramGroupLabel} x="45" y="56">TRANSMITTER (MAIN / STANDBY)</text>
      <rect className={styles.commutatorGroup} x="950" y="150" width="218" height="510" rx="5" />
      <text className={styles.diagramGroupLabel} x="1059" y="174" textAnchor="middle">DVOR COMMUTATOR</text>

      <g aria-hidden className={styles.signalPaths}>
        <g className={styles.rfPath}>
          <path d="M180 124H228" />
          <path d="M358 124H400" />
          <path d="M530 124H576" />
          <path d="M722 124H846V96H890" />
          <path d="M124 164V238H272V276" />
          <path d="M152 164V220H334V276" />
          <path d="M380 306H450" />
          <path d="M380 328H450" />
          <path d="M380 350H450" />
          <path d="M380 372H450" />
          <path d="M588 286H690V328H825" />
          <path d="M588 306H680V374H825" />
          <path d="M588 326H670V420H825" />
          <path d="M588 346H660V466H825" />
          <path d="M873 328H930V238H998" />
          <path d="M873 374H920V258H998" />
          <path d="M873 420H910V278H998" />
          <path d="M873 466H900V298H998" />
          <path d="M1124 268H1146V116" />
        </g>
        <g className={styles.audioPath}>
          <path d="M190 326H226" />
          <path d="M190 358H226" />
          <path d="M143 300V184H293V164" />
        </g>
        <g className={styles.samplePath}>
          <path d="M606 164V176H748V228H767" />
          <path d="M690 164V188H738V250H767" />
          <path d="M873 328H892V346H785V326" />
          <path d="M873 374H904V362H805V326" />
          <path d="M873 420H916V378H825V326" />
          <path d="M873 466H928V394H845V326" />
          <path d="M588 286H606V190H246V164" />
          <path d="M998 626H786V646H756" />
        </g>
        <g className={styles.controlPath}>
          <path d="M420 622H438V567H450" />
          <path d="M620 646H420" />
          <path d="M143 390V520H950V543H998" />
          <path d="M1058 500V338" />
        </g>
        <g className={styles.externalPath}>
          <path d="M36 318H96" />
          <path d="M96 358H64V625H36" />
          <path d="M224 654H36" />
          <path d="M688 686V716H36" />
          <path d="M1220 626H1124" />
        </g>
      </g>

      <g aria-hidden className={styles.pathLabels}>
        <text x="204" y="88" textAnchor="middle" data-compact>
          <tspan x="204">108-118</tspan>
          <tspan x="204" dy="11">MHz</tspan>
          <tspan x="204" dy="11">CARRIER</tspan>
        </text>
        <text x="370" y="204">
          <tspan x="370">30 Hz +</tspan>
          <tspan x="370" dy="12">1020 Hz +</tspan>
          <tspan x="370" dy="12">VOICE +</tspan>
          <tspan x="370" dy="12">DC</tspan>
        </text>
        <text x="190" y="214">LSB RF</text>
        <text x="190" y="232">USB RF</text>
        <text x="194" y="316">360 Hz SIN</text>
        <text x="194" y="350">360 Hz COS</text>
        <text x="389" y="298">USB SIN</text>
        <text x="389" y="321">USB COS</text>
        <text x="389" y="344">LSB SIN</text>
        <text x="389" y="367">LSB COS</text>
        <text x="692" y="214">FWD / REV</text>
        <text x="32" y="308">MIC / VOICE INPUT</text>
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
      <DiagramBlock blockId="rf-monitor" occurrenceId="diagram-rf-monitor" x={767} y={192} width={92} height={134} lines={["RF", "MONITOR", "A2"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="audio-generator" occurrenceId="diagram-audio-tx1" x={96} y={300} width={47} height={90} lines={["AUDIO", "TX1", "A7"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="audio-generator" occurrenceId="diagram-audio-tx2" x={143} y={300} width={47} height={90} lines={["AUDIO", "TX2", "A23"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="sideband-generator" occurrenceId="diagram-sideband-tx1-sb12" x={226} y={276} width={77} height={108} lines={["SB GEN", "TX1", "SB1/2", "A5"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="sideband-generator" occurrenceId="diagram-sideband-tx1-sb34" x={303} y={276} width={77} height={108} lines={["SB GEN", "TX1", "SB3/4", "A6"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="sideband-sample" occurrenceId="diagram-sideband-sample" x={450} y={268} width={138} height={96} lines={["SIDEBAND", "SAMPLE ASSY", "A29-A32"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />

      {[328, 374, 420, 466].map((y, index) => (
        <g key={y} aria-hidden className={styles.isolatorBlock}>
          <rect x="825" y={y - 16} width="48" height="32" rx="2" />
          <text x="849" y={y + 4}>ISO{index + 1}</text>
        </g>
      ))}

      <DiagramBlock blockId="commutator-cca" occurrenceId="diagram-commutator" x={998} y={218} width={126} height={100} lines={["COMMUTATOR", "CCA", "2A2 / 2A3"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="pin-diode-driver" occurrenceId="diagram-pin-driver" x={998} y={500} width={126} height={86} lines={["PIN DIODE", "DRIVER", "2A1"]} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />
      <DiagramBlock blockId="field-detector" occurrenceId="diagram-field-detector" x={998} y={590} width={126} height={72} lines={["FIELD DETECTOR", "2A6A1 / 2A6A2"]} compact selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />

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
        <rect x="852" y="42" width="78" height="92" rx="4" />
        <AntennaSymbol x={890} y={70} label={["CARRIER", "ANTENNA"]} />
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
        <rect x="1110" y="42" width="82" height="102" rx="4" />
        <AntennaSymbol x={1150} y={78} label={["SIDEBAND", "ANTENNAS 1-48"]} />
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
        <rect x="1174" y="536" width="92" height="114" rx="4" />
        <AntennaSymbol x={1220} y={570} label={["FIELD", "MONITOR"]} />
      </g>

      <SignalLegend />
      <text className={styles.diagramReference} x="1260" y="820">FIGURE 2-2 · REV. F · OCTOBER 2002</text>
    </svg>
  );
}
