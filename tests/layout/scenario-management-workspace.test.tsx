import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioManagementWorkspace } from "@/components/scenario/scenario-management-workspace";

function scenario(overrides: Record<string, unknown>) {
  return {
    id: "scenario-row",
    moduleId: "dvor-220",
    scenarioId: "dvor220-qa",
    name: "QA DVOR 220 - Carrier",
    description: "Kiểm tra công suất Carrier.",
    difficulty: "intermediate",
    schemaVersion: 1,
    definition: {},
    sourceFileName: "qa.json",
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("ScenarioManagementWorkspace", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows only the selected device scenarios and restores navigation to the catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            scenario({}),
            scenario({
              id: "foreign-row",
              moduleId: "dme-320",
              scenarioId: "dme320-qa",
              name: "QA DME 320 - HPA",
            }),
          ]),
          { status: 200 },
        ),
      ),
    );

    render(<ScenarioManagementWorkspace moduleId="dvor-220" />);

    expect(
      screen.getByRole("heading", { name: "Kịch bản DVOR 220" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Danh sách thiết bị" })).toHaveAttribute(
      "href",
      "/authoring",
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /QA DVOR 220 - Carrier/ }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Có 1 kịch bản DVOR 220 đã lưu\./),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /QA DME 320 - HPA/ }),
    ).not.toBeInTheDocument();
  });
});
