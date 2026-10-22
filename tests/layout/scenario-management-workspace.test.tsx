import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("places independent library checkboxes in the scenario table without a separate settings panel", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(
      url.startsWith("/api/ai/") ? { jobs: [] }
        : url.startsWith("/api/scenario-libraries") ? { practice: [{ id: "scenario-row" }], exam: [], libraryRevisions: { practice: 1, exam: 2 } }
          : [scenario({})],
    )))));
    render(<ScenarioManagementWorkspace moduleId="dvor-220" />);
    const scenarioButton = await screen.findByRole("button", { name: /QA DVOR 220 - Carrier/ });
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.queryByText("Cài đặt thư viện")).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
    expect(within(table).getByRole("columnheader", { name: /Thư viện Ôn tập/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Thư viện Kiểm tra/ })).toBeInTheDocument();
    const row = scenarioButton.closest("tr")!;
    const practice = within(row).getByRole("checkbox", { name: /Thư viện Ôn tập/ });
    const exam = within(row).getByRole("checkbox", { name: /Thư viện Kiểm tra/ });
    await waitFor(() => expect(practice).toBeChecked());
    expect(exam).not.toBeChecked();
    expect(within(row).getByRole("button", { name: "Sửa nhanh" })).toBeInTheDocument();
  });

  it("shows only the selected device scenarios and restores navigation to the catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => Promise.resolve(url.startsWith("/api/ai/") ? new Response(JSON.stringify({ jobs: [] })) : new Response(
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
        ))),
    );

    render(<ScenarioManagementWorkspace moduleId="dvor-220" />);

    expect(
      screen.getByRole("heading", { name: "DVOR 220" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "back" })).toHaveAttribute(
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
