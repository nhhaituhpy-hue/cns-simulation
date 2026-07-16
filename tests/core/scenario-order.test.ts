import { describe, expect, it } from "vitest";

import {
  formatScenarioNumber,
  sortScenariosByRecency,
} from "@/lib/scenario-order";
import type { Scenario } from "@/lib/types";

function scenario(
  id: string,
  createdAt: string,
  updatedAt?: string,
): Scenario {
  return {
    id,
    title: id,
    description: id,
    difficulty: "easy",
    createdAt,
    updatedAt,
    sites: [],
    targetSensorId: "",
    targetLoginUser: "sysadmin",
    expectedActions: [],
  };
}

describe("scenario order", () => {
  it("sorts by updated or created time without mutating the source array", () => {
    const source = [
      scenario("older", "2026-07-14T00:00:00.000Z"),
      scenario(
        "newer",
        "2026-07-13T00:00:00.000Z",
        "2026-07-16T00:00:00.000Z",
      ),
    ];

    const sorted = sortScenariosByRecency(source);

    expect(sorted.map((item) => item.id)).toEqual(["newer", "older"]);
    expect(source.map((item) => item.id)).toEqual(["older", "newer"]);
  });

  it("formats one-based ordinal numbers with two digits", () => {
    expect(formatScenarioNumber(0)).toBe("01");
    expect(formatScenarioNumber(11)).toBe("12");
  });
});
