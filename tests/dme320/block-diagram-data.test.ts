import { describe, expect, it } from "vitest";

import {
  DME_320_BLOCK_BY_ID,
  DME_320_BLOCKS,
  DME_320_COMPONENT_TO_BLOCK,
  DME_320_HOTSPOT_TO_BLOCK,
} from "@/modules/operations/dme-320/block-diagram-data";

describe("DME 320 block diagram catalog", () => {
  it("keeps SCU CAN pins distinct from an unverified supply-rail interpretation", () => {
    const points = DME_320_BLOCK_BY_ID.get("scu")!.testPoints;
    expect(points.map((point) => point.id)).toEqual(["TP9", "TP16"]);
    expect(points[0].label).toBe("CAN TxD (TTL)");
    expect(points[1].label).toBe("CAN RxD (TTL)");
    for (const point of points) {
      expect(point.signalType).toContain("TTL");
      expect(point.instrument).toContain("Oscilloscope");
      expect(point.source).toContain("PDF 117");
      expect(point.tolerance).toContain("Chưa");
    }
    expect(points[0].conditions?.join(" ")).toMatch(/Table 3-7.*\+5 V/);
    expect(points[0].nominal).not.toBe("+5 V");
  });
  it("uses PMU voltage inputs rather than copied auxiliary supply rails", () => {
    const pmu = DME_320_BLOCK_BY_ID.get("pmu")!;
    expect(pmu.testPoints.map((point) => point.id)).toEqual(["ACDC VOLT", "BATT VOLT", "GND"]);
    const acdc = pmu.testPoints[0];
    expect(acdc.nominal).toBe("+28 VDC");
    expect(acdc.tolerance).toBe("±1.4 V");
    expect(acdc.source).toContain("PDF 310–312");
    expect(pmu.testPoints[1].tolerance).toContain("Chưa");
    expect(pmu.notes?.join(" ")).toMatch(/Table 3-13.*mâu thuẫn/);
  });

  it("records every maintenance rail limit without borrowing the PMU +28 V tolerance", () => {
    const rails = [
      ["+5V_TP", "+5 VDC", "±0.25 V"],
      ["+8V_TP", "+8 VDC", "±0.4 V"],
      ["+15V_TP", "+15 VDC", "±0.75 V"],
      ["-15V_TP", "-15 VDC", "±0.75 V"],
      ["+50V_TP", "+50 VDC", "±2.5 V"],
    ];
    for (const [id, nominal, tolerance] of rails) {
      const point = DME_320_BLOCK_BY_ID.get("dcdc")!.testPoints.find((point) => point.id === id)!;
      expect(point.nominal).toBe(nominal);
      expect(point.tolerance).toBe(tolerance);
      expect(point.instrument).toContain("DMM");
      expect(point.conditions?.join(" ")).toContain("GND");
    }
    for (const [id, nominal, tolerance] of rails.filter(([id]) => !["+8V_TP", "+50V_TP"].includes(id))) {
      expect(DME_320_BLOCK_BY_ID.get("dcdc-a")!.testPoints.find((point) => point.id === id)).toMatchObject({ nominal, tolerance });
    }
    const rail28 = DME_320_BLOCK_BY_ID.get("dcdc")!.testPoints.find((point) => point.id === "+28V_TP")!;
    expect(rail28.nominal).toBe("+28 VDC");
    expect(rail28.tolerance).toContain("Chưa");
    expect(rail28.conditions?.join(" ")).toContain("±1.4 V");
    expect(rail28.tolerance).not.toBe("±1.4 V");
  });

  it("catalogs all eleven physical TCU points without inventing pulse limits", () => {
    const points = DME_320_BLOCK_BY_ID.get("tcu")!.testPoints;
    expect(points.map((point) => point.id)).toEqual([
      "TOA PULSE", "DECODED", "DEAD TIME", "GAUSSIAN PULSE", "RECTANGULAR PULSE", "GND",
      "RX INHIBIT", "LDES", "ID CODE", "ID PULSE", "SQUITTER",
    ]);
    for (const point of points) {
      expect(point.source).toContain("PDF 102");
      expect(point.description).toContain("Test point");
      expect(point.nominal).toMatch(/Chưa|tham chiếu/);
      expect(point.tolerance).toMatch(/Chưa|Không áp dụng/);
    }
  });

  it("attaches LOG VIDEO capture to the RXU measurement, not a fictitious MON reply trace", () => {
    const rx = DME_320_BLOCK_BY_ID.get("rxu")!.testPoints.find((point) => point.id === "LOG VIDEO")!;
    expect(rx.nominal).toBe("System delay: X 50 µs; Y 56 µs");
    expect(rx.tolerance).toBe("System delay: ±0.5 µs");
    expect(rx.conditions?.join(" ")).toMatch(/CH1.*CH2/);
    expect(rx.conditions?.join(" ")).toContain("0.7 V");
    expect(rx.waveforms).toHaveLength(1);
    const waveform = rx.waveforms![0];
    expect(waveform.src).toBe("/equipment/dme-320/waveforms/figure-6-4-interrogation-reply.webp");
    expect(waveform.scopeSettings?.join(" ")).toContain("1 V/div");
    expect(waveform.scopeSettings?.join(" ")).toContain("Ch2");
    expect(waveform.observedReadings?.join(" ")).toContain("50 µs");
    expect(waveform.caption).toContain("CH1");
    const mon = DME_320_BLOCK_BY_ID.get("mon")!;
    expect(mon.testPoints.flatMap((point) => point.waveforms ?? [])).toEqual([]);
    const trigger = mon.testPoints.find((point) => point.id === "INTERROGATION TRIGGER")!;
    expect(trigger.description).not.toContain("reply trigger");
    expect(trigger.conditions?.join(" ")).toContain("CH2");
  });

  it("preserves the MON INTG PULSE panel label without inferring what INTG stands for", () => {
    const point = DME_320_BLOCK_BY_ID.get("mon")!.testPoints.find((item) => item.id === "INTG PULSE")!;
    expect(point.label).toBe("INTG Pulse");
    expect(point.signalType).toContain("chưa xác minh chức năng");
    expect([point.label, point.signalType, point.description].join(" ")).not.toMatch(/integrity/i);
    expect(point.source).toContain("Figure 3-29");
  });

  it("keeps DME320 reply shape at HPA J7 while retaining TXU pulse count and frequency checks", () => {
    const hpa = DME_320_BLOCK_BY_ID.get("hpa")!.testPoints[0];
    expect(hpa.id).toBe("REPLY ENV");
    expect(hpa.nominal).toBe("Rise 2.0 µs; duration 3.5 µs; decay 2.5 µs; spacing X 12 µs / Y 30 µs");
    expect(hpa.tolerance).toBe("Rise <3.0 µs; duration ±0.5 µs; decay <3.5 µs; spacing <0.10 µs (ký hiệu gốc)");
    expect(hpa.conditions?.join(" ")).toContain("HPA J7");
    expect(hpa.conditions?.join(" ")).toContain("50%");
    const txu = DME_320_BLOCK_BY_ID.get("txu")!.testPoints;
    expect(txu[0].nominal).toBe("Reply pulse-pair rate: 700 pp/s (bảng §6.5.6)");
    expect(txu[0].tolerance).toBe(">700 pp/s");
    expect(txu[0].conditions?.join(" ")).toContain("chia 2");
    expect(txu[0].conditions?.join(" ")).toContain("DME 310");
    expect(txu[1].nominal).toBe("Tần số được ấn định cho trạm");
    expect(txu[1].tolerance).toBe("±0.001%");
  });

  it("provides cited instrument and explicit limits or unknowns for every point", () => {
    for (const block of DME_320_BLOCKS) {
      const ids = block.testPoints.map((point) => point.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const point of block.testPoints) {
        for (const field of ["signalType", "nominal", "tolerance", "instrument", "source"] as const) {
          expect(point[field], `${block.id}/${point.id}: ${field}`).toBeTruthy();
        }
        expect(point.source).toMatch(/PDF \d/);
        expect(point.conditions?.length, `${block.id}/${point.id}`).toBeGreaterThan(0);
      }
    }
    const rfg = DME_320_BLOCK_BY_ID.get("rfg")!.testPoints;
    expect(rfg[0].nominal).toContain("68 MHz");
    expect(rfg[0].conditions?.join(" ")).toContain("63 MHz");
    for (const point of rfg) expect(point.tolerance).toContain("Chưa");
    const waveformPoints = DME_320_BLOCKS.flatMap((block) => block.testPoints.filter((point) => point.waveforms?.length));
    expect(waveformPoints).toHaveLength(1);
  });

  it("documents all ten calibration steps as readonly references with the manual prerequisites", () => {
    const adjustments = DME_320_BLOCKS.flatMap((block) => block.adjustments ?? []);
    const steps = adjustments.filter((item) => item.id.startsWith("calibration-step-"));
    expect(steps.map((item) => Number(item.id.replace("calibration-step-", ""))).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const item of adjustments) {
      for (const value of [item.id, item.label, item.control, item.instrument, item.target, item.source]) expect(value).toBeTruthy();
      expect(item.source).toMatch(/PDF \d/);
      expect(item.conditions.join(" ")).toContain("Chỉ đọc");
    }
    const step = (n: number) => steps.find((item) => item.id === `calibration-step-${n}`)!;
    expect(step(2).conditions.join(" ")).toContain("±5%");
    expect(step(2).conditions.join(" ")).toContain("1000 W");
    expect(step(3).conditions.join(" ")).toContain("Step 1 hoặc Step 2");
    expect(step(3).target).toContain("0.1 µs");
    expect(step(3).target).not.toContain("nhập 50.6");
    expect(step(4).conditions.join(" ")).toContain("Step 3");
    expect(step(7).conditions.join(" ")).toContain("hai monitor port");
    expect(step(8).conditions.join(" ")).toContain("không thực hiện Short");
    expect(step(8).conditions.join(" ")).toContain("không bảo đảm");
    expect(step(9).target).toContain("MON1/MON2");
    expect(step(10).conditions.join(" ")).toContain("Standby");
  });

  it("keeps rail trimmers readonly without an invented direction or angle transfer", () => {
    const references = DME_320_BLOCK_BY_ID.get("dcdc")!.adjustments!;
    expect(references.map((item) => item.id)).toEqual(["ADJ1", "ADJ2"]);
    expect(references[0].control).toContain("VR101");
    expect(references[1].control).toContain("VR121");
    expect(references[0].target).toContain("chưa");
    expect(references[0].target).not.toContain("±1.4");
    expect(references[1].target).toContain("±2.5 V");
    for (const reference of references) expect(reference.conditions.join(" ")).toContain("Không xác minh chiều xoay");
  });

  it("preserves model-specific sensitivity and conditional alarm/power checks", () => {
    const refs = DME_320_BLOCKS.flatMap((block) => block.adjustments ?? []);
    const sensitivity = refs.find((item) => item.id === "receiver-sensitivity-check")!;
    expect(sensitivity.target).toContain("< -91 dBm");
    expect(sensitivity.conditions.join(" ")).toContain("≥70 pp/s");
    expect(sensitivity.conditions.join(" ")).toContain("MON2");
    const alarm = refs.find((item) => item.id === "monitor-alarm-delay-check")!;
    expect(alarm.target).toContain("4.0 s ±0.4 s");
    expect(alarm.conditions.join(" ")).toContain("49.4 µs");
    expect(alarm.conditions.join(" ")).toContain("không tự áp cho Y");
    const power = refs.find((item) => item.id === "rf-power-output-check")!;
    expect(power.target).toContain("±1 dB");
    expect(power.conditions.join(" ")).toContain("coupling thực");
    expect(power.conditions.join(" ")).toContain("00023");
    const bite = refs.find((item) => item.id === "bite-certification-check")!;
    expect(bite.target).toContain("NORMAL");
    expect(bite.target).toContain("ERRONEOUS");
  });

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
