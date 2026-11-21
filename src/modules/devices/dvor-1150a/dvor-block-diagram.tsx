"use client";

import Image from "next/image";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DVOR_BLOCKS,
  DVOR_BLOCK_BY_ID,
  dvorHardwareOccurrenceKey,
  resolveDvorHardwareOccurrence,
  type CabinetFace,
  type DvorBlockId,
  type DvorHardwareOccurrence,
  type DvorHotspot,
  type DvorWaveformReference,
} from "./block-diagram-data";
import { DvorModuleFaceplate, hasRebuiltModuleFaceplate } from "./dvor-module-faceplates";
import { readSidebandTransmitter, type SidebandAdjustmentControl } from "./sideband-adjustment-model";
import { DvorAlignmentFeedback } from "./alignment-feedback";
import { readSidebandAlignment } from "@/lib/dvor1150a/alignment";
import { dvorSidebandAssembly } from "@/lib/dvor1150a/sideband";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { SimulatorConfigPersistence } from "@/components/simulator/simulator-config-persistence";
import styles from "./dvor-block-diagram.module.css";
import { dvorLcuScreens, projectDvorHardware } from "@/lib/dvor1150a/hardware";
import { Dvor1150aMonitorClock } from "@/components/vor/dvor1150a-monitor-clock";
import { HardwareCalibrationDialog } from "./hardware-calibration-dialog";

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
  selectedHotspotIds,
  onSelect,
}: {
  selectedHotspotId?: string | null;
  selectedHotspotIds?: ReadonlySet<string>;
  onSelect: (blockId: DvorBlockId, hotspot: DvorHotspot) => void;
}) {
  const [diagramId, setDiagramId] = useState<ReferenceDiagramId>("transmitter");
  const diagram = referenceDiagrams[diagramId];
  const isSelected = (hotspotId: string) => selectedHotspotIds?.has(hotspotId) ?? selectedHotspotId === hotspotId;

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
      <div className={styles.referenceDiagramViewport}>
        <svg
          className={styles.referenceDiagram}
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="group"
          aria-label={`${diagram.label}, DVOR 1150A`}
        >
          <image href={diagram.src} x="0" y="0" width={diagram.width} height={diagram.height} />
          {diagram.overlays.map((overlay) => (
            <foreignObject key={`${diagramId}-${overlay.hotspotId}-${overlay.x}-${overlay.y}`} x={overlay.x} y={overlay.y} width={overlay.width} height={overlay.height}>
              <button
                type="button"
                title={overlay.label}
                aria-label={`Chọn ${overlay.label}`}
                aria-pressed={isSelected(overlay.hotspotId)}
                className={styles.referenceHotspot}
                onClick={() => onSelect(overlay.blockId, resolveHotspot(overlay))}
              >
                <span className="sr-only">{overlay.label}</span>
              </button>
            </foreignObject>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function LcuPanel() {
  const [screenIndex, setScreenIndex] = useState(0);
  const state = useVorPmdtStore();
  const hardware = projectDvorHardware(state);
  const { lampTest, volume } = state.lcu;
  const local = state.config.simulation.local;
  const bypass = state.config.simulation.integralMonitorBypass;
  const lcuScreens = dvorLcuScreens(state);
  const screen = lcuScreens[screenIndex];
  useEffect(() => {
    if (!hardware.audible || volume === 0 || !window.AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 1000;
    gain.gain.value = volume / 1000;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    void context.resume().catch(() => {});
    return () => { oscillator.stop(); void context.close(); };
  }, [hardware.audible, volume]);

  function transmitterButton(
    transmitter: 1 | 2,
    action: "MAIN SELECT" | "ANTENNA" | "LOAD" | "OFF",
  ) {
    const id = transmitter === 1 ? "tx1" : "tx2";
    const target = state.config.transmitters[id];
    const active = action === "MAIN SELECT" ? state.derived.mainTransmitter === id
      : action === "ANTENNA" ? state.lcu.relayRoutes[id] === "antenna" : action === "LOAD" ? state.lcu.relayRoutes[id] === "load" : !target.onAir && !target.load;
    const lit = hardware.lcuPower && (lampTest || active);

    return (
      <button
        type="button"
        aria-label={`${action} ${transmitter}`}
        aria-pressed={active}
        disabled={!local || !hardware.lcuPower || (transmitter === 2 && state.config.station.transmitterConfig === "Single Transmitter")}
        onClick={() => state.lcuCommand(action === "MAIN SELECT" ? "main" : action === "ANTENNA" ? "antenna" : action === "LOAD" ? "load" : "off", id)}
        className={styles.lcuSquareButton}
      >
        <i aria-hidden data-lit={lit} className={action === "OFF" ? styles.lcuOffIndicator : undefined} />
        {transmitter}
      </button>
    );
  }

  const systemIndicators = [
    { label: "MAINTENANCE ALERT", active: hardware.maintenance },
    { label: "REMOTE CONTROL FAULT", active: hardware.remoteFault },
    { label: "BATTERY FAULT", active: hardware.supplies.some(s => s.batteryFault) },
    { label: "ON BATTERY", active: hardware.supplies.some(s => s.onBattery) },
    { label: "INTERLOCKED OFF", active: state.lcu.interlockedOff },
    { label: "LCU POWER OK", active: hardware.lcuPower },
  ] as const;

  return (
    <div className={styles.lcuPanel}>
      <div className={styles.lcuDisplay} role="region" aria-label="Màn hình LCU">
        <strong>{screen.title}</strong>
        {screen.rows.map((row) => <span key={row}>{hardware.lcuPower ? row : "—"}</span>)}
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
                    <i aria-label={`${channel} ${monitor} Normal`} data-lit={hardware.lcuPower && (lampTest || (channel === "INTEGRAL" && hardware.monitors[monitor - 1].enabled && !hardware.monitors[monitor - 1].qualifiedPrimary && !hardware.monitors[monitor - 1].qualifiedSecondary))} className={styles.lcuLampNormal} />
                    <i aria-label={`${channel} ${monitor} Primary`} data-lit={hardware.lcuPower && (lampTest || (channel === "INTEGRAL" && hardware.monitors[monitor - 1].qualifiedPrimary))} className={styles.lcuLampAlarm} />
                    <i aria-label={`${channel} ${monitor} Secondary`} data-lit={hardware.lcuPower && (lampTest || (channel === "INTEGRAL" && hardware.monitors[monitor - 1].qualifiedSecondary))} className={styles.lcuLampAlarm} />
                  </div>
                ))}
                <button
                  type="button"
                  aria-label={`${channel} bypass`}
                  aria-pressed={channel === "INTEGRAL" && bypass}
                  disabled={!local || !hardware.lcuPower || channel === "STANDBY"}
                  onClick={() => state.lcuCommand("bypass")}
                  className={styles.monitorBypass}
                ><i aria-hidden data-lit={hardware.lcuPower && (lampTest || (channel === "INTEGRAL" && bypass))} />BYPASS</button>
              </div>
            ))}
          </fieldset>

          <fieldset className={styles.systemPanel}>
            <legend>SYSTEM</legend>
            <div className={styles.systemButtons}>
              <button type="button" aria-label="LOCAL CONTROL" aria-pressed={local} onClick={() => state.lcuCommand("local")}><i aria-hidden data-lit={hardware.lcuPower && (lampTest || local)} />LOCAL<br />CONTROL</button>
              <button type="button" aria-label="LAMP TEST" aria-pressed={lampTest} onClick={() => state.lcuCommand("lamp-test")}>LAMP<br />TEST</button>
              <button type="button" aria-label="ALARM SILENCE" onClick={() => state.lcuCommand("silence")}>ALARM<br />SILENCE</button>
              <button type="button" onClick={() => { if (state.lcuCommand("reset")) setScreenIndex(0); }}>RESET</button>
            </div>
            <div className={styles.lcuSystemIndicators}>
              {systemIndicators.map((indicator) => (
                <span key={indicator.label}><i aria-label={indicator.label} data-lit={hardware.lcuPower && (lampTest || indicator.active)} className={indicator.label === "LCU POWER OK" ? styles.lcuLampOn : styles.lcuLampAlarm} />{indicator.label}</span>
              ))}
            </div>
            <label className={styles.volumeControl}>
              <input aria-label="LCU alarm volume" type="range" min="0" max="100" value={volume} onChange={event => state.setLcuVolume(Number(event.target.value))} />
              <span className={styles.volumeKnob} aria-hidden />
              <span>VOLUME</span>
            </label>
            <output className="sr-only" aria-label="LCU simulated alarm tone" data-audible={hardware.audible && volume > 0}>{hardware.audible && volume > 0 ? "Âm báo mô phỏng" : "Im lặng"}</output>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function ModulePanel({ blockId, sidebandAdjustment, occurrenceId }: { blockId: Exclude<DvorBlockId, "lcu">; sidebandAdjustment?: SidebandAdjustmentControl; occurrenceId?: string }) {
  const block = DVOR_BLOCK_BY_ID.get(blockId)!;
  const hasRebuiltFaceplate = hasRebuiltModuleFaceplate(blockId);
  const [activeWaveform, setActiveWaveform] = useState<DvorWaveformReference | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const assembly = blockId === "rf-monitor" ? "rf" : occurrenceId === "bcps-1a5a2" ? "bcps2" : "bcps1";

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
          <DvorModuleFaceplate blockId={blockId} sidebandAdjustment={sidebandAdjustment} occurrenceId={occurrenceId} onCalibration={() => setCalibrationOpen(true)} />
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
        <DvorAlignmentFeedback blockId={blockId} occurrenceId={occurrenceId ?? sidebandAdjustment?.occurrenceId} />
        {blockId === "rf-monitor" || blockId === "bcps" ? <>
          <button type="button" onClick={() => setCalibrationOpen(true)}>Hiệu chỉnh detector {assembly.toUpperCase()} · mô phỏng phần cứng</button>
          {calibrationOpen ? <HardwareCalibrationDialog key={assembly} assembly={assembly} onClose={() => setCalibrationOpen(false)} /> : null}
        </> : null}
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

function DetailPanel({ blockId, sidebandAdjustment, occurrenceId }: { blockId: DvorBlockId; sidebandAdjustment?: SidebandAdjustmentControl; occurrenceId?: string }) {
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
      {block.id === "lcu" ? <LcuPanel /> : block.assemblyIds.length > 0 ? <ModulePanel blockId={block.id} sidebandAdjustment={sidebandAdjustment} occurrenceId={occurrenceId} /> : null}
      <div className={styles.referenceGrid}>
        <div><strong>Tham chiếu manual</strong><span>{block.manualReference}</span></div>
        {block.testPoints.map((point) => <div key={point.id}><strong>{point.id} · {point.label}</strong><span>{point.nominal}</span></div>)}
      </div>
    </section>
  );
}

export interface DvorHardwareSelectorProps {
  selectedOccurrenceKeys: ReadonlySet<string>;
  inspectedOccurrenceKeys?: ReadonlySet<string>;
  selectionDisabled?: boolean;
  onSelectOccurrence: (occurrence: DvorHardwareOccurrence) => void;
  onInspectOccurrence?: (occurrence: DvorHardwareOccurrence) => void;
}

/**
 * Controlled selector used by scenario Bước 2. It deliberately reuses the
 * same cabinet and source-diagram layers as the public block-diagram route,
 * so an exam answer cannot drift from the documented cabinet mapping.
 */
export function DvorHardwareSelector({
  selectedOccurrenceKeys,
  inspectedOccurrenceKeys = new Set<string>(),
  selectionDisabled = false,
  onSelectOccurrence,
  onInspectOccurrence,
}: DvorHardwareSelectorProps) {
  const [selectedDiagramHotspotId, setSelectedDiagramHotspotId] = useState<string | null>(null);
  const [cabinetFace, setCabinetFace] = useState<CabinetFace>("front");
  const allOccurrences = useMemo(
    () => DVOR_BLOCKS.flatMap((block) => block.diagramHotspots
      .map((hotspot) => resolveDvorHardwareOccurrence(block.id, hotspot.id))
      .filter((occurrence): occurrence is DvorHardwareOccurrence => Boolean(occurrence))),
    [],
  );
  const occurrenceByKey = useMemo(
    () => new Map(allOccurrences.map((occurrence) => [dvorHardwareOccurrenceKey(occurrence), occurrence])),
    [allOccurrences],
  );
  const selectedDiagramHotspots = useMemo(
    () => new Set([...selectedOccurrenceKeys].map((key) => occurrenceByKey.get(key)?.diagramHotspotId).filter((id): id is string => Boolean(id))),
    [occurrenceByKey, selectedOccurrenceKeys],
  );
  const selectedCabinetHotspots = useMemo(
    () => new Set([...selectedOccurrenceKeys].map((key) => occurrenceByKey.get(key)?.cabinetHotspotId).filter((id): id is string => Boolean(id))),
    [occurrenceByKey, selectedOccurrenceKeys],
  );
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
    const occurrence = resolveDvorHardwareOccurrence(blockId, hotspot.id);
    const block = DVOR_BLOCK_BY_ID.get(blockId);
    if (!occurrence || !block) return;
    setSelectedDiagramHotspotId(occurrence.diagramHotspotId);
    if (block.cabinetHotspots.length > 0) setCabinetFace(block.cabinetFace);
    onInspectOccurrence?.(occurrence);
    if (!selectionDisabled) onSelectOccurrence(occurrence);
  }

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-labelledby="scenario-cabinet-heading">
          <div className={styles.panelHeading}>
            <h2 id="scenario-cabinet-heading" className="sr-only">Cabinet {cabinet.label.toLocaleLowerCase("vi")}</h2>
            <div className={styles.faceTabs} role="tablist" aria-label="Chọn mặt cabinet để xác định phần cứng">
              {(["front", "rear"] as const).map((face) => (
                <button key={face} type="button" role="tab" aria-selected={cabinetFace === face} onClick={() => setCabinetFace(face)}>
                  {face === "front" ? <CaretLeft aria-hidden /> : <CaretRight aria-hidden />}{cabinetImages[face].label}
                </button>
              ))}
            </div>
          </div>
          <EquipmentCanvas
            image={cabinet}
            hotspots={cabinetHotspots}
            selectedHotspotIds={selectedCabinetHotspots}
            onSelect={selectBlock}
            interactive
            interactiveBlockIds={cabinetSelectableBlocks}
          />
        </section>
        <section className={styles.viewerPanel} aria-labelledby="scenario-diagram-heading">
          <h2 id="scenario-diagram-heading" className="sr-only">Sơ đồ khối DVOR 1150A dùng cho xác định phần cứng</h2>
          <DvorReferenceDiagrams
            selectedHotspotId={selectedDiagramHotspotId}
            selectedHotspotIds={selectedDiagramHotspots}
            onSelect={selectBlock}
          />
        </section>
      </div>
      <p className="sr-only">
        Đã chọn {selectedOccurrenceKeys.size} occurrence phần cứng và đã kiểm tra {inspectedOccurrenceKeys.size} occurrence.
      </p>
    </div>
  );
}

export function DvorBlockDiagram() {
  const config = useVorPmdtStore(state => state.config);
  const snapshot = useVorPmdtStore(state => state.derived);
  const turnTrim = useVorPmdtStore(state => state.turnSidebandTrim);
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
    setSelectedCabinetHotspotId(hotspot.targetCabinetHotspotId
      ?? block.cabinetHotspots.find((candidate) => candidate.id === hotspot.id)?.id
      ?? block.cabinetHotspots[0]?.id ?? null);
    if (block.cabinetHotspots.length > 0) setCabinetFace(block.cabinetFace);
  }

  return (
    <main className={styles.page}>
      <Dvor1150aMonitorClock />
      <SimulatorConfigPersistence simulatorId="dvor-1150a" />
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

      {selectedBlockId ? <DetailPanel blockId={selectedBlockId} occurrenceId={selectedCabinetHotspotId ?? undefined} sidebandAdjustment={selectedBlockId === "sideband" && selectedCabinetHotspotId ? {
        occurrenceId: selectedCabinetHotspotId,
        angles: config.sidebandTrims?.[dvorSidebandAssembly(selectedCabinetHotspotId)!.id] ?? {},
        transmitterData: readSidebandTransmitter(snapshot, selectedCabinetHotspotId),
        alignment: readSidebandAlignment(config, snapshot, selectedCabinetHotspotId),
        onTurn: (id, delta) => { turnTrim(selectedCabinetHotspotId, id, delta); },
      } : undefined} /> : null}
    </main>
  );
}
