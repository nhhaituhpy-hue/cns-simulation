import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OperationsReviewDashboard } from "@/modules/training/operations-review-dashboard";

describe("OperationsReviewDashboard", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    ["dvor-1150", "DVOR 1150"],
    ["dvor-1150a", "DVOR 1150A"],
    ["dme-1119a", "DME 1119A"],
    ["dvor-220", "DVOR 220"],
    ["dme-320", "DME 320"],
  ] as const)("renders an empty scenario table for %s", (moduleId, shortName) => {
    render(<OperationsReviewDashboard moduleId={moduleId} loadFromApi={false} />);

    expect(
      screen.getByRole("heading", { name: `Thực hành xử lý sự cố ${shortName}` }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 bài")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "STT" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tiêu đề" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Mức độ" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Thao tác" })).toBeInTheDocument();
    expect(screen.getByText(`Chưa có tình huống ${shortName} nào được gắn vào ôn tập.`)).toBeInTheDocument();
  });

  it("renders only the scenarios assigned to review", () => {
    render(
      <OperationsReviewDashboard
        moduleId="dvor-220"
        loadFromApi={false}
        scenarios={[
          {
            id: "review-1",
            title: "Suy giảm công suất TX1",
            description: "Tình huống đã được giám khảo chọn cho ôn tập.",
            difficulty: "intermediate",
            href: "/review/dvor-220/session?id=review-1",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Suy giảm công suất TX1" })).toBeInTheDocument();
    expect(screen.getByText("Trung bình")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bắt đầu bài DVOR 220/ })).toHaveAttribute(
      "href",
      "/review/dvor-220/session?id=review-1",
    );
  });

  it("allows an examiner to select a scenario without losing the checkbox event", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      assigned: [],
      canManage: true,
      available: [{
        id: "row-1",
        moduleId: "dvor-220",
        scenarioId: "scenario-1",
        name: "Suy giảm Carrier",
        description: "Khôi phục Carrier.",
        difficulty: "intermediate",
        schemaVersion: 1,
        definition: {},
        sourceFileName: "scenario.json",
        createdAt: "2026-09-16T00:00:00.000Z",
        updatedAt: "2026-09-16T00:00:00.000Z",
      }],
    }), { status: 200 })));
    render(
      <OperationsReviewDashboard
        moduleId="dvor-220"
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Thêm kịch bản" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Thêm kịch bản" }));
    await user.click(screen.getByRole("checkbox", { name: /Suy giảm Carrier/ }));
    expect(screen.getByRole("checkbox", { name: /Suy giảm Carrier/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Lưu 1 kịch bản" })).toBeInTheDocument();
  });

  it("sends the library revision read by the examiner when saving", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((_: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(new Response(JSON.stringify({ success: true, libraryRevision: 6 }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        assigned: [],
        canManage: true,
        libraryRevision: 5,
        available: [{
          id: "row-1",
          moduleId: "dvor-220",
          scenarioId: "scenario-1",
          name: "Suy giảm Carrier",
          description: "Khôi phục Carrier.",
          difficulty: "intermediate",
          schemaVersion: 1,
          definition: {},
          sourceFileName: "scenario.json",
          createdAt: "2026-09-16T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        }],
      }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<OperationsReviewDashboard moduleId="dvor-220" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Thêm kịch bản" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Thêm kịch bản" }));
    await user.click(screen.getByRole("checkbox", { name: /Suy giảm Carrier/ }));
    await user.click(screen.getByRole("button", { name: "Lưu 1 kịch bản" }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PUT");
      expect(putCall).toBeDefined();
      expect(JSON.parse(String((putCall?.[1] as RequestInit).body))).toMatchObject({
        moduleId: "dvor-220",
        scenarioIds: ["row-1"],
        expectedRevision: 5,
      });
    });
  });
});
