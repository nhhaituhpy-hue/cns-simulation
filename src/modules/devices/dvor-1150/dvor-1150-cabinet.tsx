"use client";

import type {
  Dvor1150BlockId,
  Dvor1150CabinetHotspot,
  Dvor1150CabinetSurface,
} from "./block-diagram-data";
import {
  DVOR_1150_BLOCKS,
  DVOR_1150_HOTSPOT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dvor-1150-block-diagram.module.css";

interface Dvor1150CabinetProps {
  surface: Dvor1150CabinetSurface;
  selectedHotspotIds: ReadonlySet<string>;
  onSelect: (blockId: Dvor1150BlockId, hotspot: Dvor1150CabinetHotspot) => void;
}

const cabinetViewBox = { width: 600, height: 1000 } as const;

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden className={styles.cabinetScrew}>
      <circle cx={x} cy={y} r="4.5" />
      <path d={`M${x - 2.5} ${y}h5`} />
    </g>
  );
}

function PullHandle({ x, y, height = 104 }: { x: number; y: number; height?: number }) {
  return (
    <g aria-hidden className={styles.pullHandle}>
      <rect x={x - 8} y={y} width="16" height={height} rx="8" />
      <path d={`M${x} ${y + 13}v${height - 26}`} />
    </g>
  );
}

function CabinetHotspot({
  hotspot,
  selected,
  onSelect,
}: {
  hotspot: Dvor1150CabinetHotspot;
  selected: boolean;
  onSelect: (blockId: Dvor1150BlockId, hotspot: Dvor1150CabinetHotspot) => void;
}) {
  const blockId = DVOR_1150_HOTSPOT_TO_BLOCK.get(hotspot.id);
  if (!blockId) return null;

  return (
    <g
      className={styles.cabinetHotspot}
      data-selected={selected || undefined}
      onClick={() => onSelect(blockId, hotspot)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Chọn ${hotspot.assemblyId} ${hotspot.shortLabel}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(blockId, hotspot);
        }
      }}
    >
      <rect
        className={styles.hotspotTarget}
        x={hotspot.x}
        y={hotspot.y}
        width={hotspot.width}
        height={hotspot.height}
        rx="3"
      />
      <rect
        className={styles.hotspotOutline}
        x={hotspot.x + 2}
        y={hotspot.y + 2}
        width={Math.max(0, hotspot.width - 4)}
        height={Math.max(0, hotspot.height - 4)}
        rx="2"
      />
    </g>
  );
}

function CabinetLabel({ hotspot }: { hotspot: Dvor1150CabinetHotspot }) {
  const compact = hotspot.width < 43;
  return (
    <g aria-hidden className={styles.cabinetModuleLabel} data-compact={compact || undefined}>
      <text x={hotspot.x + hotspot.width / 2} y={hotspot.y + hotspot.height / 2 - (compact ? 6 : 8)}>
        {hotspot.assemblyId}
      </text>
      <text x={hotspot.x + hotspot.width / 2} y={hotspot.y + hotspot.height / 2 + (compact ? 8 : 9)}>
        {hotspot.shortLabel}
      </text>
    </g>
  );
}

function ModuleBody({ hotspot }: { hotspot: Dvor1150CabinetHotspot }) {
  const x = hotspot.x;
  const y = hotspot.y;
  const width = hotspot.width;
  const height = hotspot.height;

  if (hotspot.kind === "amplifier") {
    return (
      <g aria-hidden className={styles.cabinetAmplifier}>
        <rect x={x} y={y} width={width} height={height} rx="3" />
        {Array.from({ length: 11 }, (_, index) => (
          <path key={index} d={`M${x + 8 + index * 7} ${y + 8}v${height - 16}`} />
        ))}
        <PullHandle x={x + width / 2} y={y + 40} height={height - 80} />
      </g>
    );
  }

  if (hotspot.kind === "module") {
    return (
      <g aria-hidden className={styles.cabinetModule}>
        <rect x={x} y={y} width={width} height={height} rx="2" />
        {Array.from({ length: Math.max(3, Math.floor(width / 8)) }, (_, index) => (
          <path key={index} d={`M${x + 5 + index * 7} ${y + 5}v${height - 10}`} />
        ))}
        <circle cx={x + width / 2} cy={y + 54} r="10" />
        <circle cx={x + width / 2} cy={y + 120} r="10" />
      </g>
    );
  }

  if (hotspot.kind === "card") {
    return (
      <g aria-hidden className={styles.cabinetCard}>
        <rect x={x} y={y} width={width} height={height} rx="1.5" />
        <rect x={x + width * 0.38} y={y + 8} width={Math.max(5, width * 0.24)} height={height - 25} rx="2" />
        <circle cx={x + width / 2} cy={y + height - 10} r="3" />
      </g>
    );
  }

  if (hotspot.kind === "power") {
    return (
      <g aria-hidden className={styles.cabinetPowerModule}>
        <rect x={x} y={y} width={width} height={height} rx="2" />
        <circle cx={x + width * 0.28} cy={y + height * 0.58} r={Math.min(14, width * 0.13)} />
        <rect x={x + width * 0.52} y={y + height * 0.2} width={width * 0.32} height={height * 0.58} rx="2" />
      </g>
    );
  }

  return (
    <g aria-hidden className={styles.cabinetGenericModule}>
      <rect x={x} y={y} width={width} height={height} rx="2" />
      <path d={`M${x + 8} ${y + 10}h${Math.max(0, width - 16)}`} />
      <path d={`M${x + 8} ${y + height - 10}h${Math.max(0, width - 16)}`} />
    </g>
  );
}

function ElectronicsCabinetDrawing() {
  const hotspots = DVOR_1150_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.filter((hotspot) => hotspot.surface === "electronics"),
  );

  return (
    <g>
      <rect className={styles.cabinetShadow} x="83" y="26" width="434" height="946" rx="7" />
      <rect className={styles.cabinetOuter} x="78" y="18" width="444" height="946" rx="6" />
      <path className={styles.cabinetRail} d="M104 34v912M496 34v912" />
      <rect className={styles.cabinetBay} x="118" y="48" width="364" height="900" rx="3" />
      <rect className={styles.cabinetHeader} x="132" y="64" width="336" height="34" rx="2" />
      <text className={styles.cabinetBrand} x="300" y="86">MODEL 1150 DVOR</text>

      <rect className={styles.transmitterBay} x="124" y="236" width="362" height="208" rx="3" />
      <text className={styles.bayLabel} x="137" y="258">TRANSMITTER 1</text>
      <rect className={styles.rmsBay} x="124" y="464" width="362" height="170" rx="3" />
      <text className={styles.bayLabel} x="137" y="486">RMS / INTERFACE</text>
      <rect className={styles.transmitterBay} x="124" y="648" width="362" height="208" rx="3" />
      <text className={styles.bayLabel} x="137" y="670">TRANSMITTER 2</text>
      <rect className={styles.powerBay} x="124" y="852" width="362" height="92" rx="3" />

      {hotspots.map((hotspot) => <ModuleBody key={hotspot.id} hotspot={hotspot} />)}
      {hotspots.map((hotspot) => <CabinetLabel key={`${hotspot.id}-label`} hotspot={hotspot} />)}

      {[48, 146, 236, 444, 464, 634, 648, 856, 944].flatMap((y) => [
        <Screw key={`left-${y}`} x={112} y={y} />,
        <Screw key={`right-${y}`} x={488} y={y} />,
      ])}
      <text className={styles.cabinetCaption} x="300" y="987">FIGURE 1-4 · ELECTRONICS CABINET</text>
    </g>
  );
}

function RibbonCable({ x, y, height }: { x: number; y: number; height: number }) {
  return (
    <g aria-hidden className={styles.ribbonCable}>
      <rect x={x} y={y} width="55" height={height} rx="5" />
      {Array.from({ length: 12 }, (_, index) => (
        <path key={index} d={`M${x + 5 + index * 4} ${y + 7}v${height - 14}`} />
      ))}
      <rect x={x - 5} y={y - 5} width="65" height="16" rx="3" />
      <rect x={x - 5} y={y + height - 11} width="65" height="16" rx="3" />
    </g>
  );
}

function CommutatorRackDrawing() {
  const hotspots = DVOR_1150_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.filter((hotspot) => hotspot.surface === "commutator"),
  );

  return (
    <g>
      <rect className={styles.cabinetShadow} x="83" y="26" width="434" height="946" rx="7" />
      <rect className={styles.cabinetOuter} x="78" y="18" width="444" height="946" rx="6" />
      <path className={styles.cabinetRail} d="M104 34v912M496 34v912" />
      <rect className={styles.cabinetBay} x="118" y="48" width="364" height="900" rx="3" />
      <rect className={styles.cabinetHeader} x="132" y="64" width="336" height="34" rx="2" />
      <text className={styles.cabinetBrand} x="300" y="86">DVOR COMMUTATOR</text>

      <rect className={styles.commutatorBoard} x="130" y="104" width="340" height="352" rx="3" />
      <rect className={styles.commutatorBoard} x="130" y="628" width="340" height="292" rx="3" />
      <rect className={styles.commutatorControl} x="130" y="470" width="340" height="142" rx="3" />
      <RibbonCable x={386} y={128} height={310} />
      <RibbonCable x={386} y={646} height={252} />

      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 3 }, (_, column) => (
          <circle key={`upper-${row}-${column}`} className={styles.commutatorConnector} cx={160 + column * 56} cy={142 + row * 37} r="10" />
        )),
      )}
      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 3 }, (_, column) => (
          <circle key={`lower-${row}-${column}`} className={styles.commutatorConnector} cx={160 + column * 56} cy={664 + row * 35} r="10" />
        )),
      )}
      <circle className={styles.controlConnector} cx="158" cy="518" r="13" />
      <rect className={styles.controlConnector} x="150" y="548" width="18" height="38" rx="3" />
      <rect className={styles.controlPlate} x="196" y="528" width="78" height="36" rx="2" />

      <rect className={styles.upgradePanel} x="486" y="476" width="72" height="128" rx="3" />
      <text className={styles.upgradeLabel} x="522" y="500">CURRENT</text>
      <text className={styles.upgradeLabel} x="522" y="514">VERSION</text>
      <circle className={styles.fieldDetector} cx="508" cy="546" r="13" />
      <circle className={styles.fieldDetector} cx="538" cy="546" r="13" />
      <rect className={styles.fieldSplitter} x="498" y="570" width="50" height="18" rx="2" />

      {hotspots.map((hotspot) => <CabinetLabel key={`${hotspot.id}-label`} hotspot={hotspot} />)}
      {[48, 104, 456, 470, 612, 628, 920, 944].flatMap((y) => [
        <Screw key={`left-${y}`} x={112} y={y} />,
        <Screw key={`right-${y}`} x={488} y={y} />,
      ])}
      <text className={styles.cabinetCaption} x="300" y="987">FIGURE 1-5 · COMMUTATOR RACK</text>
    </g>
  );
}

export function Dvor1150Cabinet({
  surface,
  selectedHotspotIds,
  onSelect,
}: Dvor1150CabinetProps) {
  const hotspots = DVOR_1150_BLOCKS.flatMap((block) =>
    block.cabinetHotspots.filter((hotspot) => hotspot.surface === surface),
  );

  return (
    <svg
      className={styles.cabinetDrawing}
      viewBox={`0 0 ${cabinetViewBox.width} ${cabinetViewBox.height}`}
      role="img"
      aria-label={surface === "electronics"
        ? "Electronics Cabinet DVOR 1150 theo Figure 1-4"
        : "Commutator Rack DVOR 1150 theo Figure 1-5"}
    >
      <defs>
        <linearGradient id="dvor1150-cabinet-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#77878b" />
          <stop offset="0.12" stopColor="#d5dddc" />
          <stop offset="0.5" stopColor="#aeb9b9" />
          <stop offset="0.88" stopColor="#e1e6e4" />
          <stop offset="1" stopColor="#718186" />
        </linearGradient>
        <linearGradient id="dvor1150-panel-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dce2e0" />
          <stop offset="0.48" stopColor="#9da9aa" />
          <stop offset="1" stopColor="#d7dddb" />
        </linearGradient>
        <pattern id="dvor1150-brush" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 1h5M0 4h5" stroke="#fff" strokeOpacity=".14" strokeWidth=".8" />
        </pattern>
        <filter id="dvor1150-hotspot-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect className={styles.cabinetBackdrop} width="600" height="1000" rx="8" />
      {surface === "electronics" ? <ElectronicsCabinetDrawing /> : <CommutatorRackDrawing />}
      {hotspots.map((hotspot) => (
        <CabinetHotspot
          key={hotspot.id}
          hotspot={hotspot}
          selected={selectedHotspotIds.has(hotspot.id)}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}
