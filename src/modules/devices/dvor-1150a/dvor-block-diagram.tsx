"use client";

import Image from "next/image";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DVOR_BLOCKS,
  DVOR_BLOCK_BY_ID,
  type CabinetFace,
  type DvorBlockId,
  type DvorHotspot,
  type DvorWaveformReference,
} from "./block-diagram-data";
import { DvorModuleFaceplate, hasRebuiltModuleFaceplate } from "./dvor-module-faceplates";
import styles from "./dvor-block-diagram.module.css";

const cabinetImages: Record<CabinetFace, { src: string; alt: string; label: string; horizontalScale?: number }> = {
  front: {
    src: "/equipment/dvor-1150a/overview/front-cabinet-ai-v2.png",
    alt: "Vị trí các cụm lắp ráp ở mặt trước cabinet DVOR 1150A",
    label: "Mặt trước",
  },
  rear: {
    src: "/equipment/dvor-1150a/overview/rear-cabinet-ai-v2.png",
    alt: "Vị trí các rack và cụm lắp ráp ở mặt sau cabinet DVOR 1150A",
    label: "Mặt sau",
    // Normalize the rear cabinet's 486 px body to the front cabinet's 542 px body.
    // The image and hotspots share this layer, so their alignment stays deterministic.
    horizontalScale: 542 / 486,
  },
};

function HotspotButton({
  hotspot,
  selected,
  onSelect,
}: {
  hotspot: DvorHotspot;
  selected: boolean;
  onSelect: (hotspot: DvorHotspot) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Chọn ${hotspot.label}`}
      title={hotspot.label}
      onClick={() => onSelect(hotspot)}
      className={`${styles.hotspot} ${selected ? styles.hotspotSelected : ""}`}
      style={{
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        width: `${hotspot.width}%`,
        height: `${hotspot.height}%`,
      }}
    >
      <span>{hotspot.label}</span>
    </button>
  );
}

function EquipmentCanvas({
  image,
  hotspots,
  selectedHotspotIds,
  onSelect,
  interactive = true,
  landscape = false,
  interactiveBlockIds,
}: {
  image: { src: string; alt: string; horizontalScale?: number };
  hotspots: readonly { blockId: DvorBlockId; hotspot: DvorHotspot }[];
  selectedHotspotIds: ReadonlySet<string>;
  onSelect: (blockId: DvorBlockId, hotspot: DvorHotspot) => void;
  interactive?: boolean;
  landscape?: boolean;
  interactiveBlockIds?: ReadonlySet<DvorBlockId>;
}) {
  return (
    <div className={`${styles.canvas} ${landscape ? styles.canvasLandscape : ""}`}>
      <div
        className={styles.canvasContent}
        style={{ transform: `scaleX(${image.horizontalScale ?? 1})` }}
      >
        <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className={styles.drawing} priority />
        {hotspots.map(({ blockId, hotspot }) => interactive && (!interactiveBlockIds || interactiveBlockIds.has(blockId)) ? (
            <HotspotButton key={hotspot.id} hotspot={hotspot} selected={selectedHotspotIds.has(hotspot.id)} onSelect={(selectedHotspot) => onSelect(blockId, selectedHotspot)} />
          ) : selectedHotspotIds.has(hotspot.id) ? (
            <div
              key={hotspot.id}
              aria-hidden
              className={`${styles.hotspot} ${styles.hotspotSelected} ${styles.cabinetHighlight}`}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }}
            ><span>{hotspot.label}</span></div>
          ) : null)}
      </div>
    </div>
  );
}

type SchematicSelection = { blockId: DvorBlockId; hotspot: DvorHotspot };

function DvorTransmitterSchematic({
  selectedHotspotId,
  onSelect,
}: {
  selectedHotspotId: string | null;
  onSelect: (blockId: DvorBlockId, hotspot: DvorHotspot) => void;
}) {
  function diagramHotspot(blockId: DvorBlockId, hotspotId: string) {
    const block = DVOR_BLOCK_BY_ID.get(blockId)!;
    return block.diagramHotspots.find((item) => item.id === hotspotId)!;
  }

  const blocks: readonly (SchematicSelection & { className: string; label: string })[] = [
    { blockId: "synthesizer", hotspot: diagramHotspot("synthesizer", "diagram-synth-1"), className: styles.synth1, label: "SYNTH 1" },
    { blockId: "carrier-amplifier", hotspot: diagramHotspot("carrier-amplifier", "diagram-carrier-1"), className: styles.carrier1, label: "CARRIER AMP 1" },
    { blockId: "audio-generator", hotspot: diagramHotspot("audio-generator", "diagram-audio-1"), className: styles.audio1, label: "AUDIO GENERATOR 1" },
    { blockId: "synthesizer", hotspot: diagramHotspot("synthesizer", "diagram-synth-2"), className: styles.synth2, label: "SYNTH 2" },
    { blockId: "carrier-amplifier", hotspot: diagramHotspot("carrier-amplifier", "diagram-carrier-2"), className: styles.carrier2, label: "CARRIER AMP 2" },
    { blockId: "audio-generator", hotspot: diagramHotspot("audio-generator", "diagram-audio-2"), className: styles.audio2, label: "AUDIO GENERATOR 2" },
    { blockId: "sideband", hotspot: diagramHotspot("sideband", "diagram-sideband-12"), className: styles.sideband12, label: "SIDEBAND 1 / 2" },
    { blockId: "sideband", hotspot: diagramHotspot("sideband", "diagram-sideband-34"), className: styles.sideband34, label: "SIDEBAND 3 / 4" },
    { blockId: "sideband", hotspot: diagramHotspot("sideband", "diagram-sideband-12-tx2"), className: styles.sideband12Tx2, label: "SIDEBAND 1 / 2" },
    { blockId: "sideband", hotspot: diagramHotspot("sideband", "diagram-sideband-34-tx2"), className: styles.sideband34Tx2, label: "SIDEBAND 3 / 4" },
    { blockId: "rf-monitor", hotspot: diagramHotspot("rf-monitor", "diagram-rf-monitor"), className: styles.rfMonitor, label: "RF MONITOR" },
  ];

  return (
    <div className={styles.schematic} aria-label="Sơ đồ khối máy phát DVOR 1150A theo Figure 2-3">
      <svg className={styles.schematicLines} viewBox="0 0 1000 900" preserveAspectRatio="none" aria-hidden>
        <defs>
          <marker id="dvor-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" /></marker>
        </defs>
        <g className={styles.rfLines}>
          <path d="M195 720H275 M405 720H470 M530 720H600 M730 720H805" />
          <path d="M340 670V610H285V525 M665 670V610H720V525" />
          <path d="M285 425H450 M550 425H720 M285 525H450 M550 525H720" />
          <path d="M505 650V590 M500 585V545 M500 505V465 M500 405V365" />
          <path d="M310 355H450 M550 355H690" />
          <path d="M310 255H450 M550 255H690" />
          <path d="M245 255H175V165H350 M755 255H825V165H650" />
          <path d="M350 165V105H505V145 M650 165V105H505" />
          <path d="M505 105H795V90 H890V55" />
        </g>
        <g className={styles.controlLines}>
          <path d="M340 810V770 M665 810V770" />
          <path d="M340 810H500V755 M665 810H500" />
          <path d="M170 475H245 M755 475H835" />
          <path d="M170 310H245 M755 310H835" />
          <path d="M175 165H80V80H350" />
        </g>
        <g className={styles.sampleLines}>
          <path d="M405 700H440V475H450 M600 700H565V475H550" />
          <path d="M245 310H210V625H115 M755 310H790V625H115" />
        </g>
      </svg>

      <button type="button" aria-pressed={selectedHotspotId === "diagram-commutator"} onClick={() => onSelect("commutator-controller", diagramHotspot("commutator-controller", "diagram-commutator"))} className={`${styles.schematicBlock} ${styles.commutator}`}>COMMUTATOR<br />CONTROLLER</button>
      {[{ name: "BANK 4", className: styles.bank4 }, { name: "BANK 3", className: styles.bank3 }, { name: "BANK 2", className: styles.bank2 }, { name: "BANK 1", className: styles.bank1 }].map((bank) => <button key={bank.name} type="button" aria-pressed={selectedHotspotId === "diagram-antenna-bank"} onClick={() => onSelect("antenna-bank", diagramHotspot("antenna-bank", "diagram-antenna-bank"))} className={`${styles.schematicBlock} ${bank.className}`}>{bank.name}</button>)}
      <div className={styles.antennaSymbol}><span />CARRIER ANTENNA</div>
      {[styles.switchTop, styles.switchUpper, styles.switchLower, styles.switchBottom, styles.switchCarrier].map((className) => <button type="button" aria-label="RF Switch" aria-pressed={selectedHotspotId === "diagram-rf-switch"} onClick={() => onSelect("rf-switch", diagramHotspot("rf-switch", "diagram-rf-switch"))} key={className} className={`${styles.rfSwitch} ${className}`}>RF<br />SWITCH</button>)}

      {blocks.map((block) => (
        <button
          key={block.hotspot.id}
          type="button"
          aria-pressed={selectedHotspotId === block.hotspot.id}
          onClick={() => onSelect(block.blockId, block.hotspot)}
          className={`${styles.schematicBlock} ${block.className}`}
        >
          {block.label}
        </button>
      ))}
    </div>
  );
}

type ReferenceDiagramId = "control-monitoring" | "transmitter";

interface ReferenceDiagramOverlay {
  blockId: DvorBlockId;
  hotspotId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const referenceDiagrams: Record<ReferenceDiagramId, {
  label: string;
  src: string;
  width: number;
  height: number;
  overlays: readonly ReferenceDiagramOverlay[];
}> = {
  "control-monitoring": {
    label: "Control & Monitoring",
    src: "/equipment/dvor-1150a/diagrams/figure-2-2-control-monitoring.png",
    width: 885,
    height: 980,
    overlays: [
      { blockId: "monitor-cca", hotspotId: "diagram-monitor-1", label: "Monitor 1", x: 162, y: 116, width: 133, height: 86 },
      { blockId: "monitor-cca", hotspotId: "diagram-monitor-2", label: "Monitor 2", x: 635, y: 116, width: 133, height: 86 },
      { blockId: "rms", hotspotId: "diagram-rms", label: "RMS", x: 363, y: 377, width: 133, height: 98 },
      { blockId: "lcu", hotspotId: "diagram-lcu", label: "Local Control Unit", x: 597, y: 377, width: 133, height: 98 },
      { blockId: "interface-cca", hotspotId: "diagram-interface-cca", label: "Interface Circuit Card", x: 327, y: 577, width: 133, height: 74 },
      { blockId: "bcps", hotspotId: "diagram-bcps-1", label: "BCPS 1", x: 494, y: 662, width: 133, height: 68 },
      { blockId: "lvps", hotspotId: "diagram-lvps-1", label: "LVPS 1", x: 649, y: 662, width: 79, height: 68 },
      { blockId: "bcps", hotspotId: "diagram-bcps-2", label: "BCPS 2", x: 494, y: 810, width: 133, height: 74 },
      { blockId: "lvps", hotspotId: "diagram-lvps-2", label: "LVPS 2", x: 649, y: 810, width: 79, height: 74 },
    ],
  },
  transmitter: {
    label: "Transmitter",
    src: "/equipment/dvor-1150a/diagrams/figure-2-3-transmitter.png",
    width: 955,
    height: 1290,
    overlays: [
      { blockId: "commutator-controller", hotspotId: "diagram-commutator", label: "Commutator Controller", x: 218, y: 89, width: 139, height: 100 },
      { blockId: "antenna-bank", hotspotId: "diagram-antenna-bank", label: "Antenna Banks 1 to 4", x: 616, y: 92, width: 96, height: 228 },
      { blockId: "rf-switch", hotspotId: "diagram-rf-switch", label: "RF Switch Network", x: 444, y: 325, width: 78, height: 669 },
      { blockId: "sideband", hotspotId: "diagram-sideband-34", label: "Sideband 3 and 4, transmitter 1", x: 200, y: 374, width: 96, height: 100 },
      { blockId: "sideband", hotspotId: "diagram-sideband-34-tx2", label: "Sideband 3 and 4, transmitter 2", x: 690, y: 374, width: 96, height: 100 },
      { blockId: "rf-monitor", hotspotId: "diagram-rf-monitor", label: "RF Monitor", x: 84, y: 466, width: 88, height: 204 },
      { blockId: "sideband", hotspotId: "diagram-sideband-12", label: "Sideband 1 and 2, transmitter 1", x: 200, y: 619, width: 96, height: 100 },
      { blockId: "sideband", hotspotId: "diagram-sideband-12-tx2", label: "Sideband 1 and 2, transmitter 2", x: 690, y: 619, width: 96, height: 100 },
      { blockId: "synthesizer", hotspotId: "diagram-synth-1", label: "Synthesizer 1", x: 41, y: 907, width: 101, height: 100 },
      { blockId: "carrier-amplifier", hotspotId: "diagram-carrier-1", label: "Carrier Amplifier 1", x: 194, y: 907, width: 95, height: 100 },
      { blockId: "carrier-amplifier", hotspotId: "diagram-carrier-2", label: "Carrier Amplifier 2", x: 641, y: 907, width: 101, height: 100 },
      { blockId: "synthesizer", hotspotId: "diagram-synth-2", label: "Synthesizer 2", x: 818, y: 907, width: 102, height: 100 },
      { blockId: "audio-generator", hotspotId: "diagram-audio-1", label: "Audio Generator 1", x: 133, y: 1083, width: 137, height: 100 },
      { blockId: "audio-generator", hotspotId: "diagram-audio-2", label: "Audio Generator 2", x: 703, y: 1083, width: 137, height: 100 },
    ],
  },
};

function DvorReferenceDiagrams({
  selectedHotspotId,
  onSelect,
}: {
  selectedHotspotId: string | null;
  onSelect: (blockId: DvorBlockId, hotspot: DvorHotspot) => void;
}) {
  const [diagramId, setDiagramId] = useState<ReferenceDiagramId>("transmitter");
  const diagram = referenceDiagrams[diagramId];

  function resolveHotspot(overlay: ReferenceDiagramOverlay) {
    const block = DVOR_BLOCK_BY_ID.get(overlay.blockId)!;
    return block.diagramHotspots.find((hotspot) => hotspot.id === overlay.hotspotId)!;
  }

  return (
    <div className={styles.referenceDiagramShell}>
      <div className={styles.diagramTabs} role="tablist" aria-label="Chọn sơ đồ khối DVOR">
        {(Object.keys(referenceDiagrams) as ReferenceDiagramId[]).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={diagramId === id} onClick={() => setDiagramId(id)}>
            {referenceDiagrams[id].label}
          </button>
        ))}
      </div>
      <svg
        className={styles.referenceDiagram}
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        role="img"
        aria-label={`${diagram.label}, DVOR 1150A`}
      >
        <image href={diagram.src} x="0" y="0" width={diagram.width} height={diagram.height} />
        {diagram.overlays.map((overlay) => (
          <foreignObject key={`${diagramId}-${overlay.hotspotId}-${overlay.x}-${overlay.y}`} x={overlay.x} y={overlay.y} width={overlay.width} height={overlay.height}>
            <button
              type="button"
              title={overlay.label}
              aria-label={`Chọn ${overlay.label}`}
              aria-pressed={selectedHotspotId === overlay.hotspotId}
              className={styles.referenceHotspot}
              onClick={() => onSelect(overlay.blockId, resolveHotspot(overlay))}
            >
              <span className="sr-only">{overlay.label}</span>
            </button>
          </foreignObject>
        ))}
      </svg>
    </div>
  );
}

const lcuScreens = [
  { title: "Integral Monitor 1", rows: ["Az Angle 0.00°", "30 Hz Mod 30.0%", "9960 Hz Mod 30.0%", "Deviation 16.0", "RF Level 100.0%"] },
  { title: "RMS / Facilities Power", rows: ["AC Power 230.0 V", "AC Current 2.4 A", "TX 1 48 V 48.1 V", "TX 2 48 V 48.0 V"] },
  { title: "VOR Temperatures", rows: ["Interior 28 °C", "Exterior 31 °C", "RF Monitor 34 °C", "Carrier Amp 1 39 °C"] },
] as const;

function LcuPanel() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [local, setLocal] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [lampTest, setLampTest] = useState(false);
  const [mainTransmitter, setMainTransmitter] = useState<1 | 2>(1);
  const [routes, setRoutes] = useState<Record<1 | 2, "ANTENNA" | "LOAD" | "OFF">>({ 1: "ANTENNA", 2: "OFF" });
  const screen = lcuScreens[screenIndex];

  function toggleLocal() {
    setLocal((current) => {
      if (current) setBypass(false);
      return !current;
    });
  }

  function selectMain(transmitter: 1 | 2) {
    const standbyTransmitter = transmitter === 1 ? 2 : 1;
    setMainTransmitter(transmitter);
    setRoutes({
      [transmitter]: "ANTENNA",
      [standbyTransmitter]: "OFF",
    } as Record<1 | 2, "ANTENNA" | "LOAD" | "OFF">);
  }

  function transmitterButton(
    transmitter: 1 | 2,
    action: "MAIN SELECT" | "ANTENNA" | "LOAD" | "OFF",
  ) {
    const active = action === "MAIN SELECT"
      ? mainTransmitter === transmitter && routes[transmitter] !== "OFF"
      : routes[transmitter] === action;

    return (
      <button
        type="button"
        aria-label={`Transmitter ${transmitter} ${action}`}
        aria-pressed={active}
        disabled={!local}
        onClick={() => action === "MAIN SELECT"
          ? selectMain(transmitter)
          : action === "ANTENNA"
            ? selectMain(transmitter)
            : setRoutes((current) => ({ ...current, [transmitter]: action }))}
        className={styles.lcuSquareButton}
      >
        <i aria-hidden className={active && action === "OFF" ? styles.lcuOffIndicator : undefined} />
        {transmitter}
      </button>
    );
  }

  const systemIndicators = [
    { label: "MAINTENANCE ALERT", active: lampTest },
    { label: "REMOTE CONTROL FAULT", active: lampTest },
    { label: "BATTERY FAULT", active: lampTest },
    { label: "ON BATTERY", active: lampTest },
    { label: "INTERLOCKED OFF", active: lampTest },
    { label: "LCU POWER OK", active: true },
  ] as const;

  return (
    <div className={styles.lcuPanel}>
      <div className={styles.lcuDisplay}>
        <strong>{screen.title}</strong>
        {screen.rows.map((row) => <span key={row}>{row}</span>)}
        <div className={styles.displayControls}>
          <button type="button" onClick={() => setScreenIndex((screenIndex + lcuScreens.length - 1) % lcuScreens.length)}>Prev</button>
          <button type="button" onClick={() => setScreenIndex(0)}>Main</button>
          <button type="button" onClick={() => setScreenIndex((screenIndex + 1) % lcuScreens.length)}>Next</button>
        </div>
      </div>
      <div className={styles.lcuControlPanel}>
        <fieldset className={styles.transmitterPanel}>
          <legend>TRANSMITTER</legend>
          {(["MAIN SELECT", "ANTENNA", "LOAD", "OFF"] as const).map((action) => (
            <div key={action} className={styles.transmitterRow}>
              {transmitterButton(1, action)}
              <span>{action}</span>
              {transmitterButton(2, action)}
            </div>
          ))}
        </fieldset>

        <div className={styles.lcuRightPanels}>
          <fieldset className={styles.monitorPanel}>
            <legend>MONITOR</legend>
            {(["INTEGRAL", "STANDBY"] as const).map((channel) => (
              <div key={channel} className={styles.monitorChannel}>
                <strong>{channel}</strong>
                <div className={styles.monitorHeadings}><span>NORMAL</span><span>ALARM<br /><small>PRIMARY</small></span><span><br /><small>SECONDARY</small></span></div>
                {[1, 2].map((monitor) => (
                  <div key={monitor} className={styles.monitorRow}>
                    <b>{monitor}</b>
                    <i className={channel === "INTEGRAL" || lampTest ? styles.lcuLampNormal : styles.lcuLampOff} />
                    <i className={lampTest ? styles.lcuLampAlarm : styles.lcuLampOff} />
                    <i className={lampTest ? styles.lcuLampAlarm : styles.lcuLampOff} />
                  </div>
                ))}
                <button
                  type="button"
                  aria-pressed={channel === "INTEGRAL" && bypass}
                  disabled={!local || channel === "STANDBY"}
                  onClick={() => channel === "INTEGRAL" && setBypass((value) => !value)}
                  className={styles.monitorBypass}
                ><i aria-hidden />BYPASS</button>
              </div>
            ))}
          </fieldset>

          <fieldset className={styles.systemPanel}>
            <legend>SYSTEM</legend>
            <div className={styles.systemButtons}>
              <button type="button" aria-pressed={local} onClick={toggleLocal}><i aria-hidden />LOCAL<br />CONTROL</button>
              <button type="button" aria-pressed={lampTest} onClick={() => setLampTest((value) => !value)}>LAMP<br />TEST</button>
              <button type="button">ALARM<br />SILENCE</button>
              <button type="button">RESET</button>
            </div>
            <div className={styles.lcuSystemIndicators}>
              {systemIndicators.map((indicator) => (
                <span key={indicator.label}><i className={indicator.active ? styles.lcuLampOn : styles.lcuLampOff} />{indicator.label}</span>
              ))}
            </div>
            <label className={styles.volumeControl}>
              <input aria-label="LCU alarm volume" type="range" min="0" max="100" defaultValue="45" />
              <span className={styles.volumeKnob} aria-hidden />
              <span>VOLUME</span>
            </label>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function ModulePanel({ blockId }: { blockId: Exclude<DvorBlockId, "lcu"> }) {
  const block = DVOR_BLOCK_BY_ID.get(blockId)!;
  const hasRebuiltFaceplate = hasRebuiltModuleFaceplate(blockId);
  const [activeWaveform, setActiveWaveform] = useState<DvorWaveformReference | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeWaveform) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveWaveform(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [activeWaveform]);

  return (
    <div className={styles.modulePanel}>
      {hasRebuiltFaceplate ? (
        <figure className={`${styles.moduleFigure} ${styles.moduleFigureRebuilt}`}>
          <DvorModuleFaceplate blockId={blockId} />
          <figcaption>{block.faceImage?.figure}</figcaption>
        </figure>
      ) : block.faceImage ? (
        <figure className={styles.moduleFigure}>
          <Image
            src={block.faceImage.src}
            alt={`Mặt trước ${block.name} theo ${block.faceImage.figure}`}
            width={block.faceImage.width}
            height={block.faceImage.height}
            sizes="(max-width: 700px) 62vw, 300px"
            className={styles.moduleFaceImage}
          />
          <figcaption>{block.faceImage.figure}</figcaption>
        </figure>
      ) : (
        <div className={styles.moduleFallback}>
          <strong>{block.shortName}</strong>
          <span>Manual không có Figure mặt trước riêng cho cụm này.</span>
        </div>
      )}
      <div className={styles.manualDescription}>
        <p className={styles.manualDescriptionTitle}>Mô tả theo tài liệu manual</p>
        <p className={styles.manualFunction}>{block.description}</p>

        {block.indicators.length > 0 ? (
          <div className={styles.manualSection}>
            <strong>Chỉ thị và trạng thái</strong>
            <ul>
              {block.indicators.map((indicator) => <li key={indicator}>{indicator}</li>)}
            </ul>
          </div>
        ) : null}

        {block.testPoints.length > 0 ? (
          <div className={styles.manualSection}>
            <strong>Điểm đo và cổng kết nối</strong>
            <dl>
              {block.testPoints.map((point) => (
                <div key={point.id}>
                  <dt>{point.id}</dt>
                  <dd>
                    <b>{point.label}</b>
                    <span>{point.nominal}</span>
                    {point.waveform ? (
                      <button
                        type="button"
                        className={styles.waveformTrigger}
                        aria-label={`Phóng lớn ${point.waveform.caption}`}
                        onClick={() => setActiveWaveform(point.waveform ?? null)}
                      >
                        <Image
                          src={point.waveform.src}
                          alt={point.waveform.alt}
                          width={point.waveform.width}
                          height={point.waveform.height}
                          sizes="(max-width: 700px) 72vw, 240px"
                          className={styles.waveformThumbnail}
                        />
                        <span className={styles.waveformTriggerLabel}>Xem lớn dạng sóng</span>
                      </button>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <p className={styles.manualSource}>{block.manualReference}</p>
      </div>

      {activeWaveform ? (
        <div
          className={styles.waveformBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveWaveform(null);
          }}
        >
          <section
            className={styles.waveformDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="waveform-dialog-title"
          >
            <header className={styles.waveformDialogHeader}>
              <div>
                <span>Ảnh đo tham khảo thực tế</span>
                <h3 id="waveform-dialog-title">{activeWaveform.caption}</h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Đóng ảnh dạng sóng"
                onClick={() => setActiveWaveform(null)}
              >
                Đóng ×
              </button>
            </header>
            <div className={styles.waveformDialogImageFrame}>
              <Image
                src={activeWaveform.src}
                alt={activeWaveform.alt}
                width={activeWaveform.width}
                height={activeWaveform.height}
                sizes="(max-width: 700px) 92vw, 900px"
                className={styles.waveformDialogImage}
                priority
              />
            </div>
            <p>Nhấn Esc, nút Đóng hoặc vùng nền bên ngoài để quay lại mặt module.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DetailPanel({ blockId }: { blockId: DvorBlockId }) {
  const block = DVOR_BLOCK_BY_ID.get(blockId)!;
  return (
    <section className={styles.detailPanel} aria-labelledby="selected-block-title">
      <div className={styles.detailHeader}>
        <div>
          <p>Khối đang chọn</p>
          <h2 id="selected-block-title">{block.name}</h2>
        </div>
        <div className={styles.assemblyList}>{block.assemblyIds.map((id) => <span key={id}>{id}</span>)}</div>
      </div>
      <p className={styles.description}>{block.description}</p>
      {block.id === "lcu" ? <LcuPanel /> : block.assemblyIds.length > 0 ? <ModulePanel blockId={block.id} /> : null}
      <div className={styles.referenceGrid}>
        <div><strong>Tham chiếu manual</strong><span>{block.manualReference}</span></div>
        {block.testPoints.map((point) => <div key={point.id}><strong>{point.id} · {point.label}</strong><span>{point.nominal}</span></div>)}
      </div>
    </section>
  );
}

export function DvorBlockDiagram() {
  const [selectedBlockId, setSelectedBlockId] = useState<DvorBlockId | null>(null);
  const [selectedDiagramHotspotId, setSelectedDiagramHotspotId] = useState<string | null>(null);
  const [selectedCabinetHotspotId, setSelectedCabinetHotspotId] = useState<string | null>(null);
  const [cabinetFace, setCabinetFace] = useState<CabinetFace>("front");
  const cabinet = cabinetImages[cabinetFace];
  const cabinetHotspots = useMemo(
    () => DVOR_BLOCKS.flatMap((block) => block.cabinetFace === cabinetFace
      ? block.cabinetHotspots.map((hotspot) => ({ blockId: block.id, hotspot }))
      : []),
    [cabinetFace],
  );
  const cabinetSelectableBlocks = useMemo(
    () => new Set(DVOR_BLOCKS.filter((block) => block.cabinetHotspots.length > 0).map((block) => block.id)),
    [],
  );

  function selectBlock(blockId: DvorBlockId, hotspot: DvorHotspot) {
    const block = DVOR_BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setSelectedBlockId(blockId);
    setSelectedDiagramHotspotId(hotspot.id);
    setSelectedCabinetHotspotId(hotspot.targetCabinetHotspotId ?? block.cabinetHotspots[0]?.id ?? null);
    if (block.cabinetHotspots.length > 0) setCabinetFace(block.cabinetFace);
  }

  return (
    <main className={styles.page}>
      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-labelledby="cabinet-heading">
          <div className={styles.panelHeading}>
            <h2 id="cabinet-heading" className="sr-only">Cabinet {cabinet.label.toLocaleLowerCase("vi")}</h2>
            <div className={styles.faceTabs} role="tablist" aria-label="Chọn mặt cabinet">
              {(["front", "rear"] as const).map((face) => (
                <button key={face} type="button" role="tab" aria-selected={cabinetFace === face} onClick={() => setCabinetFace(face)}>
                  {face === "front" ? <CaretLeft aria-hidden /> : <CaretRight aria-hidden />}{cabinetImages[face].label}
                </button>
              ))}
            </div>
          </div>
          <EquipmentCanvas image={cabinet} hotspots={cabinetHotspots} selectedHotspotIds={new Set(selectedCabinetHotspotId ? [selectedCabinetHotspotId] : [])} onSelect={selectBlock} interactive interactiveBlockIds={cabinetSelectableBlocks} />
        </section>

        <section className={styles.viewerPanel} aria-labelledby="diagram-heading">
          <h2 id="diagram-heading" className="sr-only">Sơ đồ khối máy phát DVOR 1150A</h2>
          <DvorReferenceDiagrams selectedHotspotId={selectedDiagramHotspotId} onSelect={selectBlock} />
        </section>
      </div>

      {selectedBlockId ? <DetailPanel blockId={selectedBlockId} /> : null}
    </main>
  );
}
