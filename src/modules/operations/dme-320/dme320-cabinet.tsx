"use client";

import type {
  Dme320BlockId,
  Dme320CabinetHotspot,
  Dme320CabinetSurface,
} from "./block-diagram-data";
import {
  DME_320_BLOCKS,
  DME_320_HOTSPOT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dme320-block-diagram.module.css";

interface Dme320CabinetProps {
  surface: Dme320CabinetSurface;
  selectedHotspotIds: ReadonlySet<string>;
  onSelect: (blockId: Dme320BlockId, hotspot: Dme320CabinetHotspot) => void;
}

type CabinetLayerProps = Pick<Dme320CabinetProps, "selectedHotspotIds" | "onSelect">;

function Screw({ x, y, radius = 3.5 }: { x: number; y: number; radius?: number }) {
  return (
    <g className={styles.cabinetScrew} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      <path d={`M${x - radius * 0.62} ${y}h${radius * 1.24}M${x} ${y - radius * 0.62}v${radius * 1.24}`} />
    </g>
  );
}

function Led({
  x,
  y,
  color = "off",
}: {
  x: number;
  y: number;
  color?: "green" | "red" | "amber" | "off";
}) {
  const suffix = `${color[0]!.toUpperCase()}${color.slice(1)}`;
  return <circle className={styles[`cabinetLed${suffix}`]} cx={x} cy={y} r="3" aria-hidden />;
}

function PullHandle({ x, y, height = 86 }: { x: number; y: number; height?: number }) {
  return (
    <g className={styles.cabinetHandle} aria-hidden>
      <rect x={x - 6} y={y} width="12" height={height} rx="6" />
      <path d={`M${x} ${y + 12}v${height - 24}`} />
    </g>
  );
}

function AuxiliaryCard({
  x,
  width,
  label,
  indicators = 3,
}: {
  x: number;
  width: number;
  label: string;
  indicators?: number;
}) {
  return (
    <g className={styles.narrowCard} aria-hidden>
      <rect x={x} y="70" width={width} height="172" rx="2" />
      <Screw x={x + width / 2} y={80} radius={2.5} />
      <text x={x + width / 2} y="96">{label}</text>
      {Array.from({ length: indicators }, (_, index) => (
        <Led
          key={index}
          x={x + width / 2}
          y={112 + index * 13}
          color={index === 0 ? "green" : index === 1 ? "amber" : "off"}
        />
      ))}
      <rect x={x + 5} y="158" width={Math.max(10, width - 10)} height="26" rx="1" />
      <rect x={x + 5} y="193" width={Math.max(10, width - 10)} height="20" rx="1" />
      <Screw x={x + width / 2} y={231} radius={2.5} />
    </g>
  );
}

function TransponderModule({
  x,
  y,
  width,
  label,
  kind = "card",
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  kind?: "card" | "amplifier" | "power" | "rf";
}) {
  const className = kind === "amplifier"
    ? styles.amplifierModule
    : kind === "power"
      ? styles.dcdcCabinetModule
      : styles.narrowCard;

  return (
    <g className={className} aria-hidden>
      <rect x={x} y={y} width={width} height="214" rx="2" />
      <rect x={x + 2} y={y + 3} width={Math.max(8, width - 4)} height="19" rx="1" />
      <text x={x + width / 2} y={y + 17}>{label}</text>
      <Screw x={x + width / 2} y={y + 9} radius={2.5} />
      {width >= 36 ? <PullHandle x={x + 11} y={y + 44} height={kind === "amplifier" ? 106 : 82} /> : null}
      <Led x={x + width - 10} y={y + 43} color="green" />
      <Led x={x + width - 10} y={y + 58} color="off" />
      {kind === "amplifier" ? (
        <>
          <Led x={x + width - 10} y={y + 73} color="off" />
          <circle cx={x + width - 13} cy={y + 160} r="7" />
        </>
      ) : null}
      {kind === "power" ? Array.from({ length: 6 }, (_, index) => (
        <circle key={index} cx={x + width - 11} cy={y + 99 + index * 13} r="3" />
      )) : null}
      {kind === "card" || kind === "rf" ? (
        <>
          <rect x={x + 5} y={y + 88} width={Math.max(10, width - 10)} height="34" rx="1" />
          <rect x={x + 5} y={y + 136} width={Math.max(10, width - 10)} height="24" rx="1" />
        </>
      ) : null}
      <Screw x={x + width / 2} y={y + 204} radius={2.5} />
    </g>
  );
}

function TransponderShelf({ y, transmitter }: { y: number; transmitter: 1 | 2 }) {
  return (
    <g aria-hidden>
      <rect className={styles.rackBay} x="96" y={y - 12} width="388" height="244" rx="3" />
      <rect className={styles.fanStrip} x="108" y={y} width="364" height="14" rx="1" />
      <text className={styles.bayTitle} x="115" y={y + 11}>1A{transmitter + 1} · TXP{transmitter} / MON{transmitter}</text>
      <TransponderModule x={108} y={y + 20} width={52} label="DPX" kind="rf" />
      <TransponderModule x={164} y={y + 20} width={36} label="RXU" />
      <TransponderModule x={204} y={y + 20} width={68} label="HPA" kind="amplifier" />
      <TransponderModule x={276} y={y + 20} width={38} label="TXU" />
      <TransponderModule x={318} y={y + 20} width={50} label="DC/DC" kind="power" />
      <TransponderModule x={372} y={y + 20} width={30} label="TCU" />
      <TransponderModule x={406} y={y + 20} width={30} label="RFG" kind="rf" />
      <TransponderModule x={440} y={y + 20} width={32} label="MON" />
    </g>
  );
}

function LmiDoor() {
  return (
    <g className={styles.lmiDoor} aria-hidden>
      <rect x="500" y="22" width="220" height="996" rx="6" />
      <rect x="514" y="46" width="192" height="950" rx="3" />
      <rect x="520" y="78" width="154" height="145" rx="3" />
      <rect className={styles.lmiScreen} x="532" y="91" width="116" height="100" rx="3" />
      {["N", "W", "A", "M"].map((label, index) => (
        <g key={label}>
          <Led x={660} y={104 + index * 20} color={index === 0 ? "green" : index === 1 ? "amber" : index === 2 ? "red" : "off"} />
          <text x="672" y={108 + index * 20}>{label}</text>
        </g>
      ))}
      <circle cx="660" cy="196" r="8" />
      <path d="M660 188v21" />
      <text x="597" y="214">1A6 · LMI</text>
      {[262, 282, 302, 512, 532, 552, 802, 822, 842].map((y) => (
        <rect key={y} x="536" y={y} width="140" height="3" rx="1" />
      ))}
      <PullHandle x={694} y={450} height={118} />
      <text className={styles.cabinetBrandVertical} x="526" y="952">MOPIENS · 320 DME</text>
    </g>
  );
}

function FrontCabinet({ selectedHotspotIds, onSelect }: CabinetLayerProps) {
  const auxiliaryCards = [
    [172, 28, "SCU1", 3],
    [204, 28, "SCU2", 3],
    [236, 28, "EMU", 2],
    [268, 28, "DC/A1", 2],
    [300, 28, "DC/A2", 2],
    [332, 28, "MDM1", 2],
    [364, 28, "MDM2", 2],
  ] as const;

  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 760 1040" role="group" aria-label="Mặt trước cabinet MOPIENS 320 DME, cửa mở">
      <defs>
        <linearGradient id="dme320-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#778587" />
          <stop offset="0.2" stopColor="#d8ddda" />
          <stop offset="0.52" stopColor="#9da9a8" />
          <stop offset="0.82" stopColor="#edf0ed" />
          <stop offset="1" stopColor="#6f7d7f" />
        </linearGradient>
        <linearGradient id="dme320-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#edf0ed" />
          <stop offset="0.5" stopColor="#bcc5c2" />
          <stop offset="1" stopColor="#8d9999" />
        </linearGradient>
        <filter id="dme320-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect className={styles.cabinetBackdrop} width="760" height="1040" />
      <rect className={styles.cabinetShadow} x="66" y="24" width="430" height="994" rx="8" />
      <rect className={styles.cabinetOuter} x="70" y="16" width="420" height="1000" rx="5" />
      <rect className={styles.cabinetRail} x="84" y="42" width="406" height="950" />
      <rect className={styles.cabinetHeader} x="96" y="28" width="388" height="28" rx="2" />
      <text className={styles.cabinetBrand} x="290" y="47">MOPIENS · 320 DME</text>

      <g aria-hidden>
        <rect className={styles.rackBay} x="96" y="58" width="388" height="194" rx="2" />
        <text className={styles.bayTitle} x="104" y="68">1A1 · AUXILIARY ELECTRONICS</text>
        <g className={styles.cspCabinetPanel}>
          <rect x="108" y="70" width="58" height="172" rx="2" />
          <text x="137" y="88">CSP</text>
          {Array.from({ length: 6 }, (_, row) => (
            <g key={row}>
              <Led x={122} y={105 + row * 17} color={row < 2 ? "green" : row === 2 ? "red" : "off"} />
              <Led x={151} y={105 + row * 17} color={row === 0 ? "green" : row === 2 ? "red" : "off"} />
              <path d={`M126 ${105 + row * 17}h21`} />
            </g>
          ))}
          <circle cx="137" cy="224" r="5" />
          <Screw x={137} y={233} radius={2.7} />
        </g>
        {auxiliaryCards.map(([x, width, label, indicators]) => (
          <AuxiliaryCard key={label} x={x} width={width} label={label} indicators={indicators} />
        ))}
      </g>

      <TransponderShelf y={266} transmitter={1} />
      <TransponderShelf y={536} transmitter={2} />

      <g className={styles.powerShelf} aria-hidden>
        <rect className={styles.rackBay} x="96" y="808" width="388" height="126" rx="2" />
        <text className={styles.bayTitle} x="104" y="820">1A4 · POWER MANAGEMENT</text>
        <rect x="108" y="824" width="40" height="100" rx="2" />
        <circle cx="128" cy="844" r="8" />
        <text x="128" y="863">AC</text>
        {[0, 1, 2].map((column) => (
          <g key={column}>
            <rect x={112 + column * 11} y="878" width="8" height="28" rx="1" />
            <text x={116 + column * 11} y="916">{["M", "B1", "B2"][column]}</text>
          </g>
        ))}
        {[154, 282].map((x, index) => (
          <g key={x}>
            <rect x={x} y="824" width="122" height="100" rx="2" />
            <text x={x + 61} y="841">PMU {index + 1}</text>
            <rect x={x + 18} y="850" width="72" height="29" rx="2" />
            {[0, 1, 2, 3, 4].map((column) => (
              <Led key={column} x={x + 25 + column * 17} y={895} color={column === 0 ? "green" : column === 2 ? "amber" : "off"} />
            ))}
            <Screw x={x + 108} y={839} radius={3} />
          </g>
        ))}
      </g>

      <g className={styles.acdcShelf} aria-hidden>
        <rect className={styles.rackBay} x="96" y="938" width="388" height="66" rx="2" />
        {[164, 286].map((x, index) => (
          <g key={x}>
            <rect x={x} y="944" width="116" height="52" rx="2" />
            {[0, 1, 2].map((row) => <path key={row} d={`M${x + 13} ${954 + row * 11}h88`} />)}
            <circle cx={x + 15} cy="988" r="3" />
            <Led x={x + 28} y={988} color="green" />
            <text x={x + 58} y="963">1A5A{index + 1}</text>
            <text x={x + 58} y="980">AC/DC {index + 1}</text>
          </g>
        ))}
      </g>

      <LmiDoor />
      <text className={styles.cabinetCaption} x="290" y="1030">FRONT · FIGURE 1-6 · DUAL HIGH-POWER CONFIGURATION</text>
      <CabinetHotspots surface="front" selectedHotspotIds={selectedHotspotIds} onSelect={onSelect} />
    </svg>
  );
}

function RearConnector({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g aria-hidden>
      <rect x={x} y={y} width="72" height="48" rx="2" />
      <circle cx={x + 17} cy={y + 25} r="8" />
      <path d={`M${x + 25} ${y + 25}h27`} />
      <text x={x + 36} y={y + 14}>{label}</text>
    </g>
  );
}

function RearCabinet({ selectedHotspotIds, onSelect }: CabinetLayerProps) {
  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 760 1040" role="group" aria-label="Mặt sau cabinet MOPIENS 320 DME Revision A, tháo cửa">
      <defs>
        <linearGradient id="dme320-rear-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#6f7d7f" />
          <stop offset="0.35" stopColor="#cbd1ce" />
          <stop offset="0.65" stopColor="#98a3a3" />
          <stop offset="1" stopColor="#e0e4e1" />
        </linearGradient>
        <filter id="dme320-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect className={styles.cabinetBackdrop} width="760" height="1040" />
      <rect className={styles.cabinetShadow} x="130" y="24" width="510" height="994" rx="8" />
      <rect className={styles.rearCabinetOuter} x="138" y="16" width="494" height="1000" rx="5" />
      <rect className={styles.rearInterior} x="158" y="42" width="454" height="950" rx="3" />
      <text className={styles.cabinetBrand} x="385" y="35">MOPIENS 320 DME · REAR REV. A</text>

      <g className={styles.rearAssembly} aria-hidden>
        <rect x="194" y="68" width="304" height="104" rx="3" />
        <text x="346" y="86">1A7 · INTERFACE BOARD</text>
        {[0, 1, 2, 3, 4, 5].map((column) => (
          <g key={column}>
            <rect x={211 + column * 44} y="101" width="31" height="26" rx="2" />
            <path d={`M217 ${108 + (column % 2) * 4}h19M217 ${117 + (column % 2) * 4}h19`} />
          </g>
        ))}
        <text x="346" y="153">USB · LAN · RS-232 · MODEM · SENSOR I/O</text>
      </g>

      <g className={styles.rearDivider} aria-hidden>
        <rect x="514" y="68" width="92" height="104" rx="3" />
        <text x="560" y="88">1RT1</text>
        <path d="M535 117h50M535 127h50M535 137h50" />
        <text x="560" y="158">RF LOAD</text>
      </g>

      <g className={styles.rearAssembly} aria-hidden>
        <rect x="194" y="184" width="304" height="92" rx="3" />
        <text x="346" y="201">1A1A9 / 1A11 · BP-A · REV. A</text>
        <path d="M210 214h270M210 265h270" />
        <RearConnector x={224} y={218} label="1A9" />
        <RearConnector x={312} y={218} label="1A10" />
        <text x="444" y="247">RF DETECTORS</text>
      </g>

      {[294, 570].map((y, rack) => (
        <g className={styles.rearBackplane} key={y} aria-hidden>
          <rect x="194" y={y} width="304" height="168" rx="3" />
          <text x="346" y={y + 18}>1A{rack + 2}A10 / A11 · BP-BL / BP-BR</text>
          {[0, 1, 2, 3, 4].map((column) => (
            <rect key={column} x={211 + column * 53} y={y + 34} width="34" height="96" rx="2" />
          ))}
          {[0, 1, 2, 3].map((line) => <path key={line} d={`M212 ${y + 144 - line * 8}h268`} />)}
          <path d={`M220 ${y + 55}C260 ${y + 21}, 420 ${y + 22}, 476 ${y + 65}`} />
          <path d={`M220 ${y + 116}C290 ${y + 151}, 410 ${y + 148}, 476 ${y + 110}`} />
        </g>
      ))}

      <g className={styles.rearDivider} aria-hidden>
        <RearConnector x={514} y={302} label="1CIR1" />
        <RearConnector x={514} y={388} label="1DC1" />
        <RearConnector x={194} y={476} label="1A8" />
        <RearConnector x={302} y={476} label="1FL1" />
        <RearConnector x={382} y={476} label="1RY1" />
        <RearConnector x={514} y={476} label="1DC3" />
        <RearConnector x={514} y={578} label="1CIR2" />
        <RearConnector x={514} y={664} label="1DC2" />
        <RearConnector x={514} y={756} label="1AR1" />
        <path d="M560 172V302M560 350V388M560 436V476M560 524V578M560 626V664M560 712V756" />
        <path d="M266 500h36M370 500h12M458 500h56" />
      </g>

      <g className={styles.rearPower} aria-hidden>
        <rect x="194" y="842" width="304" height="106" rx="3" />
        <text x="346" y="862">1A4A3 · BP-PM · POWER TERMINALS</text>
        {[0, 1, 2, 3, 4, 5, 6].map((column) => (
          <rect key={column} x={216 + column * 37} y="882" width="24" height="31" rx="1" />
        ))}
        <path d="M216 928h260" />
      </g>

      <text className={styles.cabinetCaption} x="385" y="1028">REAR · FIGURE 1-8 · CABINET REV. A</text>
      <CabinetHotspots surface="rear" selectedHotspotIds={selectedHotspotIds} onSelect={onSelect} />
    </svg>
  );
}

function CabinetHotspots({
  surface,
  selectedHotspotIds,
  onSelect,
}: { surface: Dme320CabinetSurface } & CabinetLayerProps) {
  const hotspots = DME_320_BLOCKS
    .flatMap((block) => block.cabinetHotspots)
    .filter((hotspot) => hotspot.surface === surface);

  return (
    <g>
      {hotspots.map((hotspot) => {
        const blockId = DME_320_HOTSPOT_TO_BLOCK.get(hotspot.id);
        if (!blockId) return null;
        const selected = selectedHotspotIds.has(hotspot.id);

        return (
          <g
            key={hotspot.id}
            className={styles.cabinetHotspot}
            data-hotspot-id={hotspot.id}
            data-selected={selected || undefined}
            role="button"
            tabIndex={0}
            aria-label={`${hotspot.shortLabel}, ${hotspot.assemblyId}`}
            aria-pressed={selected}
            onClick={() => onSelect(blockId, hotspot)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(blockId, hotspot);
              }
            }}
          >
            <rect className={styles.hotspotTarget} x={hotspot.x} y={hotspot.y} width={hotspot.width} height={hotspot.height} rx="3" />
            <rect
              className={styles.hotspotOutline}
              x={hotspot.x + 3}
              y={hotspot.y + 3}
              width={Math.max(0, hotspot.width - 6)}
              height={Math.max(0, hotspot.height - 6)}
              rx="2"
            />
            <title>{`${hotspot.shortLabel} · ${hotspot.assemblyId}`}</title>
          </g>
        );
      })}
    </g>
  );
}

export function Dme320Cabinet({ surface, selectedHotspotIds, onSelect }: Dme320CabinetProps) {
  const layerProps = { selectedHotspotIds, onSelect };
  return surface === "front" ? <FrontCabinet {...layerProps} /> : <RearCabinet {...layerProps} />;
}
