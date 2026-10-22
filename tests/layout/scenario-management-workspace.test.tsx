import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(within(table).getByRole("columnheader", { name: /^Ôn tập/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /^Kiểm tra/ })).toBeInTheDocument();
    expect(within(table).queryByText("Thư viện Ôn tập")).not.toBeInTheDocument();
    expect(within(table).queryByText("Chọn tất cả")).not.toBeInTheDocument();
    const row = scenarioButton.closest("tr")!;
    const practice = within(row).getByRole("checkbox", { name: /Thư viện Ôn tập/ });
    const exam = within(row).getByRole("checkbox", { name: /Thư viện Kiểm tra/ });
    await waitFor(() => expect(practice).toBeChecked());
    expect(exam).not.toBeChecked();
    expect(within(row).queryByRole("button", { name: "Sửa nhanh" })).not.toBeInTheDocument();
  });

  it.each(["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320"] as const)("keeps only AI creation and two SVG-only row actions for %s", async moduleId => {
    const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(url => Promise.resolve(new Response(JSON.stringify(
      url.startsWith("/api/ai/") ? { jobs: [] }
        : url.startsWith("/api/scenario-libraries") ? { practice: [], exam: [], libraryRevisions: { practice: 0, exam: 0 } }
          : [scenario({ moduleId })],
    ))));
    vi.stubGlobal("fetch", fetcher);
    render(<ScenarioManagementWorkspace moduleId={moduleId} />);
    expect(screen.queryByText(/Quản lý các kịch bản \(scenario\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/JSON đúng schema/)).not.toBeInTheDocument();
    expect(screen.getByText(/Import cùng mã sẽ cập nhật kịch bản hiện có/)).toBeVisible();
    const scenarioButton = await screen.findByRole("button", { name: /QA DVOR 220 - Carrier/ });
    const create = screen.getByRole("region", { name: "Tạo kịch bản AI" });
    expect(within(create).getAllByRole("button")).toHaveLength(1);
    expect(within(create).getByRole("button", { name: "Tạo kịch bản bằng AI" })).toBeInTheDocument();
    const cell = scenarioButton.closest("tr")!.lastElementChild as HTMLElement;
    const actions = cell.querySelectorAll("a, button");
    expect(actions).toHaveLength(2);
    const open = within(cell).getByRole("link", { name: "Mở simulator" });
    expect(open).toHaveAttribute("href", expect.stringContaining("?scenarioId=scenario-row"));
    expect(open).toHaveAttribute("title", "Mở simulator");
    const remove = within(cell).getByRole("button", { name: "Xóa" });
    for (const action of [open, remove]) {
      expect(action.textContent?.trim()).toBe("");
      expect(action.querySelector("svg")).not.toBeNull();
      expect(action.children).toHaveLength(1);
    }
    fireEvent.click(scenarioButton);
    const edit = await screen.findByRole("button", { name: "Sửa nhanh" });
    expect(screen.getByRole("button", { name: "Tải JSON" })).toBeInTheDocument();
    fireEvent.click(edit);
    expect(screen.getByRole("textbox", { name: "Tên kịch bản" })).toHaveValue("QA DVOR 220 - Carrier");
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(cell.querySelectorAll("a, button")).toHaveLength(2);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(remove);
    expect(confirm).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
    confirm.mockRestore();
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
