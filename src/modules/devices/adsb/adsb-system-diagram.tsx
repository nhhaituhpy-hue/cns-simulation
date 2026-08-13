import { useId, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ADSB_BLOCK_BY_ID,
  ADSB_TOPOLOGY_EDGES,
  ADSB_TOPOLOGY_NODES,
  type AdsbBlockId,
  type AdsbDiagramOccurrence,
  type AdsbEdgeCategory,
  type AdsbTopologyNode,
} from "./block-diagram-data";
import styles from "./adsb-block-diagram.module.css";

interface AdsbSystemDiagramProps {
  selectedOccurrenceId: string | null;
  onSelect: (blockId: AdsbBlockId, occurrence: AdsbDiagramOccurrence) => void;
}

const categoryColors: Record<AdsbEdgeCategory, string> = {
  rf: "#a52894",
  timing: "#2575bc",
  data: "#008861",
  power: "#d72b3d",
  ground: "#819315",
};

const legend: readonly [AdsbEdgeCategory, string][] = [
  ["rf", "RF 1090 MHz"],
  ["timing", "GPS / timing"],
  ["data", "Ethernet / data"],
  ["power", "AC / DC power"],
  ["ground", "Protective ground"],
];

function SelectableNode({
  node,
  selected,
  onSelect,
}: {
  node: AdsbTopologyNode;
  selected: boolean;
  onSelect: AdsbSystemDiagramProps["onSelect"];
}) {
  const block = node.selectableBlockId ? ADSB_BLOCK_BY_ID.get(node.selectableBlockId) : undefined;
  const occurrence = block?.diagramOccurrences.find((item) => item.id === node.occurrenceId);
  if (!block || !occurrence) return null;

  const activate = () => onSelect(block.id, occurrence);
  const firstY = node.y + node.height / 2 - ((node.label.length - 1) * 14) / 2 + 4;

  return (
    <g
      className={styles.topologyNode}
      data-kind={node.kind}
      data-optional={node.optional || undefined}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Chọn ${block.name}`}
      onClick={activate}
      onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="5" />
      <text x={node.x + node.width / 2} y={firstY}>
        {node.label.map((line, index) => (
          <tspan key={line} x={node.x + node.width / 2} dy={index === 0 ? 0 : 14}>{line}</tspan>
        ))}
      </text>
      {node.meta ? (
        <text className={styles.nodeMeta} x={node.x + node.width / 2} y={node.y + node.height - 8}>{node.meta}</text>
      ) : null}
    </g>
  );
}

function ContextNode({ node }: { node: AdsbTopologyNode }) {
  const firstY = node.y + node.height / 2 - ((node.label.length - 1) * 12) / 2 + 3;
  return (
    <g className={styles.contextNode}>
      <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="4" />
      <text x={node.x + node.width / 2} y={firstY}>
        {node.label.map((line, index) => (
          <tspan key={line} x={node.x + node.width / 2} dy={index === 0 ? 0 : 12}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}

export function AdsbSystemDiagram({ selectedOccurrenceId, onSelect }: AdsbSystemDiagramProps) {
  const markerPrefix = useId().replaceAll(":", "");
  const selectedNodeId = ADSB_TOPOLOGY_NODES.find(
    (node) => node.occurrenceId === selectedOccurrenceId,
  )?.id;

  return (
    <div className={styles.diagramViewport}>
      <svg
        className={styles.systemDiagram}
        viewBox="0 0 1000 620"
        role="group"
        aria-labelledby="adsb-topology-title adsb-topology-description"
      >
        <title id="adsb-topology-title">Sơ đồ khối hệ thống ADS-B ngoài trời</title>
        <desc id="adsb-topology-description">
          Topology thiết bị vật lý từ antenna tới Quadrant Sensor, nhánh GPS, hai lựa chọn nguồn và mạng tới QCMS cùng surveillance users.
        </desc>
        <defs>
          {(Object.keys(categoryColors) as AdsbEdgeCategory[]).map((category) => (
            <marker
              key={category}
              id={`${markerPrefix}-${category}-arrow`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0l10 5-10 5z" fill={categoryColors[category]} />
            </marker>
          ))}
        </defs>

        <rect className={styles.diagramPaper} width="1000" height="620" />
        <g>
          <rect className={styles.diagramZone} x="10" y="18" width="960" height="135" rx="7" />
          <text className={styles.diagramZoneTitle} x="22" y="33">RF RECEIVE PATH</text>
          <rect className={styles.diagramZone} x="18" y="165" width="940" height="230" rx="7" />
          <text className={styles.diagramZoneTitle} x="30" y="181">TIMING / LAN / SURVEILLANCE</text>
          <rect className={styles.diagramZone} x="18" y="412" width="940" height="170" rx="7" />
          <text className={styles.diagramZoneTitle} x="30" y="429">POWER / PROTECTIVE GROUND</text>
        </g>

        <g>
          {ADSB_TOPOLOGY_EDGES.map((edge) => {
            const active = selectedNodeId ? edge.from === selectedNodeId || edge.to === selectedNodeId : false;
            const muted = Boolean(selectedNodeId && !active);
            const markerUrl = `url(#${markerPrefix}-${edge.category}-arrow)`;

            return (
              <g key={edge.id}>
                <path
                  className={styles.topologyEdge}
                  data-category={edge.category}
                  data-active={active || undefined}
                  data-muted={muted || undefined}
                  data-optional={edge.optional || undefined}
                  d={edge.path}
                  markerStart={edge.direction === "bidirectional" ? markerUrl : undefined}
                  markerEnd={edge.direction === "forward" || edge.direction === "bidirectional" ? markerUrl : undefined}
                />
                <text
                  className={styles.edgeLabel}
                  data-muted={muted || undefined}
                  x={edge.labelX}
                  y={edge.labelY}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {ADSB_TOPOLOGY_NODES.map((node) =>
            node.selectableBlockId ? (
              <SelectableNode
                key={node.id}
                node={node}
                selected={node.occurrenceId === selectedOccurrenceId}
                onSelect={onSelect}
              />
            ) : (
              <ContextNode key={node.id} node={node} />
            ),
          )}
        </g>

        <g className={styles.diagramLegend} transform="translate(26 598)">
          {legend.map(([category, label], index) => (
            <g key={category} transform={`translate(${index * 184} 0)`}>
              <path data-category={category} d="M0 0h28" />
              <text x="36" y="3">{label}</text>
            </g>
          ))}
        </g>
        <text className={styles.diagramReference} x="970" y="582">Dashed path = optional / alternative configuration</text>
        <text className={styles.diagramReference} x="970" y="611">Derived functional direction · Figures 2 &amp; 20 + installation sections</text>
      </svg>
    </div>
  );
}
