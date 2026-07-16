import { describe, expect, it } from "vitest";

import { normalizeScenario } from "@/lib/scenario-normalization";

describe("scenario normalization", () => {
  it("converts legacy faultyComponentId to faultyComponentIds", () => {
    const normalized = normalizeScenario({
      id: "legacy",
      hardwareFault: {
        faultyComponentId: "coax-1",
        faultType: "open",
      },
    }) as {
      hardwareFault: {
        faultyComponentIds: string[];
        faultyComponentId?: string;
      };
    };

    expect(normalized.hardwareFault.faultyComponentIds).toEqual(["coax-1"]);
    expect(normalized.hardwareFault.faultyComponentId).toBeUndefined();
  });

  it("leaves current multi-component data unchanged", () => {
    const current = {
      id: "current",
      hardwareFault: {
        faultyComponentIds: ["coax-1", "preamp-1"],
      },
    };

    expect(normalizeScenario(current)).toBe(current);
  });

  it("maps legacy degraded component status to failed", () => {
    const normalized = normalizeScenario({
      id: "legacy-status",
      hardwareFault: {
        faultyComponentIds: ["coax-1"],
        hardwareLayout: [
          { id: "antenna-1", status: "ok" },
          { id: "coax-1", status: "degraded" },
        ],
      },
    }) as {
      hardwareFault: { hardwareLayout: Array<{ status: string }> };
    };

    expect(normalized.hardwareFault.hardwareLayout).toEqual([
      { id: "antenna-1", status: "ok" },
      { id: "coax-1", status: "failed" },
    ]);
  });
});
