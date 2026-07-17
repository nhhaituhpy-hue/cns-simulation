import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page layout", () => {
  it("aligns the main content to the top of the available viewport", () => {
    render(<Home />);

    const section = screen
      .getByRole("heading", {
        name: "Kiểm tra đánh giá năng lực dựa trên thực tế vận hành hệ thống CNS",
      })
      .closest("section");
    const cover = screen.getByRole("img", {
      name: "Trạm dẫn đường vô tuyến và giám sát hàng không tại khu vực ven biển",
    });
    const carousel = cover.parentElement;
    const mediaCard = carousel?.parentElement;

    expect(section).toHaveClass("items-start");
    expect(section).not.toHaveClass("items-center");
    expect(section).not.toHaveClass("min-h-[calc(100dvh-4.25rem)]");
    expect(mediaCard).toHaveClass("aspect-video");
    expect(mediaCard).not.toHaveClass("lg:h-full");
    expect(carousel).toHaveAttribute("data-cache-strategy", "supabase-immutable");
    expect(screen.queryByText("Môi trường mô phỏng thiết bị CNS")).not.toBeInTheDocument();
  });
});
