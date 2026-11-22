import { describe, expect, it } from "vitest";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import {
  formatDmeNumericDisplay,
  recomputeDmeDerivedData,
  setDmeParameterValue,
} from "@/lib/dme1119a";

describe("formatDmeNumericDisplay (Stage 5 QA cosmetic fix)", () => {
  it("hides binary32 quantization noise on the step grid", () => {
    // 0.32 / -13.2 after a float32 round-trip through persisted storage.
    expect(formatDmeNumericDisplay(0.3199999928474426, 0.01)).toBe("0.32");
    expect(formatDmeNumericDisplay(-0.3199999928474426, 0.01)).toBe("-0.32");
    expect(formatDmeNumericDisplay(-13.200000762939453, 0.1)).toBe("-13.2");
    expect(formatDmeNumericDisplay(0.3199999928474426)).toBe("0.32");
  });

  it("keeps clean values and genuine off-grid values untouched", () => {
    expect(formatDmeNumericDisplay(49.99, 0.01)).toBe("49.99");
    expect(formatDmeNumericDisplay(1011, 1)).toBe("1011");
    expect(formatDmeNumericDisplay(100)).toBe("100");
    // A value the operator actually typed off the 0.01 grid is not snapped.
    expect(formatDmeNumericDisplay(0.325, 0.01)).toBe("0.325");
    expect(formatDmeNumericDisplay(0.319, 0.01)).toBe("0.319");
  });
});

describe("DME 1119A decoder sensitivity status (Stage 5 QA cosmetic fix)", () => {
  it("reports Updated at the factory default sensitivity, consistent with its limits", () => {
    const data = recomputeDmeDerivedData(cloneDefaultDmePmdtData());
    const row = data.decoderResults.monitor1[0];
    // Configured Rx Sensitivity is −94 dBm (the usable-range minimum);
    // the derived reading is −94.1, inside its displayed ±3 dB limits.
    expect(row.data).toBe(-94.1);
    expect(row.lowLimit).toBe(-97.1);
    expect(row.highLimit).toBe(-91.1);
    expect(row.result).toBe("Updated");
  });

  it("reports In Process when the configured sensitivity leaves the usable range", () => {
    const data = setDmeParameterValue(cloneDefaultDmePmdtData(), "txOffsets.1.tx1", -3);
    const row1 = data.decoderResults.monitor1[0];
    expect(row1.data).toBe(-97.1);
    expect(row1.result).toBe("In Process");
    // The untouched transmitter path stays Updated.
    expect(data.decoderResults.monitor2[0].result).toBe("Updated");
  });
});
