import { describe, expect, it, vi } from "vitest";
import AdsbSimulatorPage from "@/app/simulator/ads-b/page";
vi.mock("@/components/scenario/adsb-practice-workspace", () => ({ AdsbPracticeWorkspace: () => <p>Practice</p> }));
vi.mock("@/modules/devices/adsb", () => ({ AdsbSimulatorLab: () => <p>Free lab</p> }));

// Inspect the server route's selected child, not a copied routing predicate.
describe("ADS-B practice entry", () => {
  it("selects scenario-bound practice only for literal review=1 with scenarioId", async () => {
    const page = await AdsbSimulatorPage({ searchParams: Promise.resolve({ review: "1", scenarioId: "b817bdb7-d9f2-4a1a-89d4-51059633f480" }) });
    expect(page.props.children.type.name).toBe("AdsbPracticeWorkspace");
    expect(page.props.children.props.scenarioId).toBe("b817bdb7-d9f2-4a1a-89d4-51059633f480");
  });
  it.each([{}, { review: "1" }, { scenarioId: "one" }, { review: "true", scenarioId: "one" }, { review: ["1"], scenarioId: "one" }])("preserves free lab for %j", async (params) => {
    const page = await AdsbSimulatorPage({ searchParams: Promise.resolve(params) });
    expect(page.props.children.type.name).toBe("AdsbSimulatorLab");
  });
});
