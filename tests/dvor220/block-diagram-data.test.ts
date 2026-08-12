import { describe, expect, it } from "vitest";

import {
  DVOR_220_BLOCKS,
  DVOR_220_COMPONENT_TO_BLOCK,
  DVOR_220_HOTSPOT_TO_BLOCK,
} from "@/modules/operations/dvor-220/block-diagram-data";

describe("DVOR 220 block diagram catalog", () => {
  it("uses globally unique block, diagram occurrence and cabinet hotspot ids", () => {
    const blockIds = DVOR_220_BLOCKS.map((block) => block.id);
    const occurrenceIds = DVOR_220_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => item.id));
    const componentIds = DVOR_220_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => item.componentId));
    const hotspotIds = DVOR_220_BLOCKS.flatMap((block) => block.cabinetHotspots.map((item) => item.id));

    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(new Set(occurrenceIds).size).toBe(occurrenceIds.length);
    expect(new Set(componentIds).size).toBe(componentIds.length);
    expect(new Set(hotspotIds).size).toBe(hotspotIds.length);
  });

  it("maps every occurrence and hotspot back to its owning block", () => {
    for (const block of DVOR_220_BLOCKS) {
      for (const occurrence of block.diagramOccurrences) {
        expect(DVOR_220_COMPONENT_TO_BLOCK.get(occurrence.componentId)).toBe(block.id);
      }
      for (const hotspot of block.cabinetHotspots) {
        expect(DVOR_220_HOTSPOT_TO_BLOCK.get(hotspot.id)).toBe(block.id);
      }
    }
  });

  it("keeps occurrence targets attached to real cabinet hotspots", () => {
    const hotspotIds = new Set(DVOR_220_BLOCKS.flatMap((block) => block.cabinetHotspots.map((item) => item.id)));
    const targetIds = DVOR_220_BLOCKS.flatMap((block) => block.diagramOccurrences.flatMap((item) => item.targetCabinetHotspotIds));

    expect(targetIds.length).toBeGreaterThan(0);
    expect(targetIds.every((id) => hotspotIds.has(id))).toBe(true);
  });

  it("provides independent TX1 and TX2 cabinet targets for duplicated transmitter LRUs", () => {
    for (const blockId of ["sma-lsb", "cma", "sma-usb", "dcdc-tx", "msg", "syn", "mon", "fan"] as const) {
      const block = DVOR_220_BLOCKS.find((item) => item.id === blockId);
      expect(block).toBeDefined();
      expect(block?.cabinetHotspots.some((item) => item.id.includes("tx1"))).toBe(true);
      expect(block?.cabinetHotspots.some((item) => item.id.includes("tx2"))).toBe(true);
    }
  });
});
