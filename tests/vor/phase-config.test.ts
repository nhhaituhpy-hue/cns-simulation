import { describe, expect, it } from "vitest";
import { applyDvorConfigPatches, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";

describe.each(["tx1", "tx2"] as const)("phase configuration %s", (tx) => {
  const coarse = `transmitters.${tx}.offsets.carrierSidebandPhaseOffsetCoarse`;
  const fine = `transmitters.${tx}.offsets.carrierSidebandPhaseOffsetFine`;

  it("accepts exactly the four numeric coarse positions", () => {
    for (const value of [0, 90, 180, 270]) {
      const result = applyDvorConfigPatches(createDefaultDvor1150aConfig(), [{ fieldId: coarse, value }]);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.config.transmitters[tx].offsets.carrierSidebandPhaseOffsetCoarse).toBe(value);
    }
    for (const value of [-90, 45, 90.1, 360, "90"]) {
      expect(applyDvorConfigPatches(createDefaultDvor1150aConfig(), [{ fieldId: coarse, value }]).ok).toBe(false);
    }
  });

  it("accepts signed fine adjustment in tenths within 45 degrees", () => {
    for (const value of [-45, -16, -0.1, 0, 0.1, 33, 45]) {
      expect(applyDvorConfigPatches(createDefaultDvor1150aConfig(), [{ fieldId: fine, value }]).ok).toBe(true);
    }
    for (const value of [-45.1, 45.1, 0.15]) {
      expect(applyDvorConfigPatches(createDefaultDvor1150aConfig(), [{ fieldId: fine, value }]).ok).toBe(false);
    }
  });

  it("rejects an invalid legacy draft at Apply but allows staged repairs", () => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters[tx].offsets.carrierSidebandPhaseOffsetCoarse = 360;
    config.transmitters[tx].offsets.carrierSidebandPhaseOffsetFine = 60;
    expect(applyDvorConfigPatches(config).ok).toBe(false);
    const first = applyDvorConfigPatches(config, [{ fieldId: coarse, value: 0 }]);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(applyDvorConfigPatches(first.config).ok).toBe(false);
    const second = applyDvorConfigPatches(first.config, [{ fieldId: fine, value: 45 }]);
    expect(second.ok).toBe(true);
    if (second.ok) expect(applyDvorConfigPatches(second.config).ok).toBe(true);
  });
});
