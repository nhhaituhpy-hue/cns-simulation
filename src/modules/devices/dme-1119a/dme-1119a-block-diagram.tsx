"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Dme1119aBlockDefinition,
  Dme1119aBlockId,
  Dme1119aCabinetHotspot,
  Dme1119aCabinetSurface,
  Dme1119aDiagramOccurrence,
  Dme1119aWaveformReference,
} from "./block-diagram-data";
import {
  DME_1119A_BLOCK_BY_ID,
  DME_1119A_BLOCKS,
} from "./block-diagram-data";
import { Dme1119aCabinet } from "./dme-1119a-cabinet";
import { Dme1119aModuleFaceplate } from "./dme-1119a-module-faceplates";
import { Dme1119aSystemDiagram } from "./dme-1119a-system-diagram";
import styles from "./dme-1119a-block-diagram.module.css";

const surfaceLabels: Record<Dme1119aCabinetSurface, string> = {
  front: "Front Cabinet",
  rear: "Rear Cabinet",
  side: "Side View",
};

function WaveformButton({ waveform, onOpen }: { waveform: Dme1119aWaveformReference; onOpen: (waveform: Dme1119aWaveformReference) => void }) {
  return (
    <button type="button" className={styles.waveformButton} aria-label={`Phóng lớn ${waveform.caption}`} onClick={() => onOpen(waveform)}>
      <Image src={waveform.src} alt={waveform.alt} width={waveform.width} height={waveform.height} sizes="(max-width: 720px) 76vw, 260px" className={styles.waveformThumbnail} />
      <span>Xem dạng sóng</span>
    </button>
  );
}

function BlockVisual({ block }: { block: Dme1119aBlockDefinition }) {
  if (block.faceplate) {
    return (
      <figure className={styles.faceplateFigure} data-wide={block.faceplate === "lcu" || block.faceplate === "status-panel" || block.faceplate === "interface" || block.faceplate === "bcps" || block.faceplate === "rf-assembly" || undefined}>
        <Dme1119aModuleFaceplate kind={block.faceplate} blockId={block.id} />
        <figcaption>{block.manualReference.split(";")[0]}</figcaption>
      </figure>
    );
  }

  return (
    <div className={styles.detailPlaceholder}>
      <span>{block.shortName}</span>
      <strong>{block.name}</strong>
      <p>Khối nằm ngoài cabinet hoặc manual không cung cấp một mặt panel LRU riêng.</p>
    </div>
  );
}

function DetailPanel({ block }: { block: Dme1119aBlockDefinition }) {
  const [activeWaveform, setActiveWaveform] = useState<Dme1119aWaveformReference | null>(null);
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
    const unique = new Map<string, Dme1119aWaveformReference>();
    block.testPoints.forEach((point) => point.waveforms?.forEach((waveform) => unique.set(waveform.src, waveform)));
    return [...unique.values()];
  }, [block]);

  return (
    <section className={styles.detailPanel} aria-labelledby="dme1119a-selected-block">
      <header className={styles.detailHeader}>
        <h2 id="dme1119a-selected-block">{block.name}</h2>
        {block.assemblyIds.length > 0 ? <div className={styles.assemblyIds}>{block.assemblyIds.map((id) => <span key={id}>{id}</span>)}</div> : null}
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
              <dl>{block.testPoints.map((point) => <div key={`${point.id}-${point.label}`}><dt>{point.id}</dt><dd><strong>{point.label}</strong><span>{point.description}</span></dd></div>)}</dl>
            </section>
          ) : null}
          {waveforms.length > 0 ? <section className={styles.manualSection}><h3>Waveform từ Chapter 7</h3><div className={styles.waveformGrid}>{waveforms.map((waveform) => <WaveformButton key={waveform.src} waveform={waveform} onOpen={setActiveWaveform} />)}</div></section> : null}
          {block.notes?.map((note) => <p key={note} className={styles.manualNote}>{note}</p>)}
          <p className={styles.manualReference}>{block.manualReference}</p>
        </div>
      </div>

      {activeWaveform ? (
        <div className={styles.waveformBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveWaveform(null); }}>
          <section className={styles.waveformDialog} role="dialog" aria-modal="true" aria-labelledby="dme1119a-waveform-title">
            <header><div><h3 id="dme1119a-waveform-title">{activeWaveform.caption}</h3><span>{activeWaveform.source}</span></div><button ref={closeRef} type="button" onClick={() => setActiveWaveform(null)}>Đóng ×</button></header>
            <Image src={activeWaveform.src} alt={activeWaveform.alt} width={activeWaveform.width} height={activeWaveform.height} sizes="(max-width: 720px) 92vw, 900px" className={styles.waveformLarge} priority />
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function Dme1119aBlockDiagram() {
  const [surface, setSurface] = useState<Dme1119aCabinetSurface>("front");
  const [selectedBlockId, setSelectedBlockId] = useState<Dme1119aBlockId | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedCabinetHotspotIds, setSelectedCabinetHotspotIds] = useState<ReadonlySet<string>>(new Set());
  const detailRef = useRef<HTMLDivElement>(null);
  const selectedBlock = selectedBlockId ? DME_1119A_BLOCK_BY_ID.get(selectedBlockId) ?? null : null;

  function selectDiagramBlock(blockId: Dme1119aBlockId, occurrence: Dme1119aDiagramOccurrence) {
    const block = DME_1119A_BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(occurrence.id);
    setSelectedCabinetHotspotIds(new Set(occurrence.targetCabinetHotspotIds));
    const firstTarget = DME_1119A_BLOCKS
      .flatMap((item) => item.cabinetHotspots)
      .find((item) => occurrence.targetCabinetHotspotIds.includes(item.id));
    if (firstTarget) setSurface(firstTarget.surface);
  }

  function selectCabinetBlock(blockId: Dme1119aBlockId, hotspot: Dme1119aCabinetHotspot) {
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(null);
    setSelectedCabinetHotspotIds(new Set([hotspot.id]));
    setSurface(hotspot.surface);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className={styles.page}>
      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-label="Vị trí thiết bị DME 1119A">
          <div className={styles.surfaceTabs} role="tablist" aria-label="Chọn mặt cabinet">
            {(Object.keys(surfaceLabels) as Dme1119aCabinetSurface[]).map((item) => <button key={item} type="button" role="tab" aria-selected={surface === item} onClick={() => setSurface(item)}>{surfaceLabels[item]}</button>)}
          </div>
          <Dme1119aCabinet surface={surface} selectedHotspotIds={selectedCabinetHotspotIds} onSelect={selectCabinetBlock} />
        </section>
        <section className={styles.viewerPanel} aria-label="Sơ đồ khối DME 1119A">
          <Dme1119aSystemDiagram selectedOccurrenceId={selectedOccurrenceId} onSelect={selectDiagramBlock} />
        </section>
      </div>
      <div ref={detailRef}>{selectedBlock ? <DetailPanel block={selectedBlock} /> : null}</div>
    </main>
  );
}
