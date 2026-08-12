"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Dvor1150BlockDefinition,
  Dvor1150BlockId,
  Dvor1150CabinetHotspot,
  Dvor1150CabinetSurface,
  Dvor1150DiagramOccurrence,
  Dvor1150WaveformReference,
} from "./block-diagram-data";
import {
  DVOR_1150_BLOCK_BY_ID,
  DVOR_1150_BLOCKS,
} from "./block-diagram-data";
import { Dvor1150Cabinet } from "./dvor-1150-cabinet";
import { Dvor1150ModuleFaceplate } from "./dvor-1150-module-faceplates";
import { Dvor1150SystemDiagram } from "./dvor-1150-system-diagram";
import styles from "./dvor-1150-block-diagram.module.css";

const surfaceLabels: Record<Dvor1150CabinetSurface, string> = {
  electronics: "Electronics Cabinet",
  commutator: "Commutator Rack",
};

const rebuiltFaceplateIds = new Set<Dvor1150BlockId>([
  "frequency-synthesizer",
  "sideband-generator",
  "status-display",
]);

function hasRebuiltFaceplate(
  blockId: Dvor1150BlockId,
): blockId is "frequency-synthesizer" | "sideband-generator" | "status-display" {
  return rebuiltFaceplateIds.has(blockId);
}

function FunctionalDiagram({ blockId }: { blockId: Dvor1150BlockId }) {
  if (blockId === "csb-power-amplifier") {
    return (
      <svg className={styles.functionalDiagram} viewBox="0 0 760 430" role="img" aria-label="Sơ đồ chức năng CSB Power Amplifier theo Figure 2-13">
        <defs><marker id="detail-arrow-csb" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs>
        <rect className={styles.functionalPaper} width="760" height="430" rx="7" />
        <g className={styles.functionalPaths} markerEnd="url(#detail-arrow-csb)">
          <path d="M54 118H168" />
          <path d="M302 118H430" />
          <path d="M568 118H704" />
          <path d="M118 306H234V166" />
          <path d="M360 306H498V166" />
        </g>
        <g className={styles.functionalBlocks}>
          <rect x="168" y="78" width="134" height="80" rx="4" />
          <text x="235" y="111"><tspan x="235">EXCITER /</tspan><tspan x="235" dy="18">MODULATOR</tspan></text>
          <rect x="430" y="78" width="138" height="80" rx="4" />
          <text x="499" y="111"><tspan x="499">POWER</tspan><tspan x="499" dy="18">AMPLIFIER</tspan></text>
          <rect x="54" y="270" width="128" height="72" rx="4" />
          <text x="118" y="300"><tspan x="118">BIAS REG. /</tspan><tspan x="118" dy="18">EXCITER MOD.</tspan></text>
          <rect x="292" y="270" width="136" height="72" rx="4" />
          <text x="360" y="300"><tspan x="360">POWER AMP</tspan><tspan x="360" dy="18">MODULATOR</tspan></text>
        </g>
        <g className={styles.functionalLabels}>
          <text x="54" y="104">CARRIER RF</text>
          <text x="618" y="104">CSB RF OUTPUT</text>
          <text x="54" y="255">30 Hz + IDENT + VOICE</text>
          <text x="292" y="255">43/48 VDC</text>
        </g>
        <text className={styles.functionalReference} x="736" y="404">FIGURE 2-13 · FUNCTIONAL RECONSTRUCTION</text>
      </svg>
    );
  }

  if (blockId === "audio-generator") {
    return (
      <svg className={styles.functionalDiagram} viewBox="0 0 760 430" role="img" aria-label="Sơ đồ chức năng Audio Generator theo Figure 2-7">
        <defs><marker id="detail-arrow-audio" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs>
        <rect className={styles.functionalPaper} width="760" height="430" rx="7" />
        <g className={styles.functionalPaths} markerEnd="url(#detail-arrow-audio)">
          <path d="M188 100H278" />
          <path d="M410 100H520" />
          <path d="M188 252H278" />
          <path d="M410 252H520" />
          <path d="M344 142V210" />
        </g>
        <g className={styles.functionalBlocks}>
          <rect x="54" y="62" width="134" height="76" rx="4" /><text x="121" y="104">MICROCONTROLLER</text>
          <rect x="278" y="62" width="132" height="76" rx="4" /><text x="344" y="104">DAC / LATCH</text>
          <rect x="520" y="54" width="180" height="92" rx="4" /><text x="610" y="87"><tspan x="610">CARRIER / IDENT /</tspan><tspan x="610" dy="18">VOICE OUTPUTS</tspan></text>
          <rect x="54" y="214" width="134" height="76" rx="4" /><text x="121" y="247"><tspan x="121">RF POWER /</tspan><tspan x="121" dy="18">VSWR INPUTS</tspan></text>
          <rect x="278" y="214" width="132" height="76" rx="4" /><text x="344" y="247"><tspan x="344">MUX /</tspan><tspan x="344" dy="18">BUFFER</tspan></text>
          <rect x="520" y="206" width="180" height="92" rx="4" /><text x="610" y="239"><tspan x="610">SB1-SB4 AUDIO /</tspan><tspan x="610" dy="18">PHASE CONTROL</tspan></text>
        </g>
        <text className={styles.functionalReference} x="736" y="404">FIGURE 2-7 · FUNCTIONAL RECONSTRUCTION</text>
      </svg>
    );
  }

  if (blockId === "rf-monitor") {
    return (
      <svg className={styles.functionalDiagram} viewBox="0 0 760 430" role="img" aria-label="Sơ đồ chức năng RF Monitor theo Figure 2-25">
        <defs><marker id="detail-arrow-rf-monitor" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs>
        <rect className={styles.functionalPaper} width="760" height="430" rx="7" />
        <g className={styles.functionalPaths} markerEnd="url(#detail-arrow-rf-monitor)">
          <path d="M52 96H210" /><path d="M52 152H210" /><path d="M52 208H210" /><path d="M52 264H210" />
          <path d="M358 180H516" /><path d="M628 180H708" />
        </g>
        <g className={styles.functionalBlocks}>
          <rect x="210" y="66" width="148" height="230" rx="4" />
          <text x="284" y="158"><tspan x="284">RF DETECTOR /</tspan><tspan x="284" dy="18">AMPLIFIER /</tspan><tspan x="284" dy="18">DISTRIBUTOR</tspan></text>
          <rect x="516" y="130" width="112" height="100" rx="4" />
          <text x="572" y="174"><tspan x="572">DC LEVEL</tspan><tspan x="572" dy="18">OUTPUTS</tspan></text>
        </g>
        <g className={styles.functionalLabels}>
          <text x="52" y="86">CARRIER FWD</text><text x="52" y="142">CARRIER REV</text><text x="52" y="198">SB1-SB4 FWD</text><text x="52" y="254">SB1-SB4 REV</text><text x="650" y="166">TO AUDIO GEN /</text><text x="650" y="184">MONITOR</text>
        </g>
        <text className={styles.functionalReference} x="736" y="404">FIGURE 2-25 · FUNCTIONAL RECONSTRUCTION</text>
      </svg>
    );
  }

  if (blockId === "monitor-cca") {
    return (
      <svg className={styles.functionalDiagram} viewBox="0 0 760 430" role="img" aria-label="Luồng xử lý Monitor CCA DVOR 1150">
        <defs><marker id="detail-arrow-monitor" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs>
        <rect className={styles.functionalPaper} width="760" height="430" rx="7" />
        <g className={styles.functionalPaths} markerEnd="url(#detail-arrow-monitor)"><path d="M164 115H254" /><path d="M390 115H482" /><path d="M618 115H706" /><path d="M322 154V244" /><path d="M390 282H520" /></g>
        <g className={styles.functionalBlocks}>
          <rect x="34" y="76" width="130" height="78" rx="4" /><text x="99" y="108"><tspan x="99">FIELD DETECTOR</tspan><tspan x="99" dy="18">AUDIO</tspan></text>
          <rect x="254" y="76" width="136" height="78" rx="4" /><text x="322" y="108"><tspan x="322">FILTER /</tspan><tspan x="322" dy="18">DEMODULATE</tspan></text>
          <rect x="482" y="76" width="136" height="78" rx="4" /><text x="550" y="108"><tspan x="550">MEASURE /</tspan><tspan x="550" dy="18">COMPARE</tspan></text>
          <rect x="254" y="244" width="136" height="76" rx="4" /><text x="322" y="276"><tspan x="322">TEST-POINT</tspan><tspan x="322" dy="18">SIGNALS</tspan></text>
          <rect x="520" y="244" width="136" height="76" rx="4" /><text x="588" y="276"><tspan x="588">RMS DATA /</tspan><tspan x="588" dy="18">ALARM</tspan></text>
        </g>
        <text className={styles.functionalReference} x="736" y="404">MONITOR PROCESSING · TABLE 3-8 / CHAPTER 2</text>
      </svg>
    );
  }

  return null;
}

function WaveformButton({
  waveform,
  onOpen,
}: {
  waveform: Dvor1150WaveformReference;
  onOpen: (waveform: Dvor1150WaveformReference) => void;
}) {
  return (
    <button
      type="button"
      className={styles.waveformButton}
      aria-label={`Phóng lớn ${waveform.caption}`}
      onClick={() => onOpen(waveform)}
    >
      <Image
        src={waveform.src}
        alt={waveform.alt}
        width={waveform.width}
        height={waveform.height}
        sizes="(max-width: 720px) 76vw, 260px"
        className={styles.waveformThumbnail}
      />
      <span>Xem dạng sóng</span>
    </button>
  );
}

function BlockVisual({ block }: { block: Dvor1150BlockDefinition }) {
  if (hasRebuiltFaceplate(block.id)) {
    return (
      <figure className={styles.faceplateFigure}>
        <Dvor1150ModuleFaceplate blockId={block.id} />
        <figcaption>
          {block.id === "frequency-synthesizer"
            ? "Figure 3-40"
            : block.id === "sideband-generator"
              ? "Figure 3-41"
              : "Figure 1-4 / Table 3-6"}
        </figcaption>
      </figure>
    );
  }

  const functional = ["csb-power-amplifier", "audio-generator", "rf-monitor", "monitor-cca"].includes(block.id);
  if (functional) {
    return (
      <figure className={styles.functionalFigure}>
        <FunctionalDiagram blockId={block.id} />
        <figcaption>Sơ đồ chức năng dựng từ manual</figcaption>
      </figure>
    );
  }

  return (
    <div className={styles.detailPlaceholder}>
      <span>{block.shortName}</span>
      <strong>{block.name}</strong>
      <p>Manual không cung cấp bản vẽ mặt trước riêng cho cụm này trong tệp hiện có.</p>
    </div>
  );
}

function DetailPanel({ block }: { block: Dvor1150BlockDefinition }) {
  const [activeWaveform, setActiveWaveform] = useState<Dvor1150WaveformReference | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeWaveform) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveWaveform(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [activeWaveform]);

  const waveforms = useMemo(() => {
    const unique = new Map<string, Dvor1150WaveformReference>();
    block.testPoints.forEach((point) => {
      if (point.waveform) unique.set(point.waveform.src, point.waveform);
    });
    return [...unique.values()];
  }, [block]);

  return (
    <section className={styles.detailPanel} aria-labelledby="dvor1150-selected-block">
      <header className={styles.detailHeader}>
        <h2 id="dvor1150-selected-block">{block.name}</h2>
        {block.assemblyIds.length > 0 ? (
          <div className={styles.assemblyIds}>{block.assemblyIds.map((id) => <span key={id}>{id}</span>)}</div>
        ) : null}
      </header>

      <div className={styles.detailGrid}>
        <BlockVisual block={block} />
        <div className={styles.manualPanel}>
          <p className={styles.blockDescription}>{block.description}</p>

          {block.indicators.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Chỉ thị</h3>
              <ul>{block.indicators.map((indicator) => <li key={indicator}>{indicator}</li>)}</ul>
            </section>
          ) : null}

          {block.controls.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Điều khiển và đầu nối</h3>
              <ul>{block.controls.map((control) => <li key={control}>{control}</li>)}</ul>
            </section>
          ) : null}

          {block.testPoints.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Điểm đo và tín hiệu</h3>
              <dl>
                {block.testPoints.map((point) => (
                  <div key={`${point.id}-${point.label}`}>
                    <dt>{point.id}</dt>
                    <dd><strong>{point.label}</strong><span>{point.description}</span></dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {waveforms.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Waveform từ Chapter 7</h3>
              <div className={styles.waveformGrid}>
                {waveforms.map((waveform) => <WaveformButton key={waveform.src} waveform={waveform} onOpen={setActiveWaveform} />)}
              </div>
            </section>
          ) : null}

          {block.notes?.map((note) => <p key={note} className={styles.manualNote}>{note}</p>)}
          <p className={styles.manualReference}>{block.manualReference}</p>
        </div>
      </div>

      {activeWaveform ? (
        <div
          className={styles.waveformBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveWaveform(null);
          }}
        >
          <section className={styles.waveformDialog} role="dialog" aria-modal="true" aria-labelledby="dvor1150-waveform-title">
            <header>
              <div><h3 id="dvor1150-waveform-title">{activeWaveform.caption}</h3><span>{activeWaveform.source}</span></div>
              <button ref={closeRef} type="button" onClick={() => setActiveWaveform(null)}>Đóng ×</button>
            </header>
            <Image
              src={activeWaveform.src}
              alt={activeWaveform.alt}
              width={activeWaveform.width}
              height={activeWaveform.height}
              sizes="(max-width: 720px) 92vw, 900px"
              className={styles.waveformLarge}
              priority
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function Dvor1150BlockDiagram() {
  const [surface, setSurface] = useState<Dvor1150CabinetSurface>("electronics");
  const [selectedBlockId, setSelectedBlockId] = useState<Dvor1150BlockId | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedCabinetHotspotIds, setSelectedCabinetHotspotIds] = useState<ReadonlySet<string>>(new Set());
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedBlock = selectedBlockId ? DVOR_1150_BLOCK_BY_ID.get(selectedBlockId) ?? null : null;

  function selectDiagramBlock(blockId: Dvor1150BlockId, occurrence: Dvor1150DiagramOccurrence) {
    const block = DVOR_1150_BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(occurrence.id);
    setSelectedCabinetHotspotIds(new Set(occurrence.targetCabinetHotspotIds));
    const firstTarget = block.cabinetHotspots.find((hotspot) => occurrence.targetCabinetHotspotIds.includes(hotspot.id));
    if (firstTarget) setSurface(firstTarget.surface);
  }

  function selectCabinetBlock(blockId: Dvor1150BlockId, hotspot: Dvor1150CabinetHotspot) {
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(null);
    setSelectedCabinetHotspotIds(new Set([hotspot.id]));
    setSurface(hotspot.surface);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className={styles.page}>
      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-label="Vị trí thiết bị DVOR 1150">
          <div className={styles.surfaceTabs} role="tablist" aria-label="Chọn cabinet hoặc rack">
            {(Object.keys(surfaceLabels) as Dvor1150CabinetSurface[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={surface === item}
                onClick={() => setSurface(item)}
              >
                {surfaceLabels[item]}
              </button>
            ))}
          </div>
          <Dvor1150Cabinet surface={surface} selectedHotspotIds={selectedCabinetHotspotIds} onSelect={selectCabinetBlock} />
        </section>

        <section className={styles.viewerPanel} aria-label="Sơ đồ khối DVOR 1150">
          <Dvor1150SystemDiagram selectedOccurrenceId={selectedOccurrenceId} onSelect={selectDiagramBlock} />
        </section>
      </div>

      <div ref={detailRef}>{selectedBlock ? <DetailPanel block={selectedBlock} /> : null}</div>
    </main>
  );
}

export const DVOR_1150_BLOCK_COUNT = DVOR_1150_BLOCKS.length;
