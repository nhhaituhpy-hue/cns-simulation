import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeMediaCarousel } from "@/components/home/home-media-carousel";

describe("HomeMediaCarousel", () => {
  it("switches between the six Supabase-hosted guidance clips", () => {
    render(<HomeMediaCarousel baseUrl="https://example.supabase.co/storage/v1/object/public/training-media/home-guides/v1" />);

    expect(screen.getByRole("img", {
      name: "Trạm dẫn đường vô tuyến và giám sát hàng không tại khu vực ven biển",
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xem clip tiếp theo" }));

    const firstVideo = screen.getByLabelText("Hướng dẫn Giám khảo VOR");
    expect(firstVideo).not.toHaveAttribute("autoplay");
    expect(firstVideo.querySelector("source")).toHaveAttribute(
      "src",
      "https://example.supabase.co/storage/v1/object/public/training-media/home-guides/v1/huong-dan-giam-khao-vor.mp4",
    );

    fireEvent.click(screen.getByRole("button", { name: "Xem clip tiếp theo" }));

    expect(screen.getByLabelText("Hướng dẫn Giám khảo DME")).toBeInTheDocument();
    expect(screen.getByText("3/7")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Mở / })).toHaveLength(7);
  });
});
