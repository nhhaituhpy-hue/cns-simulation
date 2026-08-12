import styles from "./dvor-1150-module-faceplates.module.css";

function FaceplateDefs() {
  return (
    <defs>
      <linearGradient id="dvor1150-face-metal" x1="0" x2="1">
        <stop offset="0" stopColor="#8d999b" />
        <stop offset="0.1" stopColor="#f0f2f1" />
        <stop offset="0.48" stopColor="#bcc4c4" />
        <stop offset="0.84" stopColor="#e9eceb" />
        <stop offset="1" stopColor="#7b898c" />
      </linearGradient>
      <pattern id="dvor1150-face-brush" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 1h5M0 4h5" stroke="#fff" strokeOpacity=".18" strokeWidth=".8" />
      </pattern>
      <radialGradient id="dvor1150-testpoint" cx="35%" cy="28%">
        <stop offset="0" stopColor="#f8faf9" />
        <stop offset="0.3" stopColor="#9aa4a5" />
        <stop offset="0.66" stopColor="#303a3d" />
        <stop offset="1" stopColor="#0e1517" />
      </radialGradient>
      <radialGradient id="dvor1150-connector" cx="35%" cy="28%">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.3" stopColor="#cbd0cf" />
        <stop offset="0.66" stopColor="#5c686b" />
        <stop offset="1" stopColor="#202a2d" />
      </radialGradient>
      <filter id="dvor1150-face-shadow" x="-20%" y="-10%" width="140%" height="125%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#061116" floodOpacity=".38" />
      </filter>
    </defs>
  );
}

function Screw({ x, y, angle = 0 }: { x: number; y: number; angle?: number }) {
  return (
    <g className={styles.screw} transform={`rotate(${angle} ${x} ${y})`}>
      <circle cx={x} cy={y} r="13" />
      <path d={`M${x - 8} ${y}h16M${x} ${y - 8}v16`} />
    </g>
  );
}

function TestPoint({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.testPoint}>
      <circle cx={x} cy={y} r="14" />
      <circle cx={x} cy={y} r="7" />
    </g>
  );
}

function PanelFrame({ width, height = 1660 }: { width: number; height?: number }) {
  return (
    <g>
      <rect className={styles.panelShadow} x="22" y="18" width={width - 44} height={height - 36} rx="5" />
      <rect className={styles.panelFrame} x="16" y="10" width={width - 32} height={height - 30} rx="5" />
      <rect className={styles.panelBrush} x="24" y="18" width={width - 48} height={height - 46} rx="2" />
      <Screw x={46} y={44} angle={18} />
      <Screw x={width - 46} y={44} angle={-12} />
      <Screw x={46} y={height - 48} angle={-20} />
      <Screw x={width - 46} y={height - 48} angle={9} />
    </g>
  );
}

function ExtractionHandle({ x, top = 1090, height = 350 }: { x: number; top?: number; height?: number }) {
  return (
    <g className={styles.handle}>
      <circle cx={x} cy={top} r="18" />
      <circle cx={x} cy={top + height} r="18" />
      <rect x={x - 10} y={top} width="20" height={height} rx="10" />
      <path d={`M${x} ${top + 18}v${height - 36}`} />
    </g>
  );
}

function SynthesizerFaceplate() {
  const points = [
    { id: "TP1", y: 306 },
    { id: "TP2", y: 372 },
    { id: "TP3", y: 438 },
    { id: "TP4", y: 592 },
    { id: "TP5", y: 658 },
    { id: "GND", y: 750 },
  ] as const;

  return (
    <svg className={`${styles.faceplate} ${styles.synthesizer}`} viewBox="0 0 430 1660" role="img" aria-labelledby="dvor1150-synth-title">
      <title id="dvor1150-synth-title">Synthesizer front panel DVOR 1150 theo Figure 3-40</title>
      <FaceplateDefs />
      <PanelFrame width={430} />
      <text className={styles.moduleTitle} x="215" y="92">1A4 / A20</text>
      <Screw x={130} y={134} angle={16} />
      <Screw x={300} y={134} angle={-18} />
      <Screw x={215} y={218} angle={12} />
      <Screw x={72} y={252} angle={-8} />
      <Screw x={358} y={252} angle={18} />

      {points.map((point) => (
        <g key={point.id}>
          <text className={styles.controlId} x="192" y={point.y + 7} textAnchor="end">{point.id}</text>
          <TestPoint x={238} y={point.y} />
        </g>
      ))}

      <text className={styles.controlId} x="164" y="878" textAnchor="end">J8</text>
      <g className={styles.coaxConnector}>
        <circle cx="238" cy="862" r="39" />
        <circle cx="238" cy="862" r="26" />
        <circle cx="238" cy="862" r="7" />
      </g>
      <text className={styles.groupLabel} x="215" y="932">CARRIER FREQ.</text>
      <text className={styles.groupLabel} x="215" y="964">10 mW (TYP.)</text>

      <ExtractionHandle x={238} top={1090} height={350} />
      <text className={styles.controlId} x="104" y="1378">R81</text>
      <circle className={styles.trimPot} cx="122" cy="1316" r="20" />
      <path className={styles.trimSlot} d="M108 1302l28 28" />
      <circle className={styles.bottomFastener} cx="215" cy="1540" r="30" />
      <path className={styles.bottomSlot} d="M194 1519l42 42" />
      <text className={styles.partNumber} x="215" y="1615">1150-610 · FIGURE 3-40</text>
    </svg>
  );
}

function SidebandFaceplate() {
  const firstGroup = [
    { id: "TP1", y: 210 },
    { id: "TP2", y: 250 },
    { id: "TP3", y: 290 },
    { id: "TP4", y: 330 },
    { id: "A1R100", y: 376, trim: true },
    { id: "A1R18", y: 420, trim: true },
    { id: "TP5", y: 464 },
  ] as const;
  const secondGroup = [
    { id: "TP6", y: 790 },
    { id: "GND", y: 834 },
    { id: "A3R18", y: 878, trim: true },
    { id: "A3R100", y: 922, trim: true },
    { id: "TP7", y: 966 },
    { id: "TP8", y: 1010 },
    { id: "TP9", y: 1054 },
    { id: "TP10", y: 1098 },
  ] as const;

  return (
    <svg className={`${styles.faceplate} ${styles.sideband}`} viewBox="0 0 360 1660" role="img" aria-labelledby="dvor1150-sideband-title">
      <title id="dvor1150-sideband-title">Sideband Generator front panel DVOR 1150 theo Figure 3-41</title>
      <FaceplateDefs />
      <PanelFrame width={360} />
      <text className={styles.moduleTitleSmall} x="180" y="94">SIDEBAND GENERATOR</text>
      <rect className={styles.heatSink} x="62" y="120" width="236" height="520" rx="4" />
      {Array.from({ length: 15 }, (_, index) => <path key={index} className={styles.heatSinkFin} d={`M${72 + index * 15} 126v508`} />)}
      <rect className={styles.heatSink} x="62" y="690" width="236" height="500" rx="4" />
      {Array.from({ length: 15 }, (_, index) => <path key={index} className={styles.heatSinkFin} d={`M${72 + index * 15} 696v488`} />)}

      {[...firstGroup, ...secondGroup].map((point) => (
        <g key={point.id}>
          <text className={styles.sidebandId} x="138" y={point.y + 6} textAnchor="end">{point.id}</text>
          {"trim" in point ? (
            <g>
              <circle className={styles.trimPot} cx="164" cy={point.y} r="13" />
              <path className={styles.trimSlot} d={`M${154} ${point.y - 10}l20 20`} />
            </g>
          ) : <TestPoint x={164} y={point.y} />}
        </g>
      ))}

      <g className={styles.powerTransistor}>
        <path d="M116 538l64-34 64 34v70l-64 34-64-34z" />
        <circle cx="180" cy="573" r="30" />
        <text x="180" y="580">Q101</text>
      </g>
      <g className={styles.powerTransistor}>
        <path d="M116 1204l64-34 64 34v70l-64 34-64-34z" />
        <circle cx="180" cy="1239" r="30" />
        <text x="180" y="1246">Q201</text>
      </g>

      <ExtractionHandle x={180} top={1340} height={180} />
      <circle className={styles.bottomFastener} cx="180" cy="1580" r="24" />
      <path className={styles.bottomSlot} d="M164 1564l32 32" />
      <text className={styles.partNumber} x="180" y="1625">1150-611 · FIGURE 3-41</text>
    </svg>
  );
}

function StatusDisplayFaceplate() {
  const indicators = [
    { x: 150, label: "NORM", color: "green" },
    { x: 245, label: "ALARM", color: "red" },
    { x: 340, label: "BYPASS", color: "amber" },
  ] as const;

  return (
    <svg className={`${styles.faceplate} ${styles.statusPanel}`} viewBox="0 0 760 310" role="img" aria-labelledby="dvor1150-status-title">
      <title id="dvor1150-status-title">Status Display Panel DVOR 1150 theo Figure 1-4 và Table 3-6</title>
      <FaceplateDefs />
      <rect className={styles.statusFrame} x="14" y="14" width="732" height="282" rx="7" />
      <rect className={styles.statusPlate} x="28" y="28" width="704" height="254" rx="4" />
      <text className={styles.statusBrand} x="380" y="62">MODEL 1150 VOR · STATUS DISPLAY</text>
      {[1, 2].map((system, index) => (
        <g key={system} transform={`translate(${index * 360} 0)`}>
          <text className={styles.statusSystem} x="205" y="103">SYSTEM {system === 1 ? "A" : "B"}</text>
          {indicators.map((indicator) => (
            <g key={indicator.label}>
              <circle className={styles.statusLampBezel} cx={indicator.x} cy="170" r="24" />
              <circle className={styles.statusLamp} data-color={indicator.color} cx={indicator.x} cy="170" r="14" />
              <text className={styles.statusLabel} x={indicator.x} y="216">{indicator.label}</text>
            </g>
          ))}
        </g>
      ))}
      <Screw x={46} y={46} />
      <Screw x={714} y={46} />
      <Screw x={46} y={264} />
      <Screw x={714} y={264} />
    </svg>
  );
}

export function Dvor1150ModuleFaceplate({
  blockId,
}: {
  blockId: "frequency-synthesizer" | "sideband-generator" | "status-display";
}) {
  if (blockId === "frequency-synthesizer") return <SynthesizerFaceplate />;
  if (blockId === "sideband-generator") return <SidebandFaceplate />;
  return <StatusDisplayFaceplate />;
}
