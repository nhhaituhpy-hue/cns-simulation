import { describe, expect, it } from "vitest";

import {
  DME_320_BLOCK_BY_ID,
  DME_320_BLOCKS,
  DME_320_COMPONENT_TO_BLOCK,
  DME_320_HOTSPOT_TO_BLOCK,
} from "@/modules/operations/dme-320/block-diagram-data";

describe("DME 320 block diagram catalog", () => {
  it("uses globally unique block, diagram occurrence, component and cabinet hotspot ids", () => {
    const blockIds = DME_320_BLOCKS.map((block) => block.id);
    const occurrenceIds = DME_320_BLOCKS.flatMap((block) =>
      block.diagramOccurrences.map((item) => item.id),
    );
    const componentIds = DME_320_BLOCKS.flatMap((block) =>
      block.diagramOccurrences.map((item) => item.componentId),
    );
    const hotspotIds = DME_320_BLOCKS.flatMap((block) =>
      block.cabinetHotspots.map((item) => item.id),
    );

    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(new Set(occurrenceIds).size).toBe(occurrenceIds.length);
    expect(new Set(componentIds).size).toBe(componentIds.length);
    expect(new Set(hotspotIds).size).toBe(hotspotIds.length);
  });

  it("maps every block, occurrence and hotspot back to its owning block", () => {
    for (const block of DME_320_BLOCKS) {
      expect(DME_320_BLOCK_BY_ID.get(block.id)).toBe(block);

      for (const occurrence of block.diagramOccurrences) {
        expect(DME_320_COMPONENT_TO_BLOCK.get(occurrence.componentId)).toBe(block.id);
      }

      for (const hotspot of block.cabinetHotspots) {
        expect(DME_320_HOTSPOT_TO_BLOCK.get(hotspot.id)).toBe(block.id);
      }
    }
  });

  it("keeps every occurrence target attached to a real cabinet hotspot", () => {
    const hotspotIds = new Set(
      DME_320_BLOCKS.flatMap((block) =>
        block.cabinetHotspots.map((item) => item.id),
      ),
    );
    const targetIds = DME_320_BLOCKS.flatMap((block) =>
      block.diagramOccurrences.flatMap((item) => item.targetCabinetHotspotIds),
    );

    expect(targetIds.length).toBeGreaterThan(0);
    expect(targetIds.every((id) => hotspotIds.has(id))).toBe(true);
  });

  it("keeps independent TX1 and TX2 cabinet targets for duplicated transponder LRUs", () => {
    const duplicatedTransponderBlockIds = [
      "dpx-msc",
      "rxu",
      "hpa",
      "txu",
      "dcdc",
      "tcu",
      "rfg",
    ] as const;

    for (const blockId of duplicatedTransponderBlockIds) {
      const block = DME_320_BLOCK_BY_ID.get(blockId);
      expect(block).toBeDefined();

      const tx1HotspotIds = new Set(
        block?.cabinetHotspots
          .filter((hotspot) => hotspot.id.includes("tx1"))
          .map((hotspot) => hotspot.id),
      );
      const tx2HotspotIds = new Set(
        block?.cabinetHotspots
          .filter((hotspot) => hotspot.id.includes("tx2"))
          .map((hotspot) => hotspot.id),
      );
      const occurrenceTargetIds = new Set(
        block?.diagramOccurrences.flatMap((occurrence) => occurrence.targetCabinetHotspotIds),
      );

      expect(tx1HotspotIds.size).toBeGreaterThan(0);
      expect(tx2HotspotIds.size).toBeGreaterThan(0);
      expect([...tx1HotspotIds].every((id) => occurrenceTargetIds.has(id))).toBe(true);
      expect([...tx2HotspotIds].every((id) => occurrenceTargetIds.has(id))).toBe(true);
      expect([...tx1HotspotIds].some((id) => tx2HotspotIds.has(id))).toBe(false);
    }
  });

  it("maps MON 1 and MON 2 occurrences to separate cabinet modules", () => {
    const monitor = DME_320_BLOCK_BY_ID.get("mon");
    expect(monitor).toBeDefined();

    const targetsFor = (componentId: string) =>
      monitor?.diagramOccurrences.find((item) => item.componentId === componentId)
        ?.targetCabinetHotspotIds;

    expect(targetsFor("overview-mon1")).toEqual(["front-tx1-mon"]);
    expect(targetsFor("overview-mon2")).toEqual(["front-tx2-mon"]);
    expect(targetsFor("monitor-mon1")).toEqual(["front-tx1-mon"]);
    expect(targetsFor("monitor-mon2")).toEqual(["front-tx2-mon"]);
  });
});
