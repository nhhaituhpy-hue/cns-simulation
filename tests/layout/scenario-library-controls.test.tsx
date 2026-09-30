import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioLibraryControls } from "@/components/scenario/scenario-library-controls";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

const scenarios = [
  {
    id: "scenario-1",
    moduleId: "dme-320",
    scenarioId: "low-output",
    name: "Suy giảm công suất",
    description: "Kiểm tra tình huống công suất thấp.",
    difficulty: "basic",
    schemaVersion: 1,
    definition: {},
    sourceFileName: "low-output.json",
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
  },
  {
    id: "scenario-2",
    moduleId: "dme-320",
    scenarioId: "pulse-spacing",
    name: "Sai lệch khoảng cách xung",
    description: "Kiểm tra sai lệch khoảng cách xung.",
    difficulty: "intermediate",
    schemaVersion: 1,
    definition: {},
    sourceFileName: "pulse-spacing.json",
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
  },
] as unknown as StoredScenarioParameters[];

describe("ScenarioLibraryControls", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("supports select-all checkboxes with indeterminate state and one save action", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((_: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, libraryRevision: 3 }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            practice: [{ id: "scenario-1" }],
            exam: [{ id: "scenario-2" }],
            libraryRevisions: { practice: 1, exam: 2 },
          }),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ScenarioLibraryControls moduleId="dme-320" scenarios={scenarios} />,
    );

    const practiceAll = await screen.findByRole("checkbox", {
      name: "Chọn tất cả Thư viện Ôn tập",
    });
    const examAll = screen.getByRole("checkbox", {
      name: "Chọn tất cả Thư viện Kiểm tra",
    });
    const tableRegion = screen.getByRole("region", {
      name: "Danh sách kịch bản để phân chia thư viện",
    });

    expect(tableRegion).toHaveClass("max-h-[26rem]", "overflow-auto");
    expect(tableRegion).toHaveAttribute("tabindex", "0");

    await waitFor(() => expect(practiceAll).toHaveProperty("indeterminate", true));
    await waitFor(() => expect(examAll).toHaveProperty("indeterminate", true));
    expect(screen.queryByRole("button", { name: "Lưu Ôn tập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu Kiểm tra" })).not.toBeInTheDocument();

    await user.click(practiceAll);
    await user.click(examAll);

    expect(
      screen.getByRole("checkbox", {
        name: "Nạp “Suy giảm công suất” vào Thư viện Ôn tập",
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "Nạp “Sai lệch khoảng cách xung” vào Thư viện Kiểm tra",
      }),
    ).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => {
      const putCalls = fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
      );
      expect(putCalls).toHaveLength(2);
      expect(JSON.parse(String((putCalls[0]?.[1] as RequestInit).body))).toMatchObject({
        moduleId: "dme-320",
        libraryKind: "practice",
        scenarioIds: ["scenario-1", "scenario-2"],
        expectedRevision: 1,
      });
      expect(JSON.parse(String((putCalls[1]?.[1] as RequestInit).body))).toMatchObject({
        moduleId: "dme-320",
        libraryKind: "exam",
        scenarioIds: ["scenario-1", "scenario-2"],
        expectedRevision: 2,
      });
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Đã lưu");
  });
});
