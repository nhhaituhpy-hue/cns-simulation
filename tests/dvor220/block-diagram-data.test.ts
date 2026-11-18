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

  it("keeps SYN RF connector levels separate from unresolved TP33–TP36 signal format", () => {
    const syn = DVOR_220_BLOCKS.find((block) => block.id === "syn")!;
    expect(syn.testPoints.map((point) => point.id)).toEqual(["J1", "J6", "TP33", "TP34", "TP35", "TP36"]);
    for (const point of syn.testPoints.filter((item) => item.id.startsWith("J"))) {
      expect(point.instrument).toBe("Frequency counter / RF power sensor");
      expect(point.tolerance).toContain("−5 dBm ±4 dB");
      expect(point.source).toContain("PDF 481");
    }
    expect(syn.testPoints.find((point) => point.id === "J6")?.nominal).toBe("40 MHz");
    for (const point of syn.testPoints.filter((item) => item.id.startsWith("TP"))) {
      expect(point.instrument).toBe("Frequency counter");
      expect(point.signalType).toBe("Frequency test signal · format unresolved");
      expect(point.nominal).toBeUndefined();
      expect(point.tolerance).toBeUndefined();
      expect(point.conditions?.join(" ")).toMatch(/RF.*tần số hiệu.*chưa xác minh/i);
      expect(point.source).toContain("§3.2.18");
      expect(point.source).toContain("PDF 145");
      expect(point.source).toContain("PDF 436–437");
    }
  });

  it("applies Table 5-3 ranges only to the actual AUX/TX rails, never to GND", () => {
    const ranges: Record<string, string> = {
      "+5 V": "4.75–5.25 VDC (±5%)",
      "+8 V": "7.6–8.4 VDC (±5%)",
      "+15 V": "14.25–15.75 VDC (±5%)",
      "-15 V": "−15.75…−14.25 VDC (±5%)",
      "+28 V": "26.6–29.4 VDC (±5%)",
      "+50 V": "47.5–52.5 VDC (±5%)",
    };
    for (const [id, rails, location] of [
      ["dcdc-aux", ["+5 V", "+15 V", "-15 V", "GND"], "Figure 6-3, PDF 442"],
      ["dcdc-tx", ["+5 V", "+8 V", "+15 V", "-15 V", "+28 V", "+50 V", "GND"], "Figure 6-4, PDF 443"],
    ] as const) {
      const block = DVOR_220_BLOCKS.find((item) => item.id === id)!;
      expect(block.testPoints.map((point) => point.id)).toEqual(rails);
      for (const point of block.testPoints) {
        expect(point.source).toContain(location);
        if (point.id === "GND") {
          expect(point.nominal).toBe("Tham chiếu GND");
          expect(point.tolerance).toBeUndefined();
        } else {
          expect(point.tolerance).toBe(ranges[point.id]);
          expect(point.source).toContain("Table 5-3, PDF 416 (5-2)");
        }
      }
    }
  });

  it("keeps every measurable access point unique and sourced, without unsourced fixed waveform amplitudes", () => {
    for (const block of DVOR_220_BLOCKS) {
      const ids = block.testPoints.map((point) => point.id);
      expect(new Set(ids).size, block.id).toBe(ids.length);
      for (const point of block.testPoints) {
        expect(point.signalType, `${block.id}/${point.id}`).toBeTruthy();
        expect(point.instrument, `${block.id}/${point.id}`).toBeTruthy();
        expect(point.source, `${block.id}/${point.id}`).toMatch(/PDF (?:page )?\d+/);
      }
    }
    for (const id of ["sma-lsb", "sma-usb", "cma"] as const) {
      const block = DVOR_220_BLOCKS.find((item) => item.id === id)!;
      for (const point of block.testPoints) expect(point.conditions?.join(" ")).toMatch(/biên độ.*công suất/i);
    }
  });

  it("keeps captured scope readings separate from nominal limits and matches the served asset dimensions", () => {
    const points = DVOR_220_BLOCKS.flatMap((block) => block.testPoints);
    const waves = [...new Map(points.flatMap((point) => point.waveforms ?? []).map((wave) => [wave.src, wave])).values()];
    expect(waves).toHaveLength(12);
    expect(waves.every((wave) => wave.width === 800 && wave.height === 480)).toBe(true);
    const msgCarrier = waves.find((wave) => wave.caption === "TP49 Carrier")!;
    expect(msgCarrier.scopeSettings).toContain("CH2 1.00 V/div; 10.0 ms/div; probe 10X");
    expect(msgCarrier.observedReadings).toContain("Ảnh chụp: Ampl 2.73 V; Freq 29.9 Hz (Cur). Không phải Vpp hoặc dung sai.");
  });

  it("uses the DVOR 220 software calibration procedure rather than inventing DVOR 1150A trim screws", () => {
    const cma = DVOR_220_BLOCKS.find((block) => block.id === "cma")!;
    expect(cma.adjustments?.map((item) => item.id)).toEqual(["carrier-am30", "carrier-ident", "carrier-power"]);
    expect(cma.adjustments?.find((item) => item.id === "carrier-power")?.target).toBe("100 ±3 W");
    for (const id of ["sma-lsb", "sma-usb"] as const) {
      const block = DVOR_220_BLOCKS.find((item) => item.id === id)!;
      expect(block.adjustments?.[0].control).toContain("PMDT");
      expect(block.adjustments?.[0].target).toBe("1 ±0.05 W");
      expect(block.adjustments?.[0].source).toContain("PDF 541–542");
    }
  });

  it("scopes CMA/SMA calibration references to compensated setpoints and reading-only calibration", () => {
    for (const id of ["cma", "sma-lsb", "sma-usb"] as const) {
      const block = DVOR_220_BLOCKS.find((item) => item.id === id)!;
      for (const adjustment of block.adjustments!) {
        const conditions = adjustment.conditions.join(" ");
        expect(conditions).toMatch(/TX Setpoint Cal\. giữ nguyên RF thực ngay.*tự động bù.*setpoint/i);
        expect(conditions).toMatch(/sau hiệu chuẩn.*thủ công.*Transmitter Setup.*mong muốn/i);
        expect(conditions).toMatch(/TX Reading Cal\. chỉ đổi số đọc.*không đổi.*RF thực/i);
        expect(conditions).toMatch(/quyền mức 2 hoặc 3.*từng TX.*kênh/i);
        expect(conditions).toMatch(/mục tiêu.*lắp đặt.*không phải giới hạn vận hành/i);
        expect(adjustment.source).toContain("§4.4.6.1.1, PDF 307 (4-121)");
        expect(adjustment.source).toContain("§4.4.6.1.2, PDF 310 (4-124)");
      }
    }
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
