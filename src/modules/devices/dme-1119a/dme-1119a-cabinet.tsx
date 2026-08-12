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

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.cabinetScrew} aria-hidden>
      <circle cx={x} cy={y} r="4.5" />
      <path d={`M${x - 2.5} ${y}h5M${x} ${y - 2.5}v5`} />
    </g>
  );
}

function Handle({ x, y, height = 92 }: { x: number; y: number; height?: number }) {
  return (
    <g className={styles.cabinetHandle} aria-hidden>
      <rect x={x - 8} y={y} width="16" height={height} rx="8" />
      <path d={`M${x} ${y + 14}v${height - 28}`} />
    </g>
  );
}

function Led({ x, y, on = true }: { x: number; y: number; on?: boolean }) {
  return <circle className={on ? styles.cabinetLedOn : styles.cabinetLedOff} cx={x} cy={y} r="3.2" aria-hidden />;
}

function CardFace({ x, width, label }: { x: number; width: number; label: string }) {
  return (
    <g aria-hidden className={styles.cabinetCardFace}>
      <rect x={x} y="370" width={width} height="158" rx="2" />
      <rect x={x + 5} y="376" width={width - 10} height="18" rx="2" />
      <Screw x={x + width / 2} y={382} />
      <Screw x={x + width / 2} y={516} />
      <Led x={x + width / 2} y={486} />
      <text x={x + width / 2} y="406">{label}</text>
    </g>
  );
}

function FrontCabinet() {
  return (
    <g>
      <rect className={styles.cabinetBackdrop} width="600" height="1000" />
      <rect className={styles.cabinetShadow} x="82" y="22" width="436" height="956" rx="6" />
      <rect className={styles.cabinetOuter} x="92" y="14" width="416" height="954" rx="4" />
      <rect className={styles.cabinetRail} x="103" y="40" width="394" height="910" />
      <rect className={styles.cabinetHeader} x="108" y="28" width="384" height="22" rx="2" />
      <text className={styles.cabinetBrand} x="300" y="43">SELEX ES · MODEL 1119A HIGH POWER DME</text>

      <g className={styles.lcuAssembly} aria-hidden>
        <rect x="108" y="52" width="384" height="88" rx="2" />
        <rect className={styles.lcuScreen} x="132" y="68" width="116" height="56" rx="3" />
        <text x="190" y="92">INTEGRAL MONITOR 1</text>
        <text x="190" y="105">DELAY · POWER · PRF</text>
        <rect x="265" y="62" width="78" height="68" rx="2" />
        <text x="304" y="75">TRANSMITTER</text>
        {[0, 1, 2, 3].map((row) => (
          <g key={row}>
            <rect x="275" y={81 + row * 11} width="20" height="9" rx="1" />
            <rect x="313" y={81 + row * 11} width="20" height="9" rx="1" />
            <Led x={290} y={84 + row * 11} on={row === 0 || row === 1} />
            <Led x={328} y={84 + row * 11} on={false} />
          </g>
        ))}
        <rect x="351" y="62" width="129" height="32" rx="2" />
        <text x="415" y="74">MONITOR</text>
        {[0, 1, 2, 3, 4, 5].map((column) => <Led key={column} x={366 + column * 18} y={84} on={column === 0 || column === 3} />)}
        <rect x="351" y="98" width="129" height="32" rx="2" />
        <text x="415" y="109">SYSTEM</text>
        {[0, 1, 2, 3, 4].map((column) => <Led key={column} x={366 + column * 18} y={119} on={column === 4} />)}
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="108" y="150" width="384" height="210" rx="2" />
        <text className={styles.bayTitle} x="116" y="164">HIGH POWER RACK · 1A2</text>
        {[118, 308].map((x, index) => (
          <g className={styles.hpaModule} key={x}>
            <rect x={x} y="168" width="174" height="184" rx="2" />
            <Handle x={x + 28} y={205} height={96} />
            <Handle x={x + 146} y={205} height={96} />
            <circle cx={x + 87} cy="190" r="18" />
            <path d={`M${x + 75} 190h24M${x + 87} 178v24`} />
            <text x={x + 87} y="332">{index === 0 ? "1A3 · HPA 1" : "1A7 · HPA 2"}</text>
          </g>
        ))}
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="108" y="362" width="384" height="174" rx="2" />
        <text className={styles.bayTitle} x="116" y="366">LOW POWER RACK · 1A8</text>
        <CardFace x={116} width={54} label="LPA 1" />
        <CardFace x={172} width={42} label="RTC 1" />
        <CardFace x={216} width={42} label="MON 1" />
        <CardFace x={260} width={42} label="RMS" />
        <CardFace x={304} width={42} label="FAC" />
        <CardFace x={348} width={42} label="MON 2" />
        <CardFace x={392} width={42} label="RTC 2" />
        <CardFace x={436} width={54} label="LPA 2" />
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="108" y="548" width="384" height="154" rx="2" />
        <text className={styles.bayTitle} x="116" y="564">1500 W POWER SUPPLIES</text>
        {[130, 325].map((x, index) => (
          <g className={styles.powerModule} key={x}>
            <rect x={x} y="618" width="145" height="60" rx="3" />
            {[0, 1, 2, 3].map((row) => <path key={row} d={`M${x + 15} ${630 + row * 9}h86`} />)}
            <Handle x={x + 122} y={627} height={42} />
            <text x={x + 66} y="612">{index === 0 ? "1A24 · TX1" : "1A25 · TX2"}</text>
          </g>
        ))}
      </g>

      <g aria-hidden>
        <rect className={styles.blankBay} x="108" y="710" width="384" height="102" rx="2" />
        <text x="300" y="765">BATTERY / INSTALLATION SPACE</text>
      </g>

      <g className={styles.statusPanel} aria-hidden>
        <rect x="112" y="820" width="378" height="132" rx="2" />
        <text x="300" y="838">1A26 · STATUS / POWER PANEL</text>
        {[0, 1, 2, 3].map((column) => (
          <g key={column}>
            <rect x={134 + column * 34} y="858" width="22" height="54" rx="2" />
            <path d={`M${139 + column * 34} 878h12v17h-12z`} />
          </g>
        ))}
        <text x="196" y="924">DC1 · DC2 · DC3 · DC4</text>
        <rect x="288" y="856" width="66" height="64" rx="2" />
        <rect x="362" y="856" width="66" height="64" rx="2" />
        {[0, 1, 2, 3, 4].map((row) => (
          <g key={row}><Led x={298} y={867 + row * 10} on={row === 4} /><Led x={372} y={867 + row * 10} on={row === 4} /></g>
        ))}
        <rect x="448" y="858" width="24" height="48" rx="2" />
      </g>

      {[64, 148, 360, 536, 704, 814, 954].flatMap((y) => [<Screw key={`l-${y}`} x={104} y={y} />, <Screw key={`r-${y}`} x={496} y={y} />])}
      <text className={styles.cabinetCaption} x="300" y="986">FIGURE 1-3 · FRONT VIEW · DUAL HIGH POWER</text>
    </g>
  );
}

function RearCabinet() {
  return (
    <g>
      <rect className={styles.cabinetBackdrop} width="600" height="1000" />
      <rect className={styles.cabinetShadow} x="82" y="22" width="436" height="956" rx="6" />
      <rect className={styles.cabinetOuter} x="92" y="14" width="416" height="954" rx="4" />
      <rect className={styles.cabinetRail} x="103" y="40" width="394" height="910" />
      <rect className={styles.cabinetHeader} x="108" y="28" width="384" height="22" rx="2" />
      <text className={styles.cabinetBrand} x="300" y="43">MODEL 1119A · REAR EQUIPMENT ACCESS</text>

      <g className={styles.rfPanel} aria-hidden>
        <rect x="112" y="54" width="378" height="94" rx="2" />
        <text x="300" y="68">RF PANEL ASSEMBLY</text>
        <rect x="130" y="76" width="76" height="54" rx="3" />
        <path d="M143 103h50M168 82v42" />
        <text x="168" y="141">30 dB COUPLER</text>
        <rect x="254" y="73" width="92" height="62" rx="3" />
        <path d="M268 87h64l-32 34z" />
        <text x="300" y="127">1K1 RF SWITCH</text>
        <circle cx="411" cy="103" r="28" />
        <path d="M411 75v56M383 103h56" />
        <text x="411" y="141">CIRCULATOR</text>
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="112" y="156" width="378" height="154" rx="2" />
        <text className={styles.bayTitle} x="120" y="170">HIGH POWER RACK REAR · BACKPLANE / COOLING</text>
        <rect className={styles.controllerBoard} x="254" y="180" width="92" height="62" rx="2" />
        <text x="300" y="204">1A2A2</text><text x="300" y="218">FAN CONTROL</text>
        {[0, 1, 2, 3].map((column) => <rect key={column} x={128 + column * 75} y="260" width="55" height="27" rx="2" />)}
        <rect className={styles.loadModule} x="448" y="174" width="45" height="116" rx="3" />
        {[0, 1, 2, 3, 4].map((row) => <path key={row} d={`M457 ${188 + row * 18}h27`} />)}
        <text x="470" y="300">LOAD</text>
      </g>

      <g aria-hidden>
        <rect className={styles.rackBay} x="112" y="320" width="378" height="184" rx="2" />
        <text className={styles.bayTitle} x="120" y="336">LOW / HIGH POWER BACKPLANES</text>
        {[0, 1].map((column) => (
          <g key={column} className={styles.backplane}>
            <rect x={130 + column * 188} y="350" width="152" height="130" rx="2" />
            {[0, 1, 2, 3].map((row) => <rect key={row} x={142 + column * 188} y={364 + row * 25} width="128" height="12" rx="2" />)}
            <path d={`M${150 + column * 188} 474h110`} />
          </g>
        ))}
      </g>

      <g className={styles.interfaceAssembly} aria-hidden>
        <rect x="112" y="520" width="378" height="105" rx="2" />
        <text x="300" y="540">1A19 · INTERFACE CCA</text>
        {[0, 1, 2, 3, 4].map((column) => <rect key={column} x={132 + column * 67} y="554" width="52" height="18" rx="2" />)}
        <rect x="170" y="590" width="98" height="22" rx="2" />
        <rect x="332" y="584" width="108" height="30" rx="2" />
        <text x="219" y="605">DIGITAL / ANALOG I/O</text>
        <text x="386" y="603">RS232 · ETHERNET</text>
      </g>

      <g aria-hidden>
        {[112, 307].map((x, index) => (
          <g className={styles.bcpsAssembly} key={x}>
            <rect x={x} y="646" width={index === 0 ? 181 : 183} height="108" rx="2" />
            <text x={x + 91} y="665">{index === 0 ? "1A21 · BCPS 2" : "1A20 · BCPS 1"}</text>
            {[0, 1, 2, 3, 4].map((row) => <Led key={row} x={x + 24} y={682 + row * 12} on={row === 4} />)}
            {[0, 1, 2].map((column) => <rect key={column} x={x + 54 + column * 37} y="684" width="25" height="48" rx="2" />)}
          </g>
        ))}
      </g>

      <g className={styles.acMonitorAssembly} aria-hidden>
        <rect x="112" y="770" width="108" height="116" rx="2" />
        <text x="166" y="790">1A22</text><text x="166" y="804">AC MONITOR</text>
        {[0, 1, 2].map((row) => <rect key={row} x="126" y={824 + row * 18} width="80" height="10" rx="2" />)}
      </g>
      <g className={styles.rearPowerPanel} aria-hidden>
        <rect x="234" y="770" width="256" height="116" rx="2" />
        <text x="362" y="790">AC DISTRIBUTION · STATUS DISPLAY REAR</text>
        {[0, 1, 2, 3].map((column) => <rect key={column} x={250 + column * 57} y="816" width="42" height="48" rx="2" />)}
      </g>

      {[64, 148, 312, 510, 632, 760, 894, 954].flatMap((y) => [<Screw key={`l-${y}`} x={104} y={y} />, <Screw key={`r-${y}`} x={496} y={y} />])}
      <text className={styles.cabinetCaption} x="300" y="986">FIGURE 1-4 · REAR VIEW · VIEWED FROM CABINET REAR</text>
    </g>
  );
}

function SideCabinet() {
  return (
    <g>
      <rect className={styles.cabinetBackdrop} width="600" height="1000" />
      <rect className={styles.sideShadow} x="128" y="22" width="344" height="956" rx="6" />
      <rect className={styles.sideOuter} x="138" y="14" width="324" height="954" rx="4" />
      <rect className={styles.sideInterior} x="154" y="42" width="292" height="900" rx="2" />
      <text className={styles.sideOrientation} x="154" y="980">FRONT</text>
      <text className={styles.sideOrientation} x="446" y="980">REAR</text>

      <g className={styles.fanPlenum} aria-hidden>
        <rect x="176" y="70" width="250" height="115" rx="3" />
        <path d="M188 86h226v72H188z" />
        <circle cx="248" cy="122" r="34" />
        <circle cx="354" cy="122" r="34" />
        {[248, 354].map((x) => <path key={x} d={`M${x} 90v64M${x - 32} 122h64M${x - 23} 99l46 46M${x + 23} 99l-46 46`} />)}
        <text x="301" y="176">1A2A3 · CIRCULATING FANS / PLENUM</text>
      </g>

      <g aria-hidden>
        <rect className={styles.sideRack} x="176" y="202" width="250" height="255" rx="2" />
        <text x="301" y="220">HIGH / LOW POWER RACK SIDE PROFILE</text>
        {[0, 1, 2, 3, 4].map((row) => <path key={row} d={`M192 ${244 + row * 36}h214`} />)}
        {[0, 1, 2, 3, 4, 5].map((column) => <path key={column} d={`M${202 + column * 39} 232v198`} />)}
      </g>

      <g className={styles.lnaAssembly} aria-hidden>
        <rect x="260" y="300" width="118" height="112" rx="3" />
        <path d="M279 316h80v58h-80z" />
        <path d="M289 326h60v38h-60z" />
        <circle cx="319" cy="390" r="12" />
        <text x="319" y="293">PRESELECTOR FILTER</text>
        <text x="319" y="429">1A8A2 · LNA</text>
      </g>

      <g aria-hidden className={styles.sideCableRun}>
        <path d="M188 92C150 170 170 310 184 442S190 710 190 918" />
        <path d="M414 122C448 228 414 332 424 458S420 724 428 916" />
        <path d="M378 358C416 362 424 384 424 430" />
      </g>

      <g aria-hidden>
        <rect className={styles.sideRack} x="176" y="476" width="250" height="132" rx="2" />
        <text x="301" y="498">POWER SUPPLY SHELF</text>
        <rect x="194" y="514" width="98" height="70" rx="2" />
        <rect x="310" y="514" width="98" height="70" rx="2" />
        {[0, 1, 2, 3].map((row) => <path key={row} d={`M205 ${526 + row * 12}h76M321 ${526 + row * 12}h76`} />)}
      </g>
      <g aria-hidden>
        <rect className={styles.sideRack} x="176" y="626" width="250" height="270" rx="2" />
        <text x="301" y="648">BATTERY / LOWER CABINET SPACE</text>
        <path d="M196 676h210M196 720h210M196 764h210M196 808h210M196 852h210" />
      </g>

      <text className={styles.cabinetCaption} x="300" y="986">FIGURE 1-5 · SIDE VIEW · INTERNAL SERVICE ACCESS</text>
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
  const label = surface === "front" ? "Mặt trước cabinet DME 1119A" : surface === "rear" ? "Mặt sau cabinet DME 1119A" : "Mặt bên cabinet DME 1119A";

  return (
    <svg className={styles.cabinetDrawing} viewBox="0 0 600 1000" role="img" aria-label={label}>
      <defs>
        <linearGradient id="dme1119a-cabinet-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#69777b" /><stop offset="0.14" stopColor="#d4dcda" /><stop offset="0.5" stopColor="#a5b0b0" /><stop offset="0.86" stopColor="#e2e7e5" /><stop offset="1" stopColor="#637176" />
        </linearGradient>
        <linearGradient id="dme1119a-panel-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5e9e7" /><stop offset="0.48" stopColor="#aeb9b8" /><stop offset="1" stopColor="#77878b" />
        </linearGradient>
        <filter id="dme1119a-hotspot-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {surface === "front" ? <FrontCabinet /> : surface === "rear" ? <RearCabinet /> : <SideCabinet />}
      {hotspots.map((item) => <CabinetHotspot key={item.id} hotspot={item} selected={selectedHotspotIds.has(item.id)} onSelect={onSelect} />)}
    </svg>
  );
}
