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

  it("renders assigned scenarios with orange fully-rounded start action", () => {
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
    expect(screen.getByRole("link", { name: /Bắt đầu bài DVOR 220/ })).toHaveClass(
      "!rounded-full",
    );
  });

  it("shows empty review state when no scenarios are assigned", () => {
    render(<OperationsReviewDashboard moduleId="dvor-220" loadFromApi={false} />);

    expect(screen.getByText("0 bài")).toBeInTheDocument();
    expect(
      screen.getByText("Chưa có tình huống DVOR 220 nào được gắn vào ôn tập."),
    ).toBeInTheDocument();
  });
});
