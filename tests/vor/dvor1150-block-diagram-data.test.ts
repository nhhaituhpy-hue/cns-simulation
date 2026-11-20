import { describe, expect, it } from "vitest";
import {
  DVOR_1150_BLOCK_BY_ID,
  resolveDvor1150HardwareOccurrence,
} from "@/modules/devices/dvor-1150/block-diagram-data";

describe("DVOR 1150 Rev. K diagram references", () => {
  it("keeps SYN and all four sideband assemblies distinct per Table 3-10 / Figure 1-4", () => {
    expect(DVOR_1150_BLOCK_BY_ID.get("frequency-synthesizer")?.assemblyIds).toEqual(["1A4", "1A20"]);
    const sideband = DVOR_1150_BLOCK_BY_ID.get("sideband-generator")!;
    expect(sideband.assemblyIds).toEqual(["1A5", "1A6", "1A21", "1A22"]);
    for (const [tx, pair, assembly] of [[1, "12", "5"], [1, "34", "6"], [2, "12", "21"], [2, "34", "22"]] as const) {
      const occurrence = sideband.diagramOccurrences.find((item) => item.id === `diagram-sideband-tx${tx}-sb${pair}`)!;
      expect(occurrence.label).toContain(`A${assembly}`);
      expect(resolveDvor1150HardwareOccurrence(sideband.id, occurrence.id)?.cabinetHotspotIds).toEqual([
        `cabinet-sideband-${pair}-tx${tx}`,
      ]);
    }
  });

  it("retains GND from Figure 3-40 and flags Table 3-9 as suspected errata", () => {
    const synth = DVOR_1150_BLOCK_BY_ID.get("frequency-synthesizer")!;
    expect(synth.testPoints.at(-1)?.id).toBe("GND");
    expect(synth.notes?.join(" ")).toMatch(/Table 3-9.*nghi.*errata/i);
    expect(synth.notes?.join(" ")).toContain("A5/A6/A21/A22");
  });

  it.each([
    ["frequency-synthesizer", "TP1", "Figure 7-5", 258, "7-8"],
    ["sideband-generator", "TP1 / TP10", "Figure 7-7", 259, "7-9"],
    ["sideband-generator", "TP5 / TP6", "Figure 7-8", 260, "7-10"],
    ["audio-generator", "TP7", "Figures 7-16 và 7-17", 264, "7-14"],
    ["rf-monitor", "TX1 FWD / TX2 FWD", "Figure 7-3", 257, "7-7"],
    ["rf-monitor", "TX1 REFLD / TX2 REFLD", "Figure 7-4", 258, "7-8"],
    ["monitor-cca", "TP5", "Figure 7-30", 271, "7-21"],
  ] as const)("cites the supplied 332-page PDF for %s / %s", (blockId, pointId, figure, page, manualPage) => {
    const source = DVOR_1150_BLOCK_BY_ID.get(blockId)?.testPoints.find((point) => point.id === pointId)?.waveform?.source;
    expect(source).toBe(`${figure}, PDF page ${page} (manual page ${manualPage}), Rev. K January 2008`);
  });

  it("rejects unknown occurrences and blocks without inventing a cabinet target", () => {
    expect(resolveDvor1150HardwareOccurrence("sideband-generator", "")).toBeNull();
    expect(resolveDvor1150HardwareOccurrence("sideband-generator", "diagram-synth-tx1")).toBeNull();
  });
});
