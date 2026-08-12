"use client";

import { useId, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  EquipmentComponent,
  EquipmentLinkKind,
} from "@/lib/equipment-diagram-types";
import { DME_EQUIPMENT_DIAGRAMS } from "@/lib/dme-hardware-model";
import type {
  Dme1119aBlockId,
  Dme1119aDiagramOccurrence,
} from "./block-diagram-data";
import {
  DME_1119A_BLOCK_BY_ID,
  DME_1119A_COMPONENT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dme-1119a-block-diagram.module.css";

interface Dme1119aSystemDiagramProps {
  selectedOccurrenceId: string | null;
  onSelect: (blockId: Dme1119aBlockId, occurrence: Dme1119aDiagramOccurrence) => void;
}

type DiagramMode = "system" | "functional";

const diagram = DME_EQUIPMENT_DIAGRAMS[0]!;

const signalColors: Record<EquipmentLinkKind, string> = {
  rf: "#8b2d22",
  modulation: "#9a5a14",
  control: "#17684a",
  monitor: "#73558d",
  power: "#336a8d",
  data: "#4f5960",
};

const signalLabels: Partial<Record<EquipmentLinkKind, string>> = {
  rf: "RF TRANSMIT / RECEIVE",
  monitor: "RF SAMPLE / MONITOR",
  control: "TIMING / CONTROL",
  data: "SERIAL / DATA",
  power: "48 VDC POWER",
};

const componentLabels: Record<string, readonly string[]> = {
  "dme-antenna": ["DME", "ANTENNA"],
  "dme-coupler": ["30 dB", "COUPLER"],
  "dme-circulator": ["CIRCULATOR"],
  "dme-rf-switch": ["RF", "SWITCH"],
  "dme-load": ["LOAD /", "ATTEN"],
  "dme-lna": ["LOW-NOISE", "AMPLIFIER"],
  "dme-lpa-synth-1": ["LOW POWER AMP /", "SYNTH 1"],
  "dme-hpa-1": ["HIGH POWER", "AMP 1"],
  "dme-lpa-synth-2": ["LOW POWER AMP /", "SYNTH 2"],
  "dme-hpa-2": ["HIGH POWER", "AMP 2"],
  "dme-monitor-1": ["MONITOR /", "INTERROGATOR /", "SYNTHESIZER 1"],
  "dme-monitor-2": ["MONITOR /", "INTERROGATOR /", "SYNTHESIZER 2"],
  "dme-rtc-1": ["RECEIVER /", "TRANSMITTER", "CONTROLLER 1"],
  "dme-rtc-2": ["RECEIVER /", "TRANSMITTER", "CONTROLLER 2"],
  "dme-rms": ["RMS"],
  "dme-lcu": ["LCU"],
  "dme-pmdt": ["PMDT"],
  "dme-tx-power-supply-1": ["TX 1", "POWER SUPPLY"],
  "dme-battery-1": ["48 V", "BATTERIES 1"],
  "dme-bcps-1": ["TX 1", "BCPS"],
  "dme-tx-power-supply-2": ["TX 2", "POWER SUPPLY"],
  "dme-battery-2": ["48 V", "BATTERIES 2"],
  "dme-bcps-2": ["TX 2", "BCPS"],
  "dme-interface-card": ["INTERFACE", "CIRCUIT CARD"],
  "dme-co-located": ["CO-LOCATED", "ILS / VOR"],
  "dme-rcsu": ["RCSU"],
  "dme-ethernet": ["ETHERNET", "PORT"],
};

function getOccurrence(componentId: string) {
  const blockId = DME_1119A_COMPONENT_TO_BLOCK.get(componentId);
  if (!blockId) return null;
  const block = DME_1119A_BLOCK_BY_ID.get(blockId);
  const occurrence = block?.diagramOccurrences.find((item) => item.componentId === componentId);
  return block && occurrence ? { blockId, occurrence } : null;
}

function componentBox(component: EquipmentComponent) {
  const width = (component.size?.width ?? 10) * 10;
  const height = (component.size?.height ?? 6) * 10;
  return {
    x: component.position.x * 10 - width / 2,
    y: component.position.y * 10 - height / 2,
    width,
    height,
  };
}

function ComponentNode({
  component,
  selectedOccurrenceId,
  onSelect,
}: {
  component: EquipmentComponent;
  selectedOccurrenceId: string | null;
  onSelect: Dme1119aSystemDiagramProps["onSelect"];
}) {
  const mapped = getOccurrence(component.id);
  if (!mapped) return null;
  const box = componentBox(component);
  const selected = selectedOccurrenceId === mapped.occurrence.id;
  const lines = componentLabels[component.id] ?? [component.shortName];
  const lineHeight = lines.length > 2 ? 13 : 15;
  const firstY = component.position.y * 10 - ((lines.length - 1) * lineHeight) / 2 + 4;
  const activate = () => onSelect(mapped.blockId, mapped.occurrence);

  const interactionProps = {
    role: "button",
    tabIndex: 0,
    "aria-pressed": selected,
    "aria-label": `Chọn ${component.name}`,
    onClick: activate,
    onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    },
  } as const;

  if (component.id === "dme-antenna") {
    return (
      <g className={styles.diagramSymbol} data-selected={selected || undefined} {...interactionProps}>
        <rect className={styles.symbolHitbox} x="460" y="2" width="80" height="68" rx="3" />
        <path className={styles.antennaSymbolPath} d="M475 8h50l-25 29zM500 37v13M485 50h30M490 50l-12 16M510 50l12 16" />
      </g>
    );
  }

  if (component.id === "dme-coupler") {
    return (
      <g className={styles.diagramSymbol} data-selected={selected || undefined} {...interactionProps}>
        <rect className={styles.symbolHitbox} x={box.x} y={box.y} width={box.width} height={box.height} rx="3" />
        <rect className={styles.symbolBody} x="474" y="78" width="52" height="44" />
        <path className={styles.couplerSymbolPath} d="M500 78v44M500 92h-20M500 108h20M480 92l7-4v8zM520 108l-7-4v8z" />
        <text className={styles.symbolLabel} x="500" y="139">30 dB COUPLER</text>
      </g>
    );
  }

  if (component.id === "dme-circulator") {
    return (
      <g className={styles.diagramSymbol} data-selected={selected || undefined} {...interactionProps}>
        <rect className={styles.symbolHitbox} x={box.x} y={box.y} width={box.width} height={box.height} rx="3" />
        <circle className={styles.symbolBody} cx="500" cy="180" r="24" />
        <path className={styles.circulatorSymbolPath} d="M487 187a16 16 0 1 1 25-4M512 183l-1-9 8 5z" />
        <text className={styles.symbolLabel} x="500" y="216">CIRCULATOR</text>
      </g>
    );
  }

  if (component.id === "dme-rf-switch") {
    return (
      <g className={styles.diagramSymbol} data-selected={selected || undefined} {...interactionProps}>
        <rect className={styles.symbolHitbox} x={box.x} y={box.y} width={box.width} height={box.height} rx="3" />
        <path className={styles.symbolBody} d="M500 241l40 29-40 29-40-29z" />
        <path className={styles.switchSymbolPath} d="M500 244v52M464 270h72M478 254l44 32M522 254l-44 32" />
        <text className={styles.symbolLabel} x="500" y="267"><tspan x="500">RF</tspan><tspan x="500" dy="12">SWITCH</tspan></text>
      </g>
    );
  }

  return (
    <g
      className={styles.diagramBlock}
      data-selected={selected || undefined}
      {...interactionProps}
    >
      <rect x={box.x} y={box.y} width={box.width} height={box.height} rx="3" />
      <text x={component.position.x * 10} y={firstY} data-compact={lines.length > 2 || undefined}>
        {lines.map((line, index) => <tspan key={line} x={component.position.x * 10} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>)}
      </text>
    </g>
  );
}

export function Dme1119aSystemDiagram({ selectedOccurrenceId, onSelect }: Dme1119aSystemDiagramProps) {
  const [mode, setMode] = useState<DiagramMode>("system");
  const markerPrefix = useId().replaceAll(":", "");
  const selectedComponentId = selectedOccurrenceId?.replace(/^diagram-/, "dme-") ?? null;

  return (
    <div>
      <div className={styles.diagramTabs} role="tablist" aria-label="Chọn sơ đồ DME 1119A">
        <button type="button" role="tab" aria-selected={mode === "system"} onClick={() => setMode("system")}>Dual High Power</button>
        <button type="button" role="tab" aria-selected={mode === "functional"} onClick={() => setMode("functional")}>Simplified</button>
      </div>
      <div className={styles.diagramViewport}>
        <svg
          className={styles.systemDiagram}
          viewBox="0 0 1000 1000"
          role="img"
          aria-label={mode === "system" ? "Figure 1-10 Dual High Power DME Block Diagram" : "Figure 2-4 DME Simplified Block Diagram"}
        >
          <defs>
            {(Object.keys(signalColors) as EquipmentLinkKind[]).map((kind) => (
              <marker key={kind} id={`${markerPrefix}-${kind}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 8 4 0 8z" fill={signalColors[kind]} />
              </marker>
            ))}
            <filter id={`${markerPrefix}-selected-glow`} x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <rect className={styles.diagramPaper} width="1000" height="1000" />
          <g className={styles.diagramZones} aria-hidden>
            <rect x="8" y="205" width="350" height="470" rx="4" />
            <rect x="642" y="205" width="350" height="470" rx="4" />
            <rect x="410" y="8" width="180" height="420" rx="4" />
            <rect x="8" y="690" width="984" height="302" rx="4" />
            <text x="20" y="224">TRANSMITTER / MONITOR 1</text>
            <text x="980" y="224" textAnchor="end">TRANSMITTER / MONITOR 2</text>
            <text x="500" y="26" textAnchor="middle">COMMON RF / ANTENNA</text>
            <text x="20" y="710">CONTROL · POWER · INTERFACE</text>
          </g>
          <g className={styles.diagramLinks} aria-hidden>
            {diagram.links.map((link) => {
              const from = diagram.components.find((item) => item.id === link.fromComponentId);
              const to = diagram.components.find((item) => item.id === link.toComponentId);
              const route = link.route ?? (from && to ? [from.position, to.position] : []);
              if (route.length < 2) return null;
              const active = selectedComponentId === link.fromComponentId || selectedComponentId === link.toComponentId;
              const direction = link.direction ?? "forward";
              return (
                <polyline
                  key={link.id}
                  points={route.map((point) => `${point.x * 10},${point.y * 10}`).join(" ")}
                  data-kind={link.kind}
                  data-active={active || undefined}
                  data-muted={selectedComponentId && !active ? true : undefined}
                  markerStart={direction === "reverse" || direction === "bidirectional" ? `url(#${markerPrefix}-${link.kind})` : undefined}
                  markerEnd={direction === "forward" || direction === "bidirectional" ? `url(#${markerPrefix}-${link.kind})` : undefined}
                  style={{ stroke: signalColors[link.kind] }}
                />
              );
            })}
          </g>

          <g className={styles.diagramPathLabels} aria-hidden>
            {diagram.links.filter((link) => link.label).map((link) => {
              const route = link.route ?? [];
              const position = link.labelPosition ?? (route.length > 1 ? {
                x: (route[Math.floor((route.length - 1) / 2)].x + route[Math.ceil((route.length - 1) / 2)].x) / 2,
                y: (route[Math.floor((route.length - 1) / 2)].y + route[Math.ceil((route.length - 1) / 2)].y) / 2,
              } : null);
              return position ? <text key={link.id} x={position.x * 10} y={position.y * 10 - 6}>{link.label}</text> : null;
            })}
          </g>

          {diagram.components.map((component) => <ComponentNode key={component.id} component={component} selectedOccurrenceId={selectedOccurrenceId} onSelect={onSelect} />)}

          <g className={styles.diagramLegend} aria-hidden>
            {Object.entries(signalLabels).map(([kind, label], index) => (
              <g key={kind} transform={`translate(${690 + (index % 2) * 145} ${724 + Math.floor(index / 2) * 22})`}>
                <path d="M0 0h30" style={{ stroke: signalColors[kind as EquipmentLinkKind] }} />
                <text x="38" y="4">{label}</text>
              </g>
            ))}
          </g>
          <text className={styles.diagramReference} x="980" y="980">
            {mode === "system" ? "FIGURE 1-10 · DUAL HIGH POWER DME BLOCK DIAGRAM" : "FIGURE 2-4 · DME SIMPLIFIED BLOCK DIAGRAM"}
          </text>
        </svg>
      </div>
    </div>
  );
}
