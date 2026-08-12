"use client";

import type {
  Dvor220BlockId,
  Dvor220CabinetHotspot,
  Dvor220CabinetSurface,
} from "./block-diagram-data";
import {
  DVOR_220_BLOCKS,
  DVOR_220_HOTSPOT_TO_BLOCK,
} from "./block-diagram-data";
import styles from "./dvor220-block-diagram.module.css";

interface Dvor220CabinetProps {
  surface: Dvor220CabinetSurface;
  selectedHotspotIds: ReadonlySet<string>;
  onSelect: (blockId: Dvor220BlockId, hotspot: Dvor220CabinetHotspot) => void;
}

type CabinetLayerProps = Pick<Dvor220CabinetProps, "selectedHotspotIds" | "onSelect">;

function Screw({ x, y, radius = 4 }: { x: number; y: number; radius?: number }) {
  return (
    <g className={styles.cabinetScrew} aria-hidden>
      <circle cx={x} cy={y} r={radius} />
      <path d={`M${x - radius * 0.58} ${y}h${radius * 1.16}M${x} ${y - radius * 0.58}v${radius * 1.16}`} />
    </g>
  );
}

function Led({ x, y, color = "green" }: { x: number; y: number; color?: "green" | "red" | "amber" | "off" }) {
  return <circle className={styles[`cabinetLed${color[0]!.toUpperCase()}${color.slice(1)}`]} cx={x} cy={y} r="3" aria-hidden />;
}

function PullHandle({ x, y, height = 90 }: { x: number; y: number; height?: number }) {
  return (
    <g className={styles.cabinetHandle} aria-hidden>
      <rect x={x - 7} y={y} width="14" height={height} rx="7" />
      <path d={`M${x} ${y + 13}v${height - 26}`} />
    </g>
  );
}

function NarrowCard({ x, y = 72, height = 176, label, leds = 2 }: { x: number; y?: number; height?: number; label: string; leds?: number }) {
  return (
    <g className={styles.narrowCard} aria-hidden>
      <rect x={x} y={y} width="21" height={height} rx="1.5" />
      <rect x={x + 2.5} y={y + 4} width="16" height="16" rx="1" />
      <Screw x={x + 10.5} y={y + 12} radius={2.7} />
      {Array.from({ length: leds }, (_, index) => (
        <Led key={index} x={x + 10.5} y={y + 33 + index * 10} color={index === 0 ? "green" : "off"} />
      ))}
      <rect x={x + 4.5} y={y + 74} width="12" height="25" rx="1" />
      <rect x={x + 4.5} y={y + 108} width="12" height="17" rx="1" />
      <text x={x + 10.5} y={y + height - 19}>{label}</text>
      <Screw x={x + 10.5} y={y + height - 9} radius={2.7} />
    </g>
  );
}

function Amplifier({ x, y = 280, width, label, sideband = false }: { x: number; y?: number; width: number; label: string; sideband?: boolean }) {
  return (
    <g className={styles.amplifierModule} aria-hidden>
      <rect x={x} y={y} width={width} height="198" rx="2" />
      <rect x={x + 2} y={y + 3} width={width - 4} height="19" rx="1" />
      <text x={x + width / 2} y={y + 16}>{label}</text>
      <Screw x={x + width / 2} y={y + 8} radius={3.1} />
      <PullHandle x={x + 13} y={y + 44} height={88} />
      <Led x={x + width - 16} y={y + 41} color="green" />
      <text x={x + width - 16} y={y + 35}>POWER</text>
      {sideband ? (
        <>
          <Led x={x + width - 16} y={y + 60} color="green" />
          <Led x={x + width - 16} y={y + 79} color="green" />
          <Led x={x + width - 16} y={y + 98} color="off" />
          <Led x={x + width - 16} y={y + 117} color="off" />
          <text x={x + width - 16} y={y + 55}>COS</text>
          <text x={x + width - 16} y={y + 74}>SIN</text>
        </>
      ) : (
        <>
          <Led x={x + width - 16} y={y + 64} color="green" />
          <Led x={x + width - 16} y={y + 87} color="off" />
          <text x={x + width - 16} y={y + 59}>RF ON</text>
          <text x={x + width - 16} y={y + 82}>FAULT</text>
        </>
      )}
      <circle cx={x + width - 16} cy={y + 156} r="8" />
      {sideband ? <circle cx={x + width - 16} cy={y + 178} r="8" /> : null}
      <Screw x={x + width / 2} y={y + 190} radius={3.1} />
    </g>
  );
}

function TransmitterRack({ y, transmitter }: { y: number; transmitter: 1 | 2 }) {
  return (
    <g>
      <rect className={styles.rackBay} x="94" y={y - 10} width="358" height="226" rx="2" />
      <rect className={styles.fanStrip} x="105" y={y} width="335" height="12" rx="1" />
      <text className={styles.bayTitle} x="111" y={y + 9}>1A{transmitter + 1} · TX{transmitter}</text>
      <Amplifier x={105} y={y + 18} width={56} label="LSB SMA" sideband />
      <Amplifier x={165} y={y + 18} width={68} label="CMA" />
      <Amplifier x={237} y={y + 18} width={56} label="USB SMA" sideband />
      <g className={styles.dcdcCabinetModule} aria-hidden>
        <rect x="297" y={y + 18} width="44" height="198" rx="2" />
        <text x="319" y={y + 36}>DC/DC</text>
        <PullHandle x={307} y={y + 61} height={94} />
        {[0, 1, 2].map((row) => <Led key={row} x={328} y={y + 61 + row * 18} color={row === 0 ? "green" : "off"} />)}
        {[0, 1, 2, 3, 4, 5, 6].map((row) => <circle key={row} cx="328" cy={y + 127 + row * 10} r="3.2" />)}
      </g>
      <NarrowCard x={345} y={y + 18} height={198} label="MSG" leds={2} />
      <NarrowCard x={378} y={y + 18} height={198} label="SYN" leds={3} />
      <NarrowCard x={411} y={y + 18} height={198} label={`MON ${transmitter}`} leds={6} />
    </g>
  );
}

function LmiDoor() {
  return (
    <g className={styles.lmiDoor} aria-hidden>
      <rect x="485" y="34" width="222" height="924" rx="5" />
      <rect x="501" y="58" width="190" height="882" rx="3" />
      <rect x="514" y="92" width="134" height="142" rx="3" />
      <rect className={styles.lmiScreen} x="525" y="106" width="91" height="96" rx="2" />
      {["N", "W", "A", "M"].map((label, index) => (
        <g key={label}>
          <rect x="623" y={108 + index * 20} width="18" height="14" rx="2" />
          <text x="632" y={118 + index * 20}>{label}</text>
        </g>
      ))}
      <circle cx="632" cy="198" r="8" />
      <path d="M632 190v22" />
      <text x="581" y="220">LOCAL MAINTENANCE INTERFACE</text>
      <rect x="529" y="272" width="146" height="3" rx="1" />
      <rect x="529" y="289" width="146" height="3" rx="1" />
      <rect x="529" y="306" width="146" height="3" rx="1" />
      <rect x="529" y="570" width="146" height="3" rx="1" />
      <rect x="529" y="587" width="146" height="3" rx="1" />
      <rect x="529" y="604" width="146" height="3" rx="1" />
      <rect x="529" y="788" width="146" height="3" rx="1" />
      <rect x="529" y="805" width="146" height="3" rx="1" />
      <rect x="529" y="822" width="146" height="3" rx="1" />
      <PullHandle x={681} y={460} height={110} />
      <text className={styles.cabinetBrandVertical} x="516" y="905">MOPIENS · 220 DVOR</text>
    </g>
  );
}

function FrontCabinet({ selectedHotspotIds, onSelect }: CabinetLayerProps) {
  const auxCards = [
    [164, "TSG", 3], [188, "SCU", 3], [213, "SCU", 3], [238, "EMU", 2],
    [263, "NIU", 3], [288, "NIU", 3], [313, "DC/A", 3], [338, "DC/A", 3],
    [363, "MDM", 3], [388, "MDM", 3], [413, "VAU", 2],
  ] as const;

  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 760 1000" role="img" aria-label="Mặt trước cabinet DVOR 220 mở cửa">
      <defs>
        <linearGradient id="dvor220-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#899698" />
          <stop offset="0.18" stopColor="#d6dcda" />
          <stop offset="0.52" stopColor="#aab4b3" />
          <stop offset="0.82" stopColor="#edf0ed" />
          <stop offset="1" stopColor="#788588" />
        </linearGradient>
        <linearGradient id="dvor220-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5e8e4" />
          <stop offset="0.48" stopColor="#bfc7c4" />
          <stop offset="1" stopColor="#8f9b9b" />
        </linearGradient>
        <filter id="dvor220-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect className={styles.cabinetBackdrop} width="760" height="1000" />
      <rect className={styles.cabinetShadow} x="66" y="18" width="408" height="964" rx="8" />
      <rect className={styles.cabinetOuter} x="78" y="12" width="390" height="956" rx="5" />
      <rect className={styles.cabinetRail} x="88" y="36" width="370" height="916" />
      <rect className={styles.cabinetHeader} x="94" y="28" width="358" height="25" rx="2" />
      <text className={styles.cabinetBrand} x="273" y="45">MOPIENS · 220 DVOR</text>

      <g aria-hidden>
        <rect className={styles.rackBay} x="94" y="60" width="358" height="194" rx="2" />
        <text className={styles.bayTitle} x="102" y="69">1A1 · AUXILIARY ELECTRONICS</text>
        <g className={styles.cspCabinetPanel}>
          <rect x="105" y="72" width="55" height="176" rx="2" />
          <text x="132.5" y="87">CSP</text>
          {[0, 1, 2, 3, 4].map((row) => (
            <g key={row}>
              <Led x={120} y={102 + row * 17} color={row < 2 ? "green" : row === 2 ? "red" : "off"} />
              <Led x={145} y={102 + row * 17} color={row < 2 ? "green" : row === 2 ? "red" : "off"} />
              <path d={`M123 ${102 + row * 17}h19`} />
            </g>
          ))}
          {[0, 1, 2, 3].map((row) => <Led key={row} x={121 + (row % 2) * 22} y={192 + Math.floor(row / 2) * 14} color={row === 0 ? "green" : "off"} />)}
          <circle cx="145" cy="227" r="5" />
          <Screw x={132.5} y={239} radius={3} />
        </g>
        {auxCards.map(([x, label, leds]) => <NarrowCard key={`${x}-${label}`} x={x} label={label} leds={leds} />)}
      </g>

      <TransmitterRack y={262} transmitter={1} />

      <g className={styles.pdcCabinetPanel} aria-hidden>
        <rect x="94" y="490" width="358" height="100" rx="2" />
        <rect x="105" y="500" width="335" height="82" rx="2" />
        <text x="272" y="517">1A8A1 · POWER DETECTOR / CHANGEOVER</text>
        {[136, 196, 256, 316, 382].map((x, index) => (
          <g key={x}>
            <circle cx={x} cy="548" r="9" />
            <circle cx={x} cy="548" r="4" />
            <text x={x} y="568">{["LSB COS", "LSB SIN", "USB COS", "USB SIN", "CAR"][index]}</text>
          </g>
        ))}
        <PullHandle x={272} y={527} height={40} />
        <Led x={424} y={514} color="green" />
      </g>

      <TransmitterRack y={592} transmitter={2} />

      <g className={styles.powerShelf} aria-hidden>
        <rect className={styles.rackBay} x="94" y="826" width="358" height="98" rx="2" />
        <text className={styles.bayTitle} x="102" y="835">1A4 · POWER MANAGEMENT</text>
        <rect x="105" y="836" width="90" height="84" rx="2" />
        <circle cx="126" cy="855" r="9" />
        <text x="126" y="872">AC AVAILABLE</text>
        {[0, 1, 2].map((column) => (
          <g key={column}>
            <rect x={112 + column * 25} y="881" width="19" height="29" rx="1" />
            <path d={`M116 ${893 + column * 0}h11`} />
            <text x={121.5 + column * 25} y="917">{["AC", "B1", "B2"][column]}</text>
          </g>
        ))}
        {[200, 322].map((x, index) => (
          <g key={x}>
            <rect x={x} y="836" width="118" height="84" rx="2" />
            <rect x={x + 18} y="856" width="72" height="28" rx="2" />
            <text x={x + 54} y="851">PMU {index + 1}</text>
            {[0, 1, 2, 3, 4].map((column) => <Led key={column} x={x + 29 + column * 14} y={895} color={column === 0 ? "green" : "off"} />)}
            <Screw x={x + 104} y={852} radius={3} />
          </g>
        ))}
      </g>

      <g className={styles.acdcShelf} aria-hidden>
        <rect className={styles.rackBay} x="94" y="926" width="358" height="42" rx="2" />
        {[105, 172, 239, 306, 373].map((x, index) => (
          <g key={x}>
            <rect x={x} y="930" width={index === 4 ? 67 : 63} height="34" rx="1" />
            {[0, 1, 2].map((row) => <path key={row} d={`M${x + 8} ${937 + row * 8}h${index === 4 ? 51 : 47}`} />)}
            <circle cx={x + 8} cy="958" r="2.5" />
            <Led x={x + 17} y={958} color="green" />
            <text x={x + 33} y="946">AC/DC {index + 1}</text>
          </g>
        ))}
      </g>

      <LmiDoor />
      <text className={styles.cabinetCaption} x="273" y="990">FRONT · DUAL EQUIPMENT CONFIGURATION</text>
      <CabinetHotspots surface="front" selectedHotspotIds={selectedHotspotIds} onSelect={onSelect} />
    </svg>
  );
}

function RearCabinet({ selectedHotspotIds, onSelect }: CabinetLayerProps) {
  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 600 1000" role="img" aria-label="Mặt sau cabinet DVOR 220 mở cửa">
      <defs>
        <linearGradient id="dvor220-rear-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#6f7d7f" />
          <stop offset="0.35" stopColor="#cbd1ce" />
          <stop offset="0.65" stopColor="#98a3a3" />
          <stop offset="1" stopColor="#e0e4e1" />
        </linearGradient>
        <filter id="dvor220-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect className={styles.cabinetBackdrop} width="600" height="1000" />
      <rect className={styles.cabinetShadow} x="76" y="18" width="448" height="964" rx="8" />
      <rect className={styles.rearCabinetOuter} x="88" y="12" width="424" height="956" rx="5" />
      <rect className={styles.rearInterior} x="108" y="42" width="384" height="894" rx="3" />
      <text className={styles.cabinetBrand} x="300" y="33">MOPIENS 220 DVOR · REAR</text>

      <g className={styles.rearAssembly} aria-hidden>
        <rect x="176" y="84" width="248" height="88" rx="3" />
        <text x="300" y="101">1A7 · INTERFACE BOARD</text>
        {[0, 1, 2, 3, 4, 5].map((column) => (
          <g key={column}>
            <rect x={190 + column * 36} y="116" width="26" height="24" rx="2" />
            <path d={`M196 ${122 + (column % 2) * 4}h14M196 ${130 + (column % 2) * 4}h14`} />
          </g>
        ))}
        <text x="300" y="160">VOICE · IDENT · ENV · LAN · RS-232 · USB</text>
      </g>

      <g className={styles.rearDivider} aria-hidden>
        <rect x="176" y="188" width="248" height="82" rx="3" />
        <text x="300" y="205">1PD1 · QUINT 3-WAY RF DIVIDER</text>
        {[0, 1, 2, 3, 4].map((column) => (
          <g key={column}>
            <circle cx={204 + column * 48} cy="230" r="8" />
            <path d={`M${204 + column * 48} 238v13m-12 0h24`} />
            <circle cx={192 + column * 48} cy="256" r="4" />
            <circle cx={204 + column * 48} cy="256" r="4" />
            <circle cx={216 + column * 48} cy="256" r="4" />
          </g>
        ))}
      </g>

      {[300, 500].map((y, rack) => (
        <g className={styles.rearBackplane} key={y} aria-hidden>
          <rect x="140" y={y} width="320" height="160" rx="3" />
          <text x="300" y={y + 18}>TX{rack + 1} BACKPLANE · RF / CAN / POWER</text>
          {[0, 1, 2, 3, 4, 5].map((column) => <rect key={column} x={158 + column * 48} y={y + 34} width="32" height="96" rx="2" />)}
          {[0, 1, 2, 3, 4].map((line) => <path key={line} d={`M160 ${y + 144 - line * 8}h280`} />)}
          <path d={`M178 ${y + 52}C215 ${y + 22}, 365 ${y + 22}, 414 ${y + 58}`} />
          <path d={`M178 ${y + 112}C250 ${y + 145}, 350 ${y + 145}, 414 ${y + 104}`} />
        </g>
      ))}

      <g className={styles.rearPower} aria-hidden>
        <rect x="140" y="704" width="320" height="184" rx="3" />
        <text x="300" y="724">PMU / AC-DC REAR TERMINALS</text>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((column) => <rect key={column} x={164 + column * 34} y="756" width="22" height="30" rx="1" />)}
        {[0, 1, 2, 3, 4].map((line) => <path key={line} d={`M168 ${815 + line * 10}h264`} />)}
        <path d="M174 778C210 908, 250 740, 290 878S386 748, 426 838" />
      </g>

      <text className={styles.cabinetCaption} x="300" y="956">REAR · DOOR OPEN</text>
      <CabinetHotspots surface="rear" selectedHotspotIds={selectedHotspotIds} onSelect={onSelect} />
    </svg>
  );
}

function AsuCabinet({ selectedHotspotIds, onSelect }: CabinetLayerProps) {
  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 600 930" role="img" aria-label="Bên trong Antenna Switching Unit DVOR 220">
      <defs>
        <linearGradient id="dvor220-asu-blue" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#16a9c2" />
          <stop offset="0.45" stopColor="#087f9b" />
          <stop offset="1" stopColor="#035168" />
        </linearGradient>
        <filter id="dvor220-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect className={styles.cabinetBackdrop} width="600" height="930" />
      <rect className={styles.asuShadow} x="58" y="28" width="484" height="878" rx="10" />
      <rect className={styles.asuOuter} x="66" y="20" width="468" height="874" rx="7" />
      <rect className={styles.asuHeader} x="72" y="42" width="456" height="45" rx="3" />
      <text className={styles.asuBrand} x="92" y="71">MOPIENS</text>
      <text className={styles.asuTitle} x="502" y="71">ASU · 2A1</text>
      <rect className={styles.asuInterior} x="88" y="101" width="424" height="774" rx="4" />

      <g className={styles.asuBoard} aria-hidden>
        <rect x="108" y="112" width="142" height="116" rx="3" />
        <text x="179" y="132">2A1A1 · ASU-IF</text>
        <rect x="124" y="150" width="47" height="49" rx="2" />
        <text x="147.5" y="178">DC/DC</text>
        <rect x="184" y="150" width="47" height="49" rx="2" />
        <text x="207.5" y="178">CPLD</text>
        <path d="M126 212h104M136 139h84" />
      </g>

      <g className={styles.asuBoard} aria-hidden>
        <rect x="282" y="112" width="142" height="116" rx="3" />
        <text x="353" y="132">2A1A2 · TOGGLE MODULE</text>
        {[0, 1, 2, 3].map((row) => (
          <g key={row}>
            <circle cx="308" cy={153 + row * 17} r="5" />
            <path d={`M313 ${153 + row * 17}h82`} />
            <circle cx="397" cy={153 + row * 17} r="5" />
          </g>
        ))}
      </g>

      {[
        [108, 286, "2A1A3 · SM COS LO", "A1 · A3 · … · A23"],
        [282, 286, "2A1A4 · SM COS HI", "A25 · A27 · … · A47"],
        [108, 486, "2A1A5 · SM SIN LO", "A2 · A4 · … · A24"],
        [282, 486, "2A1A6 · SM SIN HI", "A26 · A28 · … · A48"],
      ].map(([x, y, title, antennas]) => (
        <g className={styles.asuSelectModule} key={title} aria-hidden>
          <rect x={Number(x)} y={Number(y)} width="142" height="168" rx="3" />
          <text x={Number(x) + 71} y={Number(y) + 21}>{title}</text>
          <circle cx={Number(x) + 24} cy={Number(y) + 84} r="8" />
          {Array.from({ length: 6 }, (_, index) => (
            <g key={index}>
              <path d={`M${Number(x) + 32} ${Number(y) + 84}L${Number(x) + 103} ${Number(y) + 46 + index * 15}`} />
              <circle cx={Number(x) + 109} cy={Number(y) + 46 + index * 15} r="4" />
            </g>
          ))}
          <text x={Number(x) + 71} y={Number(y) + 154}>{antennas}</text>
        </g>
      ))}

      <g className={styles.asuPowerMonitor} aria-hidden>
        <rect x="108" y="730" width="316" height="142" rx="3" />
        <text x="266" y="751">2A1A7 · OPTIONAL POWER MONITOR</text>
        <circle cx="148" cy="804" r="29" />
        <path d="M148 804l13-17" />
        <text x="148" y="842">RF POWER</text>
        {[0, 1, 2, 3, 4].map((column) => (
          <g key={column}>
            <circle cx={210 + column * 43} cy="803" r="14" />
            <path d={`M210 ${803}h${column === 0 ? 0 : 0}`} />
            <text x={210 + column * 43} y="835">{["CAR", "UC", "US", "LC", "LS"][column]}</text>
          </g>
        ))}
      </g>

      <g className={styles.asuCableRuns} aria-hidden>
        <path d="M250 170C268 170 262 330 282 330M250 186C270 186 260 530 282 530" />
        <path d="M353 228V264H179V286M353 264v22" />
        <path d="M179 454v32M353 454v32" />
        <path d="M179 654v64M353 654v64" />
      </g>
      <CabinetHotspots surface="asu" selectedHotspotIds={selectedHotspotIds} onSelect={onSelect} />
    </svg>
  );
}

function CabinetHotspots({ surface, selectedHotspotIds, onSelect }: { surface: Dvor220CabinetSurface } & CabinetLayerProps) {
  const hotspots = DVOR_220_BLOCKS.flatMap((block) => block.cabinetHotspots).filter((item) => item.surface === surface);
  return (
    <g className={styles.cabinetHotspots}>
      {hotspots.map((hotspot) => {
        const blockId = DVOR_220_HOTSPOT_TO_BLOCK.get(hotspot.id);
        if (!blockId) return null;
        return (
          <g
            key={hotspot.id}
            className={styles.cabinetHotspot}
            data-hotspot-id={hotspot.id}
            data-selected={selectedHotspotIds.has(hotspot.id) || undefined}
            role="button"
            tabIndex={0}
            aria-label={`${hotspot.shortLabel}, ${hotspot.assemblyId}`}
            aria-pressed={selectedHotspotIds.has(hotspot.id)}
            onClick={() => onSelect(blockId, hotspot)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(blockId, hotspot);
              }
            }}
          >
            <rect className={styles.hotspotTarget} x={hotspot.x} y={hotspot.y} width={hotspot.width} height={hotspot.height} rx="3" />
            <rect className={styles.hotspotOutline} x={hotspot.x + 3} y={hotspot.y + 3} width={Math.max(0, hotspot.width - 6)} height={Math.max(0, hotspot.height - 6)} rx="2" />
            <title>{`${hotspot.shortLabel} · ${hotspot.assemblyId}`}</title>
          </g>
        );
      })}
    </g>
  );
}

export function Dvor220Cabinet({ surface, selectedHotspotIds, onSelect }: Dvor220CabinetProps) {
  const layerProps = { selectedHotspotIds, onSelect };
  return surface === "front" ? <FrontCabinet {...layerProps} /> : surface === "rear" ? <RearCabinet {...layerProps} /> : <AsuCabinet {...layerProps} />;
}
