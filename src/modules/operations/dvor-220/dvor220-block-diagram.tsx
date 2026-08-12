"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Dvor220BlockDefinition,
  Dvor220BlockId,
  Dvor220CabinetHotspot,
  Dvor220CabinetSurface,
  Dvor220DiagramOccurrence,
  Dvor220WaveformReference,
} from "./block-diagram-data";
import {
  DVOR_220_BLOCK_BY_ID,
  DVOR_220_BLOCKS,
} from "./block-diagram-data";
import { Dvor220Cabinet } from "./dvor220-cabinet";
import { Dvor220ModuleFaceplate } from "./dvor220-module-faceplates";
import { Dvor220SystemDiagram } from "./dvor220-system-diagram";
import styles from "./dvor220-block-diagram.module.css";

const surfaceLabels: Record<Dvor220CabinetSurface, string> = {
  front: "Front Cabinet",
  rear: "Rear Cabinet",
  asu: "ASU",
};

const wideFaceplates = new Set(["lmi", "fan", "pdc", "power-switch", "pmu", "acdc", "asu"]);

function WaveformButton({ waveform, onOpen }: { waveform: Dvor220WaveformReference; onOpen: (waveform: Dvor220WaveformReference) => void }) {
  return (
    <button type="button" className={styles.waveformButton} aria-label={`Phóng lớn ${waveform.caption}`} onClick={() => onOpen(waveform)}>
      <Image src={waveform.src} alt={waveform.alt} width={waveform.width} height={waveform.height} sizes="(max-width: 720px) 76vw, 260px" className={styles.waveformThumbnail} />
      <span>{waveform.caption}</span>
    </button>
  );
}

function BlockVisual({ block }: { block: Dvor220BlockDefinition }) {
  if (block.faceplate) {
    return (
      <figure className={styles.faceplateFigure} data-wide={wideFaceplates.has(block.faceplate) || undefined}>
        <Dvor220ModuleFaceplate kind={block.faceplate} blockId={block.id} />
        <figcaption>{block.manualReference.split(";")[0]}</figcaption>
      </figure>
    );
  }

  return (
    <div className={styles.detailPlaceholder}>
      <span>{block.shortName}</span>
      <strong>{block.name}</strong>
      <p>Khối nằm ngoài cabinet chính hoặc manual không cung cấp một faceplate LRU riêng.</p>
    </div>
  );
}

function DetailPanel({ block }: { block: Dvor220BlockDefinition }) {
  const [activeWaveform, setActiveWaveform] = useState<Dvor220WaveformReference | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeWaveform) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      previousFocus?.focus();
    };
  }, [activeWaveform]);

  const waveforms = useMemo(() => {
    const unique = new Map<string, Dvor220WaveformReference>();
    block.testPoints.forEach((point) => point.waveforms?.forEach((waveform) => unique.set(waveform.src, waveform)));
    return [...unique.values()];
  }, [block]);

  return (
    <section className={styles.detailPanel} aria-labelledby="dvor220-selected-block">
      <header className={styles.detailHeader}>
        <h2 id="dvor220-selected-block">{block.name}</h2>
        <div className={styles.assemblyIds}>
          {block.assemblyIds.map((id) => <span key={id}>{id}</span>)}
          {block.partNumber ? <span>P/N {block.partNumber}</span> : null}
        </div>
      </header>
      <div className={styles.detailGrid}>
        <BlockVisual block={block} />
        <div className={styles.manualPanel}>
          <p className={styles.blockDescription}>{block.description}</p>
          {block.indicators.length > 0 ? <section className={styles.manualSection}><h3>Chỉ thị</h3><ul>{block.indicators.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {block.controls.length > 0 ? <section className={styles.manualSection}><h3>Điều khiển và đầu nối</h3><ul>{block.controls.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {block.testPoints.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Điểm đo và tín hiệu</h3>
              <dl>{block.testPoints.map((point, index) => <div key={`${point.id}-${point.label}-${index}`}><dt>{point.id}</dt><dd><strong>{point.label}</strong><span>{point.description}</span></dd></div>)}</dl>
            </section>
          ) : null}
          {waveforms.length > 0 ? <section className={styles.manualSection}><h3>Waveform nguyên gốc từ manual</h3><div className={styles.waveformGrid}>{waveforms.map((waveform) => <WaveformButton key={waveform.src} waveform={waveform} onOpen={setActiveWaveform} />)}</div></section> : null}
          {block.notes?.map((note) => <p key={note} className={styles.manualNote}>{note}</p>)}
          <p className={styles.manualReference}>{block.manualReference}</p>
        </div>
      </div>

      {activeWaveform ? (
        <div className={styles.waveformBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveWaveform(null); }}>
          <section className={styles.waveformDialog} role="dialog" aria-modal="true" aria-labelledby="dvor220-waveform-title">
            <header>
              <div><h3 id="dvor220-waveform-title">{activeWaveform.caption}</h3><span>{activeWaveform.source}</span></div>
              <button ref={closeRef} type="button" onClick={() => setActiveWaveform(null)}>Đóng ×</button>
            </header>
            <Image src={activeWaveform.src} alt={activeWaveform.alt} width={activeWaveform.width} height={activeWaveform.height} sizes="(max-width: 720px) 92vw, 900px" className={styles.waveformLarge} priority />
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function Dvor220BlockDiagram() {
  const [surface, setSurface] = useState<Dvor220CabinetSurface>("front");
  const [selectedBlockId, setSelectedBlockId] = useState<Dvor220BlockId | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedCabinetHotspotIds, setSelectedCabinetHotspotIds] = useState<ReadonlySet<string>>(new Set());
  const detailRef = useRef<HTMLDivElement>(null);
  const selectedBlock = selectedBlockId ? DVOR_220_BLOCK_BY_ID.get(selectedBlockId) ?? null : null;

  function selectDiagramBlock(blockId: Dvor220BlockId, occurrence: Dvor220DiagramOccurrence) {
    const block = DVOR_220_BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(occurrence.id);
    setSelectedCabinetHotspotIds(new Set(occurrence.targetCabinetHotspotIds));
    const firstTarget = DVOR_220_BLOCKS
      .flatMap((item) => item.cabinetHotspots)
      .find((item) => occurrence.targetCabinetHotspotIds.includes(item.id));
    if (firstTarget) setSurface(firstTarget.surface);
  }

  function selectCabinetBlock(blockId: Dvor220BlockId, hotspot: Dvor220CabinetHotspot) {
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(null);
    setSelectedCabinetHotspotIds(new Set([hotspot.id]));
    setSurface(hotspot.surface);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className={styles.page}>
      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-label="Vị trí thiết bị DVOR 220">
          <div className={styles.surfaceTabs} role="tablist" aria-label="Chọn cabinet hoặc ASU">
            {(Object.keys(surfaceLabels) as Dvor220CabinetSurface[]).map((item) => <button key={item} type="button" role="tab" aria-selected={surface === item} onClick={() => setSurface(item)}>{surfaceLabels[item]}</button>)}
          </div>
          <Dvor220Cabinet surface={surface} selectedHotspotIds={selectedCabinetHotspotIds} onSelect={selectCabinetBlock} />
        </section>
        <section className={styles.viewerPanel} aria-label="Sơ đồ khối DVOR 220">
          <Dvor220SystemDiagram selectedOccurrenceId={selectedOccurrenceId} onSelect={selectDiagramBlock} />
        </section>
      </div>
      <div ref={detailRef}>{selectedBlock ? <DetailPanel block={selectedBlock} /> : null}</div>
    </main>
  );
}
