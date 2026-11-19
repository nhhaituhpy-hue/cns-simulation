"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  Dvor220BlockDefinition,
  Dvor220BlockId,
  Dvor220CabinetHotspot,
  Dvor220CabinetSurface,
  Dvor220DiagramOccurrence,
  Dvor220TestPoint,
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

const wideFaceplates = new Set(["lmi", "fan", "pdc", "quint-divider", "power-switch", "pmu", "acdc", "asu"]);

function WaveformButton({ waveform, onOpen }: { waveform: Dvor220WaveformReference; onOpen: (waveform: Dvor220WaveformReference) => void }) {
  return (
    <button type="button" className={styles.waveformButton} aria-label={`Phóng lớn ${waveform.caption}`} onClick={() => onOpen(waveform)}>
      <Image src={waveform.src} alt={waveform.alt} width={waveform.width} height={waveform.height} sizes="(max-width: 720px) 76vw, 260px" className={styles.waveformThumbnail} />
      <span>{waveform.caption}</span>
    </button>
  );
}

function BlockVisual({ block, onSelectPoint }: { block: Dvor220BlockDefinition; onSelectPoint: (point: Dvor220TestPoint) => void }) {
  if (block.faceplate) {
    return (
      <figure className={styles.faceplateFigure} data-wide={wideFaceplates.has(block.faceplate) || undefined}>
        <Dvor220ModuleFaceplate kind={block.faceplate} blockId={block.id} onSelectPoint={onSelectPoint} />
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

function MeasurementReferenceDialog({ point, initialWaveform, fallbackSource, onDismiss }: { point: Dvor220TestPoint; initialWaveform?: Dvor220WaveformReference; fallbackSource: string; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const noticeId = useId();
  const [waveform, setWaveform] = useState(initialWaveform ?? point.waveforms?.[0]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      // React removes the dialog on dismissal/unmount. Closing here would also
      // close it during StrictMode's effect replay.
      if (previousFocus?.isConnected && (previousFocus instanceof HTMLElement || previousFocus instanceof SVGElement)) previousFocus.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.waveformDialog} aria-labelledby={titleId} aria-describedby={noticeId}
      onCancel={(event) => { event.preventDefault(); dialogRef.current?.close(); }} onClose={onDismiss}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
      }}>
      <header>
        <h3 id={titleId}>{point.id} · {point.label}</h3>
        <button ref={closeRef} type="button" onClick={() => dialogRef.current?.close()}>Đóng ×</button>
      </header>
      <p id={noticeId} className={styles.referenceNotice}>Tham chiếu từ manual · không phải số đo trực tiếp.</p>
      <p>{point.description}</p>
      <dl className={styles.measurementFacts}>
        <div><dt>Thiết bị đo</dt><dd>{point.instrument ?? "Chưa có thông tin thiết bị đo trong dữ liệu tham chiếu."}</dd></div>
        {point.signalType ? <div><dt>Loại tín hiệu</dt><dd>{point.signalType}</dd></div> : null}
        <div><dt>Giá trị tham chiếu</dt><dd>{point.nominal ?? "Chưa có giá trị danh định được xác minh cho điểm này."}</dd></div>
        <div><dt>Dung sai / giới hạn</dt><dd>{point.tolerance ?? "Chưa có dung sai được xác minh; không suy ra giới hạn từ ảnh chụp."}</dd></div>
      </dl>
      {point.conditions?.length ? <section className={styles.referenceSection}><h4>Điều kiện đo</h4><ul>{point.conditions.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
      <p className={styles.pointSource}>Nguồn điểm đo: <cite>{point.source ?? fallbackSource}</cite></p>
      {(point.waveforms?.length ?? 0) > 1 ? <div className={styles.waveformChoices} role="group" aria-label="Chọn dạng sóng tham chiếu">
        {point.waveforms?.map((item) => <button type="button" key={item.src} aria-pressed={waveform?.src === item.src} onClick={() => setWaveform(item)}>{item.caption}</button>)}
      </div> : null}
      {waveform ? <>
        <figure className={styles.referenceWaveform}>
          <Image src={waveform.src} alt={waveform.alt} width={waveform.width} height={waveform.height} sizes="(max-width: 720px) 92vw, 900px" className={styles.waveformLarge} priority />
          <figcaption>{waveform.caption}<cite>{waveform.source}</cite></figcaption>
        </figure>
        {waveform.scopeSettings?.length ? <section className={styles.referenceSection}><h4>Cài đặt scope trong ảnh</h4><ul>{waveform.scopeSettings.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
        {waveform.observedReadings?.length ? <section className={styles.referenceSection}><h4>Số đọc trên ảnh · không phải giới hạn hãng</h4><ul>{waveform.observedReadings.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
      </> : <p className={styles.referenceNotice}>Chưa có ảnh waveform tham chiếu cho điểm này. Dùng thiết bị đo và điều kiện nêu trên; giao diện không tạo số đo.</p>}
    </dialog>
  );
}

function DetailPanel({ block }: { block: Dvor220BlockDefinition }) {
  const [activeReference, setActiveReference] = useState<{ point: Dvor220TestPoint; waveform?: Dvor220WaveformReference } | null>(null);
  const headingId = useId();

  const waveforms = useMemo(() => {
    const unique = new Map<string, Dvor220WaveformReference>();
    block.testPoints.forEach((point) => point.waveforms?.forEach((waveform) => unique.set(waveform.src, waveform)));
    return [...unique.values()];
  }, [block]);

  return (
    <section className={styles.detailPanel} aria-labelledby={headingId}>
      <header className={styles.detailHeader}>
        <h2 id={headingId}>{block.name}</h2>
        <div className={styles.assemblyIds}>
          {block.assemblyIds.map((id) => <span key={id}>{id}</span>)}
          {block.partNumber ? <span>P/N {block.partNumber}</span> : null}
        </div>
      </header>
      <div className={styles.detailGrid}>
        <BlockVisual block={block} onSelectPoint={(point) => setActiveReference({ point })} />
        <div className={styles.manualPanel}>
          <p className={styles.blockDescription}>{block.description}</p>
          {block.indicators.length > 0 ? <section className={styles.manualSection}><h3>Chỉ thị</h3><ul>{block.indicators.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {block.controls.length > 0 ? <section className={styles.manualSection}><h3>Điều khiển và đầu nối</h3><ul>{block.controls.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {block.testPoints.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Điểm đo và tín hiệu</h3>
              <dl>{block.testPoints.map((point, index) => <div key={`${point.id}-${point.label}-${index}`}><dt>{point.id}</dt><dd><strong>{point.label}</strong><span>{point.description}</span><button type="button" className={styles.pointReferenceButton} aria-label={`Xem tín hiệu ${point.id} ${point.label}`} onClick={() => setActiveReference({ point })}>Xem tín hiệu</button></dd></div>)}</dl>
            </section>
          ) : null}
          {waveforms.length > 0 ? <section className={styles.manualSection}><h3>Waveform nguyên gốc từ manual</h3><div className={styles.waveformGrid}>{waveforms.map((waveform) => <WaveformButton key={waveform.src} waveform={waveform} onOpen={(selected) => {
            const point = block.testPoints.find((item) => item.waveforms?.some((itemWaveform) => itemWaveform.src === selected.src));
            if (point) setActiveReference({ point, waveform: selected });
          }} />)}</div></section> : null}
          {block.adjustments?.length ? <section className={styles.manualSection} aria-label="Tham chiếu hiệu chỉnh">
            <h3>Tham chiếu hiệu chỉnh</h3>
            <p className={styles.calibrationNotice}>Tham chiếu từ manual · Không mô phỏng thao tác hiệu chỉnh; không thay đổi thông số hoặc số đo đang chạy.</p>
            {block.adjustments.map((item) => <article key={item.id} className={styles.calibrationReference}>
              <h4>{item.label}</h4>
              <dl>
                <div><dt>Điều khiển / phần mềm</dt><dd>{item.control}</dd></div>
                <div><dt>Thiết bị đo</dt><dd>{item.instrument}</dd></div>
                <div><dt>Mục tiêu tham chiếu</dt><dd>{item.target}</dd></div>
              </dl>
              <ul>{item.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
              <cite>{item.source}</cite>
            </article>)}
          </section> : null}
          {block.notes?.map((note) => <p key={note} className={styles.manualNote}>{note}</p>)}
          <p className={styles.manualReference}>{block.manualReference}</p>
        </div>
      </div>

      {activeReference ? <MeasurementReferenceDialog point={activeReference.point} initialWaveform={activeReference.waveform} fallbackSource={block.manualReference} onDismiss={() => setActiveReference(null)} /> : null}
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
      <div ref={detailRef}>{selectedBlock ? <DetailPanel key={`${selectedBlock.id}-${selectedOccurrenceId ?? [...selectedCabinetHotspotIds].join(":")}`} block={selectedBlock} /> : null}</div>
    </main>
  );
}
