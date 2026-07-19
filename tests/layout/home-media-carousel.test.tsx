import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeMediaCarousel } from "@/components/home/home-media-carousel";

describe("HomeMediaCarousel", () => {
  it("switches between the six Supabase-hosted guidance clips", () => {
    render(<HomeMediaCarousel baseUrl="https://example.supabase.co/storage/v1/object/public/training-media/home-guides/v3" />);

    const firstVideo = screen.getByLabelText("Hướng dẫn Giám khảo tạo Đề thi");
    expect(firstVideo).not.toHaveAttribute("autoplay");
    expect(firstVideo.querySelector("source")).toHaveAttribute(
      "src",
      "https://example.supabase.co/storage/v1/object/public/training-media/home-guides/v3/huong-dan-giam-khao-tao-de-thi.mp4",
    );
    expect(screen.getByText("1/6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xem clip tiếp theo" }));

    expect(screen.getByLabelText("Hướng dẫn Giám khảo tạo Kỳ thi")).toBeInTheDocument();
    expect(screen.getByText("2/6")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Mở / })).toHaveLength(6);
  });
});
