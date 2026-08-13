"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ADSB_BLOCK_BY_ID,
  type AdsbBlockDefinition,
  type AdsbBlockId,
  type AdsbDiagramOccurrence,
  type AdsbInstallationHotspot,
} from "./block-diagram-data";
import { AdsbEquipmentVisual } from "./adsb-equipment-visuals";
import { AdsbInstallation } from "./adsb-installation";
import { AdsbSystemDiagram } from "./adsb-system-diagram";
import styles from "./adsb-block-diagram.module.css";

const statusLabels: Record<AdsbBlockDefinition["status"], string> = {
  required: "CORE DEVICE",
  optional: "OPTIONAL",
  conditional: "CONDITIONAL",
  recommended: "RECOMMENDED",
  site: "SITE INFRASTRUCTURE",
};

function formatSource(block: AdsbBlockDefinition, index: number) {
  const item = block.sources[index];
  if (!item) return "";
  return [
    item.section,
    item.figure,
    `PDF p.${item.pdfPage} / printed p.${item.printedPage}`,
    item.note,
  ].filter(Boolean).join(" · ");
}

function DetailPanel({ block, headingRef }: { block: AdsbBlockDefinition; headingRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <section className={styles.detailPanel} aria-labelledby="adsb-selected-block">
      <header className={styles.detailHeader}>
        <div>
          <p>Thiết bị đang chọn</p>
          <h2 ref={headingRef} tabIndex={-1} id="adsb-selected-block">{block.name}</h2>
        </div>
        <div className={styles.detailBadges}>
          <span>OUTDOOR SYSTEM</span>
          <span data-optional={block.status !== "required" || undefined}>{statusLabels[block.status]}</span>
        </div>
      </header>

      <div className={styles.detailGrid}>
        <figure className={styles.equipmentFigure}>
          <AdsbEquipmentVisual blockId={block.id} />
          <figcaption>{block.visualCaption} · SVG dựng lại từ manual</figcaption>
        </figure>

        <div className={styles.manualPanel}>
          <p className={styles.blockDescription}>{block.description}</p>

          {block.connectors.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Đầu nối / giao diện</h3>
              <ol className={styles.connectorList}>
                {block.connectors.map((connector) => (
                  <li key={connector.id}>
                    <strong>{connector.position ? `${connector.position}. ` : ""}{connector.label}</strong>
                    <span>{connector.type} · {connector.description}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {block.limits.length > 0 ? (
            <section className={styles.manualSection}>
              <h3>Giới hạn lắp đặt</h3>
              <ul className={styles.limitList}>
                {block.limits.map((limit) => (
                  <li key={limit.id}>
                    <strong>{limit.label}: {limit.value}</strong>
                    <span>{limit.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {block.notes.map((note) => <p key={note} className={styles.manualNote}>{note}</p>)}

          <ul className={styles.sourceList}>
            {block.sources.map((_, index) => <li key={formatSource(block, index)}>{formatSource(block, index)}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function AdsbBlockDiagram() {
  const [selectedBlockId, setSelectedBlockId] = useState<AdsbBlockId | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedInstallationHotspotIds, setSelectedInstallationHotspotIds] = useState<ReadonlySet<string>>(new Set());
  const detailRef = useRef<HTMLDivElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const selectedBlock = selectedBlockId ? ADSB_BLOCK_BY_ID.get(selectedBlockId) ?? null : null;

  useEffect(() => {
    if (!selectedBlockId) return;
    detailHeadingRef.current?.focus({ preventScroll: true });
  }, [selectedBlockId]);

  function selectDiagramBlock(blockId: AdsbBlockId, occurrence: AdsbDiagramOccurrence) {
    const block = ADSB_BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(occurrence.id);
    setSelectedInstallationHotspotIds(new Set(occurrence.targetInstallationHotspotIds));
  }

  function selectInstallationBlock(blockId: AdsbBlockId, hotspot: AdsbInstallationHotspot) {
    const block = ADSB_BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setSelectedBlockId(blockId);
    setSelectedOccurrenceId(block.diagramOccurrences[0]?.id ?? null);
    setSelectedInstallationHotspotIds(new Set([hotspot.id]));
    requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      detailRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>COMSOFT Quadrant · Outdoor installation</p>
          <h1>Sơ đồ khối ADS-B ngoài trời</h1>
          <p className={styles.pageSummary}>
            Chọn trực tiếp một thiết bị hoặc điểm kết nối hạ tầng trên topology và mô hình lắp đặt để đối chiếu vị trí, đầu nối, giới hạn cable. Cable và kết cấu gá chỉ được thể hiện như quan hệ lắp đặt.
          </p>
        </div>
        <div className={styles.sourceBadge}>
          <strong>Nguồn kỹ thuật chính</strong>
          <span>Hardware and Installation Guide V1.5</span>
          <span>Derived from Figures 2 &amp; 20</span>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.viewerPanel} aria-labelledby="adsb-installation-heading">
          <header className={styles.panelHeader}>
            <h2 id="adsb-installation-heading">Mô hình lắp đặt trên mast</h2>
            <span>8 thiết bị chọn được</span>
          </header>
          <AdsbInstallation
            selectedHotspotIds={selectedInstallationHotspotIds}
            onSelect={selectInstallationBlock}
          />
        </section>

        <section className={styles.viewerPanel} aria-labelledby="adsb-system-heading">
          <header className={styles.panelHeader}>
            <h2 id="adsb-system-heading">Outdoor functional topology</h2>
            <span>RF · GPS · LAN · POWER</span>
          </header>
          <AdsbSystemDiagram
            selectedOccurrenceId={selectedOccurrenceId}
            onSelect={selectDiagramBlock}
          />
        </section>
      </div>

      <div ref={detailRef}>
        {selectedBlock ? (
          <DetailPanel block={selectedBlock} headingRef={detailHeadingRef} />
        ) : (
          <section className={styles.emptyDetail} aria-live="polite">
            <div>
              <strong>Chưa chọn thiết bị</strong>
              <span>Chọn một block trên sơ đồ hoặc một vị trí trên mô hình lắp đặt để mở thông tin manual.</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
