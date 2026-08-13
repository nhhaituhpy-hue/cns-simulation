import { describe, expect, it } from "vitest";

import {
  ADSB_BLOCK_BY_ID,
  ADSB_BLOCKS,
  ADSB_COMPONENT_TO_BLOCK,
  ADSB_INSTALLATION_HOTSPOT_TO_BLOCK,
  ADSB_OCCURRENCE_TO_BLOCK,
  ADSB_TOPOLOGY_EDGES,
  ADSB_TOPOLOGY_NODE_BY_ID,
  ADSB_TOPOLOGY_NODES,
} from "@/modules/devices/adsb/block-diagram-data";

describe("ADS-B outdoor block diagram catalog", () => {
  it("uses globally unique block, occurrence, component and installation hotspot ids", () => {
    const blockIds = ADSB_BLOCKS.map((block) => block.id);
    const occurrenceIds = ADSB_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => item.id));
    const componentIds = ADSB_BLOCKS.flatMap((block) => block.diagramOccurrences.map((item) => item.componentId));
    const hotspotIds = ADSB_BLOCKS.flatMap((block) => block.installationHotspots.map((item) => item.id));

    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(new Set(occurrenceIds).size).toBe(occurrenceIds.length);
    expect(new Set(componentIds).size).toBe(componentIds.length);
    expect(new Set(hotspotIds).size).toBe(hotspotIds.length);
  });

  it("maps every catalog item back to its owning physical block", () => {
    for (const block of ADSB_BLOCKS) {
      expect(ADSB_BLOCK_BY_ID.get(block.id)).toBe(block);

      for (const occurrence of block.diagramOccurrences) {
        expect(ADSB_OCCURRENCE_TO_BLOCK.get(occurrence.id)).toBe(block.id);
        expect(ADSB_COMPONENT_TO_BLOCK.get(occurrence.componentId)).toBe(block.id);
      }

      for (const hotspot of block.installationHotspots) {
        expect(ADSB_INSTALLATION_HOTSPOT_TO_BLOCK.get(hotspot.id)).toBe(block.id);
      }
    }
  });

  it("keeps every occurrence target attached to a real installation hotspot", () => {
    const hotspotIds = new Set(
      ADSB_BLOCKS.flatMap((block) => block.installationHotspots.map((item) => item.id)),
    );
    const targetIds = ADSB_BLOCKS.flatMap((block) =>
      block.diagramOccurrences.flatMap((item) => item.targetInstallationHotspotIds),
    );

    expect(targetIds).toHaveLength(ADSB_BLOCKS.length);
    expect(targetIds.every((id) => hotspotIds.has(id))).toBe(true);
  });

  it("keeps exactly eight approved physical devices selectable", () => {
    const selectableNodeIds = ADSB_TOPOLOGY_NODES
      .filter((node) => node.selectableBlockId)
      .map((node) => node.selectableBlockId);

    expect(new Set(selectableNodeIds)).toEqual(new Set(ADSB_BLOCKS.map((block) => block.id)));
    expect(ADSB_BLOCKS).toHaveLength(8);
  });

  it("keeps every topology edge attached to real nodes", () => {
    expect(new Set(ADSB_TOPOLOGY_NODES.map((node) => node.id)).size).toBe(ADSB_TOPOLOGY_NODES.length);
    expect(new Set(ADSB_TOPOLOGY_EDGES.map((edge) => edge.id)).size).toBe(ADSB_TOPOLOGY_EDGES.length);

    for (const edge of ADSB_TOPOLOGY_EDGES) {
      expect(ADSB_TOPOLOGY_NODE_BY_ID.has(edge.from)).toBe(true);
      expect(ADSB_TOPOLOGY_NODE_BY_ID.has(edge.to)).toBe(true);
    }
  });

  it("preserves the five outdoor Sensor ports in manual order", () => {
    const sensor = ADSB_BLOCK_BY_ID.get("quadrant-sensor");

    expect(sensor?.connectors.map((connector) => connector.position)).toEqual([1, 2, 3, 4, 5]);
    expect(sensor?.connectors.map((connector) => connector.label)).toEqual([
      "100–240 V AC Power",
      "GPS",
      "Antenna",
      "LAN",
      "24 V DC Power",
    ]);
  });

  it("models direct AC and 24 VDC as alternative source paths without claiming redundancy", () => {
    const directAc = ADSB_TOPOLOGY_EDGES.find((edge) => edge.id === "power-ac-sensor");
    const dcPath = ADSB_TOPOLOGY_EDGES.find((edge) => edge.id === "power-psu-sensor");
    const sensor = ADSB_BLOCK_BY_ID.get("quadrant-sensor");

    expect(directAc).toMatchObject({ from: "ac-source", to: "quadrant-sensor", optional: true });
    expect(dcPath).toMatchObject({ from: "dc-power-supply", to: "quadrant-sensor", optional: true });
    expect(sensor?.notes.join(" ")).toContain("không suy diễn cơ chế redundancy hoặc OR-ing");
  });

  it("separates core, conditional, recommended and site-provided equipment", () => {
    expect(ADSB_BLOCK_BY_ID.get("quadrant-sensor")?.status).toBe("required");
    expect(ADSB_BLOCK_BY_ID.get("gps-receiver")?.status).toBe("conditional");
    expect(ADSB_BLOCK_BY_ID.get("lightning-protector")?.status).toBe("recommended");
    expect(ADSB_BLOCK_BY_ID.get("ac-source")?.status).toBe("site");
    expect(ADSB_BLOCK_BY_ID.get("lan-switch")?.status).toBe("site");
  });

  it("keeps every selectable block tied to at least one manual source", () => {
    expect(ADSB_BLOCKS.every((block) => block.sources.length > 0)).toBe(true);
    expect(ADSB_BLOCKS.flatMap((block) => block.sources).every((item) => item.pdfPage > 0)).toBe(true);
  });
});
