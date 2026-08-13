import type { AdsbBlockId } from "./block-diagram-data";
import styles from "./adsb-block-diagram.module.css";

interface AdsbEquipmentVisualProps {
  blockId: AdsbBlockId;
}

function MetalScrew({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.visualScrew} transform={`translate(${x} ${y})`}>
      <circle r="6" />
      <path d="M-3.5 0h7" />
    </g>
  );
}

function CoaxConnector({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g className={styles.visualConnector} transform={`translate(${x} ${y})`}>
      {label ? <text y="-27">{label}</text> : null}
      <circle r="20" />
      <circle r="13" />
      <circle r="4" />
    </g>
  );
}

function SensorVisual() {
  const connectors = [
    { x: 88, number: "1", lines: ["POWER", "100-240V AC"], kind: "power" },
    { x: 178, number: "2", lines: ["GPS"], kind: "round" },
    { x: 270, number: "3", lines: ["ANTENNA"], kind: "coax" },
    { x: 362, number: "4", lines: ["LAN"], kind: "round" },
    { x: 452, number: "5", lines: ["24V DC"], kind: "power" },
  ] as const;

  return (
    <svg className={styles.equipmentVisual} viewBox="0 0 540 380" role="img" aria-label="Mặt đáy Quadrant Sensor với năm cổng theo Figure 4">
      <defs>
        <linearGradient id="adsb-sensor-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#9ba6a8" />
          <stop offset="0.18" stopColor="#e4e8e6" />
          <stop offset="0.52" stopColor="#aab4b5" />
          <stop offset="0.78" stopColor="#eef0ee" />
          <stop offset="1" stopColor="#929ea1" />
        </linearGradient>
      </defs>
      <path className={styles.visualShadow} d="M52 86h436l22 30v202H30V116z" />
      <path className={styles.visualMetal} fill="url(#adsb-sensor-metal)" d="M48 60h444l18 42v204H30V102z" />
      <path className={styles.visualLid} d="M48 60h444l18 42H30z" />
      <text className={styles.visualBrand} x="270" y="137">COMSOFT QUADRANT SENSOR</text>
      <text className={styles.visualSubLabel} x="270" y="158">OUTDOOR UNIT • CONNECTOR PANEL</text>
      {connectors.map((connector) => (
        <g key={connector.number} transform={`translate(${connector.x} 232)`}>
          <circle className={styles.visualNumberBadge} cx="0" cy="-58" r="13" />
          <text className={styles.visualNumber} y="-53">{connector.number}</text>
          <text className={styles.visualPortLabel} y="-30">
            {connector.lines.map((line, index) => <tspan key={line} x="0" dy={index === 0 ? 0 : 11}>{line}</tspan>)}
          </text>
          {connector.kind === "power" ? (
            <g className={styles.visualPowerPlug}>
              <circle r="23" /><circle r="15" /><circle cx="-5" cy="-4" r="2" /><circle cx="5" cy="-4" r="2" /><circle cy="6" r="2" />
            </g>
          ) : connector.kind === "round" ? (
            <g className={styles.visualRoundPlug}>
              <rect x="-24" y="-24" width="48" height="48" rx="8" /><circle r="17" /><circle r="5" />
            </g>
          ) : (
            <CoaxConnector x={0} y={0} />
          )}
        </g>
      ))}
      <MetalScrew x={48} y={86} /><MetalScrew x={492} y={86} /><MetalScrew x={48} y={286} /><MetalScrew x={492} y={286} />
      <text className={styles.visualFooter} x="270" y="350">Cổng 1 và 5 là hai lựa chọn nguồn thay thế nhau</text>
    </svg>
  );
}

function AntennaVisual() {
  return (
    <svg className={styles.equipmentVisual} viewBox="0 0 540 380" role="img" aria-label="Antenna 1090 MHz và gá lắp theo Figure 7">
      <defs><linearGradient id="adsb-radome" x1="0" x2="1"><stop stopColor="#dbe4e2" /><stop offset="0.5" stopColor="#fbfdfb" /><stop offset="1" stopColor="#aebcbd" /></linearGradient></defs>
      <path className={styles.visualShadow} d="M256 42h42v248h-42z" />
      <rect className={styles.antennaRadome} x="258" y="28" width="38" height="254" rx="18" fill="url(#adsb-radome)" />
      <rect className={styles.antennaCollar} x="249" y="259" width="56" height="31" rx="5" />
      <path className={styles.antennaBracket} d="M258 274H150v48h-20v-66h128M150 290h-37M150 308h-37" />
      <path className={styles.antennaClamp} d="M108 278q-22 0-22 20t22 20M108 286v24" />
      <CoaxConnector x={277} y={310} label="N-CONNECTOR" />
      <text className={styles.visualBrand} x="392" y="116">1090 MHz</text>
      <text className={styles.visualSubLabel} x="392" y="138">ADS-B ANTENNA</text>
      <path className={styles.calloutLine} d="M306 96h68" />
    </svg>
  );
}

function AmplifierVisual() {
  return (
    <svg className={styles.equipmentVisual} viewBox="0 0 540 380" role="img" aria-label="Antenna amplifier gắn trực tiếp vào N-connector theo Figure 10">
      <defs><linearGradient id="adsb-amp-metal" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9ddda" /><stop offset="0.48" stopColor="#9ca7a6" /><stop offset="1" stopColor="#d8dcda" /></linearGradient></defs>
      <path className={styles.visualShadow} d="M112 126h316v134H112z" />
      <rect className={styles.amplifierBody} x="112" y="108" width="316" height="134" rx="8" fill="url(#adsb-amp-metal)" />
      <path className={styles.coaxBarrel} d="M64 151h48v49H64M428 151h48v49h-48" />
      <path className={styles.coaxThread} d="M64 157h-22v37h22M476 157h22v37h-22M46 161v29M51 161v29M56 161v29M484 161v29M489 161v29M494 161v29" />
      {[142, 204, 336, 398].map((x) => <MetalScrew key={x} x={x} y={130} />)}
      {[142, 204, 336, 398].map((x) => <MetalScrew key={x} x={x} y={220} />)}
      <rect className={styles.visualPlate} x="196" y="164" width="148" height="44" rx="2" />
      <text className={styles.visualPlateTitle} x="270" y="180">PREAMPLIFIER</text>
      <text className={styles.visualPlateText} x="270" y="196">1090 MHz • OPTIONAL</text>
      <text className={styles.visualFooter} x="270" y="304">Lắp tại N-connector của antenna • Cáp tới Sensor ≤ 15 m</text>
    </svg>
  );
}

function LightningVisual() {
  return (
    <svg className={styles.equipmentVisual} viewBox="0 0 540 380" role="img" aria-label="Coaxial lightning protector với dây nối đất theo Figure 9 và Figure 12">
      <defs><linearGradient id="adsb-lightning-metal" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f0f1ed" /><stop offset="0.5" stopColor="#8d9693" /><stop offset="1" stopColor="#e7e9e5" /></linearGradient></defs>
      <path className={styles.visualShadow} d="M105 143h330v91H105z" />
      <path className={styles.surgeBody} fill="url(#adsb-lightning-metal)" d="M106 140h82l20-17h124l20 17h82v82h-82l-20 17H208l-20-17h-82z" />
      <path className={styles.coaxThread} d="M106 151H58v60h48M434 151h48v60h-48M64 151v60M72 151v60M80 151v60M460 151v60M468 151v60M476 151v60" />
      <rect className={styles.surgeLabel} x="210" y="139" width="120" height="68" rx="3" />
      <text className={styles.surgeLabelTitle} x="270" y="160">LIGHTNING</text>
      <text className={styles.surgeLabelTitle} x="270" y="179">PROTECTOR</text>
      <text className={styles.surgeLabelText} x="270" y="196">COAXIAL SURGE PROTECTION</text>
      <circle className={styles.groundLug} cx="270" cy="121" r="13" />
      <path className={styles.groundCable} d="M270 108C270 65 336 65 336 28" />
      <text className={styles.visualFooter} x="270" y="304">Dây vàng/xanh phải nối galvanic với mast / central ground</text>
    </svg>
  );
}

function GpsVisual() {
  return (
    <svg className={styles.equipmentVisual} viewBox="0 0 540 380" role="img" aria-label="GPS Receiver với holder và cáp theo Figure 11">
      <path className={styles.visualShadow} d="M148 128h244v140H148z" />
      <path className={styles.gpsBracket} d="M158 142h224v120H158zM182 142v-32h176v32M182 262v30M358 262v30" />
      <path className={styles.gpsDome} d="M205 142c3-84 127-84 130 0z" />
      <ellipse className={styles.gpsDomeTop} cx="270" cy="139" rx="66" ry="16" />
      <text className={styles.gpsLabel} x="270" y="119">GPS</text>
      <path className={styles.gpsCable} d="M270 164c-102 22-80 126 20 85 82-34 126 52 28 87" />
      <g transform="translate(318 337)"><circle className={styles.gpsPlug} r="22" /><circle className={styles.gpsPlugInner} r="14" />{[0,45,90,135,180,225,270,315].map((angle) => <circle key={angle} className={styles.gpsPin} cx={Math.cos(angle*Math.PI/180)*8} cy={Math.sin(angle*Math.PI/180)*8} r="1.8" />)}</g>
      <text className={styles.visualFooter} x="270" y="365">Tùy chọn cho Multilateration • Cáp GPS ≤ 5 m</text>
    </svg>
  );
}

function SiteEquipmentVisual({ blockId }: { blockId: "ac-source" | "dc-power-supply" | "lan-switch" }) {
  const content = {
    "ac-source": { eyebrow: "SITE INFRASTRUCTURE", title: "100-240 V AC", subtitle: "Điểm cấp nguồn tại shelter", ports: ["SITE OUTPUT"] },
    "dc-power-supply": { eyebrow: "OPTIONAL / CUSTOMER-SUPPLIED", title: "24 V DC POWER SUPPLY", subtitle: "Model và đầu vào không được manual chỉ định", ports: ["SITE INPUT", "24 VDC OUT"] },
    "lan-switch": { eyebrow: "CUSTOMER NETWORK", title: "LAN SWITCH / ROUTER", subtitle: "Model và port layout không được manual chỉ định", ports: ["ETHERNET"] },
  }[blockId];

  return (
    <svg className={styles.equipmentVisual} viewBox="0 0 540 380" role="img" aria-label={`${content.title}, thiết bị do hạ tầng trạm cung cấp`}>
      <path className={styles.visualShadow} d="M70 100h400v190H70z" />
      <rect className={styles.siteDeviceBody} x="70" y="82" width="400" height="190" rx="8" />
      <rect className={styles.siteDeviceHeader} x="70" y="82" width="400" height="54" rx="8" />
      <text className={styles.siteEyebrow} x="96" y="106">{content.eyebrow}</text>
      <text className={styles.siteTitle} x="96" y="126">{content.title}</text>
      <text className={styles.siteSubtitle} x="96" y="164">{content.subtitle}</text>
      <g transform="translate(96 194)">
        {content.ports.map((port, index) => (
          <g key={port} transform={`translate(${index * 92} 0)`}>
            <rect className={styles.sitePort} width="72" height="35" rx="3" />
            <text className={styles.sitePortLabel} x="36" y="22">{port}</text>
          </g>
        ))}
      </g>
      <text className={styles.visualFooter} x="270" y="330">Sơ đồ chức năng — manual không chỉ định hãng/model cho thiết bị này</text>
    </svg>
  );
}

export function AdsbEquipmentVisual({ blockId }: AdsbEquipmentVisualProps) {
  if (blockId === "quadrant-sensor") return <SensorVisual />;
  if (blockId === "antenna") return <AntennaVisual />;
  if (blockId === "antenna-amplifier") return <AmplifierVisual />;
  if (blockId === "lightning-protector") return <LightningVisual />;
  if (blockId === "gps-receiver") return <GpsVisual />;
  return <SiteEquipmentVisual blockId={blockId} />;
}
