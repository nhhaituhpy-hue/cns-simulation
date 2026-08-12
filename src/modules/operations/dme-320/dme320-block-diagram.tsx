"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Dme320BlockDefinition,
  Dme320BlockId,
  Dme320CabinetHotspot,
  Dme320CabinetSurface,
  Dme320DiagramOccurrence,
  Dme320WaveformReference,
} from "./block-diagram-data";
import {
  DME_320_BLOCK_BY_ID,
  DME_320_BLOCKS,
} from "./block-diagram-data";
import { Dme320Cabinet } from "./dme320-cabinet";
import { Dme320ModuleFaceplate } from "./dme320-module-faceplates";
import { Dme320SystemDiagram } from "./dme320-system-diagram";
import styles from "./dme320-block-diagram.module.css";

const surfaceLabels: Record<Dme320CabinetSurface, string> = {
  front: "Front Cabinet",
  rear: "Rear Cabinet Rev. A",
};

const wideFaceplates = new Set(["lmi", "csp", "hpa", "fan", "pmu", "acdc", "ifb", "rear-rf"]);

function WaveformButton({
  waveform,
  onOpen,
}: {
  waveform: Dme320WaveformReference;
  onOpen: (waveform: Dme320WaveformReference) => void;
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
        sizes="(max-width: 720px) 76vw, 280px"
        className={styles.waveformThumbnail}
      />
      <span>{waveform.caption}</span>
    </button>
  );
}

function BlockVisual({ block }: { block: Dme320BlockDefinition }) {
  if (block.faceplate) {
    return (
      <figure
        className={styles.faceplateFigure}
        data-wide={wideFaceplates.has(block.faceplate) || undefined}
      >
        <Dme320ModuleFaceplate kind={block.faceplate} blockId={block.id} />
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

function DetailPanel({ block }: { block: Dme320BlockDefinition }) {
  const [activeWaveform, setActiveWaveform] = useState<Dme320WaveformReference | null>(null);
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
    const unique = new Map<string, Dme320WaveformReference>();
    block.testPoints.forEach((point) =>
      point.waveforms?.forEach((waveform) => unique.set(waveform.src, waveform)),
    );
    return [...unique.values()];
  }, [block]);

  return (
    <section className={styles.detailPanel} aria-labelledby="dme320-selected-block">
      <header className={styles.detailHeader}>
        <h2 id="dme320-selected-block">{block.name}</h2>
        <div className={styles.assemblyIds}>
          {block.assemblyIds.map((id) => <span key={id}>{id}</span>)}
          {block.partNumber ? <span>P/N {block.partNumber}</span> : null}
        </div>
      </header>

      <div className={styles.detailGrid}>
        <BlockVisual block={block} />
        <div className={styles.manualPanel}>
          <p className={styles.blockDescription}>{block.description}</p>

          {block.indicators.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Chỉ thị</h3>
              <ul>{block.indicators.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}

          {block.controls.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Điều khiển và đầu nối</h3>
              <ul>{block.controls.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}

          {block.testPoints.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Điểm đo và tín hiệu</h3>
              <dl>
                {block.testPoints.map((point, index) => (
                  <div key={`${point.id}-${point.label}-${index}`}>
                    <dt>{point.id}</dt>
                    <dd><strong>{point.label}</strong><span>{point.description}</span></dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {waveforms.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Waveform nguyên gốc từ manual</h3>
              <div className={styles.waveformGrid}>
                {waveforms.map((waveform) => (
                  <WaveformButton key={waveform.src} waveform={waveform} onOpen={setActiveWaveform} />
                ))}
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
          <section
            className={styles.waveformDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dme320-waveform-title"
          >
            <header>
              <div>
                <h3 id="dme320-waveform-title">{activeWaveform.caption}</h3>
                <span>{activeWaveform.source}</span>
              </div>
              <button ref={closeRef} type="button" onClick={() => setActiveWaveform(null)}>
                Đóng ×
              </button>
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

export function Dme320BlockDiagram() {
  const [surface, setSurface] = useState<Dme320CabinetSurface>("front");
  const [selectedBlockId, setSelectedBlockId] = useState<Dme320BlockId | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedCabinetHotspotIds, setSelectedCabinetHotspotIds] = useState<ReadonlySet<string>>(new Set());
  const detailRef = useRef<HTMLDivElement>(null);
  const selectedBlock = selectedBlockId ? DME_320_BLOCK_BY_ID.get(selectedBlockId) ?? null : null;

  function selectDiagramBlock(blockId: Dme320BlockId, occurrence: Dme320DiagramOccurrence) {
    const block = DME_320_BLOCK_BY_ID.get(blockId);
    if (!block) return;

    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(occurrence.id);
    setSelectedCabinetHotspotIds(new Set(occurrence.targetCabinetHotspotIds));

    const firstTarget = DME_320_BLOCKS
      .flatMap((item) => item.cabinetHotspots)
      .find((item) => occurrence.targetCabinetHotspotIds.includes(item.id));
    if (firstTarget) setSurface(firstTarget.surface);
  }

  function selectCabinetBlock(blockId: Dme320BlockId, hotspot: Dme320CabinetHotspot) {
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(null);
    setSelectedCabinetHotspotIds(new Set([hotspot.id]));
    setSurface(hotspot.surface);
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-label="Vị trí thiết bị DME 320">
          <div className={styles.surfaceTabs} role="tablist" aria-label="Chọn mặt cabinet">
            {(Object.keys(surfaceLabels) as Dme320CabinetSurface[]).map((item) => (
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
          <Dme320Cabinet
            surface={surface}
            selectedHotspotIds={selectedCabinetHotspotIds}
            onSelect={selectCabinetBlock}
          />
        </section>

        <section className={styles.viewerPanel} aria-label="Sơ đồ khối DME 320">
          <Dme320SystemDiagram
            selectedOccurrenceId={selectedOccurrenceId}
            onSelect={selectDiagramBlock}
          />
        </section>
      </div>

      <div ref={detailRef}>{selectedBlock ? <DetailPanel block={selectedBlock} /> : null}</div>
    </main>
  );
}
