import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OperationsReviewDashboard } from "@/modules/training/operations-review-dashboard";

describe("OperationsReviewDashboard", () => {
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
});
