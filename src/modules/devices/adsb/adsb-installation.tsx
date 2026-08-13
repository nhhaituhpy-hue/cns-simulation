import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ADSB_BLOCKS,
  type AdsbBlockId,
  type AdsbInstallationHotspot,
} from "./block-diagram-data";
import styles from "./adsb-block-diagram.module.css";

interface AdsbInstallationProps {
  selectedHotspotIds: ReadonlySet<string>;
  onSelect: (blockId: AdsbBlockId, hotspot: AdsbInstallationHotspot) => void;
}

const selectableHotspots = ADSB_BLOCKS.flatMap((block) =>
  block.installationHotspots.map((hotspot) => ({ blockId: block.id, hotspot })),
);

function InstallationHotspot({
  blockId,
  hotspot,
  selected,
  onSelect,
}: {
  blockId: AdsbBlockId;
  hotspot: AdsbInstallationHotspot;
  selected: boolean;
  onSelect: AdsbInstallationProps["onSelect"];
}) {
  const activate = () => onSelect(blockId, hotspot);

  return (
    <g
      className={styles.installationHotspot}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Chọn ${hotspot.label} trên mô hình lắp đặt`}
      onClick={activate}
      onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <rect
        className={styles.installationHitTarget}
        x={hotspot.x}
        y={hotspot.y}
        width={hotspot.width}
        height={hotspot.height}
        rx="7"
      />
      <rect
        className={styles.installationSelectionRing}
        x={hotspot.x + 4}
        y={hotspot.y + 4}
        width={hotspot.width - 8}
        height={hotspot.height - 8}
        rx="5"
      />
    </g>
  );
}

export function AdsbInstallation({ selectedHotspotIds, onSelect }: AdsbInstallationProps) {
  return (
    <div className={styles.installationViewport}>
      <svg
        className={styles.installationSvg}
        viewBox="0 0 600 820"
        role="group"
        aria-labelledby="adsb-installation-title adsb-installation-description"
      >
        <title id="adsb-installation-title">Mô hình lắp đặt Quadrant ADS-B Sensor ngoài trời</title>
        <desc id="adsb-installation-description">
          Antenna, antenna amplifier, GPS Receiver, Quadrant Sensor và lightning protector lắp trên mast; nguồn và switch đặt trong shelter.
        </desc>
        <defs>
          <linearGradient id="adsb-install-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a2638" />
            <stop offset="0.65" stopColor="#25576d" />
            <stop offset="1" stopColor="#718d91" />
          </linearGradient>
          <linearGradient id="adsb-mast-metal" x1="0" x2="1">
            <stop offset="0" stopColor="#657476" />
            <stop offset="0.34" stopColor="#e4e9e6" />
            <stop offset="0.64" stopColor="#8d9999" />
            <stop offset="1" stopColor="#d7dedb" />
          </linearGradient>
          <linearGradient id="adsb-install-radome" x1="0" x2="1">
            <stop offset="0" stopColor="#bcc8c7" />
            <stop offset="0.5" stopColor="#f5f8f5" />
            <stop offset="1" stopColor="#a5b3b4" />
          </linearGradient>
          <linearGradient id="adsb-install-metal" x1="0" x2="1">
            <stop offset="0" stopColor="#7e8b8c" />
            <stop offset="0.25" stopColor="#dce2df" />
            <stop offset="0.58" stopColor="#98a4a5" />
            <stop offset="0.82" stopColor="#e1e6e3" />
            <stop offset="1" stopColor="#737f81" />
          </linearGradient>
          <filter id="adsb-selection-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect className={styles.installationSky} width="600" height="820" />
        <path className={styles.installationGround} d="M0 660h600v160H0z" />
        <path className={styles.installationHorizon} d="M0 660h600" />

        <rect className={styles.mast} x="321" y="108" width="34" height="612" rx="14" />
        <path className={styles.mastBrace} d="M338 258H241v48M338 412H202v50M338 584H285v52" />
        <rect className={styles.mastClamp} x="308" y="213" width="61" height="13" rx="5" />
        <rect className={styles.mastClamp} x="308" y="276" width="61" height="13" rx="5" />
        <rect className={styles.mastClamp} x="308" y="398" width="61" height="13" rx="5" />
        <rect className={styles.mastClamp} x="308" y="568" width="61" height="13" rx="5" />

        <rect className={styles.antennaBody} x="307" y="36" width="43" height="182" rx="20" />
        <rect className={styles.mastClamp} x="298" y="202" width="61" height="24" rx="5" />
        <rect className={styles.amplifierBodyInstall} x="286" y="225" width="78" height="42" rx="3" />
        <circle className={styles.sensorConnector} cx="325" cy="218" r="7" />
        <circle className={styles.sensorConnector} cx="325" cy="274" r="7" />

        <path className={styles.gpsBracketInstall} d="M171 323h92v24h-92zM180 347v20M254 347v20" />
        <path className={styles.gpsDomeInstall} d="M182 323c2-51 69-51 71 0z" />
        <text className={styles.installationDeviceLabel} x="92" y="329">GPS RECEIVER</text>
        <path className={styles.installationCable} data-category="timing" d="M217 347V477H294V590" />
        <text className={styles.installationCableLabel} x="220" y="414">GPS ≤ 5 m</text>

        <path className={styles.sensorShield} d="M226 386h216l18 22v171H208V408z" />
        <path className={styles.sensorRoof} d="M226 386h216l18 22H208z" />
        {[430, 453, 476, 499, 522, 545].map((y) => (
          <g key={y}>
            <path className={styles.sensorVent} d={`M238 ${y}h51`} />
            <path className={styles.sensorVent} d={`M378 ${y}h51`} />
          </g>
        ))}
        <text className={styles.sensorBrand} x="334" y="566">COMSOFT</text>
        <text className={styles.installationDeviceLabel} x="472" y="467">QUADRANT</text>
        <text className={styles.installationDeviceLabel} x="472" y="480">ADS-B SENSOR</text>
        {[255, 294, 334, 374, 414].map((x) => <circle key={x} className={styles.sensorConnector} cx={x} cy="590" r="8" />)}

        <rect className={styles.surgeProtectorInstall} x="316" y="599" width="42" height="54" rx="3" />
        <rect className={styles.surgeLabelInstall} x="322" y="613" width="30" height="22" rx="2" />
        <path className={styles.installationCable} data-category="rf" d="M325 274V599" />
        <path className={styles.installationCable} data-category="rf" d="M337 599V590H334" />
        <text className={styles.installationCableLabel} x="352" y="337">RF / HF ≤ 15 m</text>
        <path className={styles.installationCable} data-category="ground" d="M337 653H355V568" />
        <circle cx="355" cy="568" r="6" fill="#c8d733" stroke="#253336" strokeWidth="2" />
        <text className={styles.installationCableLabel} x="394" y="667">MAST BOND</text>

        <path className={styles.shelterRoof} d="M6 695l15-18h566l13 18z" />
        <rect className={styles.shelter} x="6" y="695" width="588" height="117" />
        <text className={styles.shelterLabel} x="300" y="710">SHELTER / SITE INFRASTRUCTURE</text>
        <rect className={styles.shelterDevice} x="27" y="731" width="108" height="44" rx="4" />
        <text className={styles.shelterLabel} x="81" y="751">100–240 V AC</text>
        <text className={styles.shelterLabel} x="81" y="764">SOURCE</text>
        <rect className={styles.shelterDeviceOptional} x="163" y="731" width="113" height="44" rx="4" />
        <text className={styles.shelterLabel} x="219" y="751">24 VDC PSU</text>
        <text className={styles.shelterLabel} x="219" y="764">OPTIONAL</text>
        <rect className={styles.shelterDevice} x="448" y="731" width="121" height="44" rx="4" />
        <text className={styles.shelterLabel} x="508" y="751">LAN SWITCH</text>
        <text className={styles.shelterLabel} x="508" y="764">/ ROUTER</text>

        <path className={styles.installationCable} data-category="power" d="M82 731V687H255V598" />
        <path className={styles.installationCable} data-category="power" d="M135 753H163M219 731V673H414V598" />
        <text className={styles.installationCableLabel} x="151" y="680">POWER ≤ 100 m</text>
        <path className={styles.installationCable} data-category="data" d="M508 731V642H374V598" />
        <text className={styles.installationCableLabel} x="466" y="634">LAN ≤ 100 m</text>

        {selectableHotspots.map(({ blockId, hotspot }) => (
          <InstallationHotspot
            key={hotspot.id}
            blockId={blockId}
            hotspot={hotspot}
            selected={selectedHotspotIds.has(hotspot.id)}
            onSelect={onSelect}
          />
        ))}
      </svg>
    </div>
  );
}
