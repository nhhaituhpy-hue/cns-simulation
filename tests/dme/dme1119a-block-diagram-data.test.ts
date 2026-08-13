import { describe, expect, it } from "vitest";
import {
  DME_1119A_BLOCK_BY_ID,
  DME_1119A_BLOCKS,
  DME_1119A_COMPONENT_TO_BLOCK,
  DME_1119A_HOTSPOT_TO_BLOCK,
} from "@/modules/devices/dme-1119a/block-diagram-data";

describe("DME 1119A block diagram catalog", () => {
  it("keeps Preselector and LNA as separate selectable blocks", () => {
    expect(DME_1119A_BLOCK_BY_ID.get("preselector")).toMatchObject({
      name: "DME Preselector Assembly",
      diagramOccurrences: [expect.objectContaining({ componentId: "dme-preselector" })],
    });
    expect(DME_1119A_BLOCK_BY_ID.get("low-noise-amplifier")).toMatchObject({
      name: "Low-noise Amplifier",
      diagramOccurrences: [expect.objectContaining({ componentId: "dme-lna" })],
    });
    expect(DME_1119A_COMPONENT_TO_BLOCK.get("dme-preselector")).toBe("preselector");
    expect(DME_1119A_COMPONENT_TO_BLOCK.get("dme-lna")).toBe("low-noise-amplifier");
  });

  it("exposes only Front and Rear cabinet surfaces", () => {
    const hotspots = DME_1119A_BLOCKS.flatMap((block) => block.cabinetHotspots);

    expect(new Set(hotspots.map((hotspot) => hotspot.surface))).toEqual(new Set(["front", "rear"]));
    expect(hotspots.some((hotspot) => hotspot.id.startsWith("side-"))).toBe(false);
  });

  it("matches the Figure 1-3 and Figure 1-4 cabinet placement", () => {
    const acMonitor = DME_1119A_BLOCK_BY_ID.get("ac-monitor");
    const statusPanel = DME_1119A_BLOCK_BY_ID.get("status-panel");
    const hpa1 = DME_1119A_BLOCK_BY_ID.get("hpa-1")?.cabinetHotspots[0];
    const hpa2 = DME_1119A_BLOCK_BY_ID.get("hpa-2")?.cabinetHotspots[0];

    expect(acMonitor?.cabinetHotspots).toEqual([
      expect.objectContaining({ id: "front-ac-monitor", surface: "front", assemblyId: "1A22" }),
    ]);
    expect(statusPanel?.cabinetHotspots).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "front-status-panel", assemblyId: "1A26" }),
      expect.objectContaining({ id: "rear-status-display-2", assemblyId: "1A26A2" }),
      expect.objectContaining({ id: "rear-status-display-1", assemblyId: "1A26A1" }),
    ]));
    expect(hpa1).toMatchObject({ x: 80, width: 55 });
    expect(hpa2).toMatchObject({ x: 298, width: 55 });
    expect(DME_1119A_BLOCK_BY_ID.get("tx-power-supply-1")?.cabinetHotspots[0]).toMatchObject({
      id: "front-power-supply-1",
      assemblyId: "1A24",
    });
    expect(DME_1119A_BLOCK_BY_ID.get("tx-power-supply-2")?.cabinetHotspots[0]).toMatchObject({
      id: "front-power-supply-2",
      assemblyId: "1A25",
    });

    const lowPowerCardIds = [
      "lpa-synth-1",
      "rtc-1",
      "monitor-1",
      "rms",
      "facilities",
      "monitor-2",
      "rtc-2",
      "lpa-synth-2",
    ] as const;
    expect(lowPowerCardIds.map((blockId) => {
      const hotspot = DME_1119A_BLOCK_BY_ID.get(blockId)?.cabinetHotspots[0];
      return [hotspot?.x, hotspot?.width];
    })).toEqual([
      [54, 63],
      [117, 34],
      [151, 34],
      [185, 41],
      [226, 20],
      [246, 34],
      [280, 34],
      [314, 64],
    ]);

    expect(DME_1119A_BLOCK_BY_ID.get("bcps-2")?.cabinetHotspots[0]).toMatchObject({
      assemblyId: "1A21",
      x: 75,
      width: 148,
    });
    expect(DME_1119A_BLOCK_BY_ID.get("bcps-1")?.cabinetHotspots[0]).toMatchObject({
      assemblyId: "1A20",
      x: 223,
      width: 137,
    });
  });

  it("keeps every catalog mapping unique and source-backed", () => {
    const blockIds = DME_1119A_BLOCKS.map((block) => block.id);
    const occurrenceIds = DME_1119A_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => item.id));
    const hotspots = DME_1119A_BLOCKS.flatMap((block) => block.cabinetHotspots);
    const hotspotIds = hotspots.map((hotspot) => hotspot.id);

    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(new Set(occurrenceIds).size).toBe(occurrenceIds.length);
    expect(new Set(hotspotIds).size).toBe(hotspotIds.length);
    expect(DME_1119A_HOTSPOT_TO_BLOCK.size).toBe(hotspots.length);

    for (const block of DME_1119A_BLOCKS) {
      for (const occurrence of block.diagramOccurrences) {
        expect(DME_1119A_COMPONENT_TO_BLOCK.get(occurrence.componentId)).toBe(block.id);
        for (const targetId of occurrence.targetCabinetHotspotIds) {
          const hotspotOwnerId = DME_1119A_HOTSPOT_TO_BLOCK.get(targetId);
          const hotspotOwner = hotspotOwnerId ? DME_1119A_BLOCK_BY_ID.get(hotspotOwnerId) : undefined;

          expect(hotspotOwner).toBeDefined();
          expect(
            hotspotOwnerId === block.id
            || block.assemblyIds.some((assemblyId) => hotspotOwner?.assemblyIds.includes(assemblyId)),
          ).toBe(true);
        }
      }
    }
  });
});
