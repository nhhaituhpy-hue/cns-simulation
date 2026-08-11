import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page layout", () => {
  it("renders carousel CTAs for available simulators", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      name: "Khám phá thiết bị mô phỏng",
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Kéo, lăn chuột hoặc dùng phím mũi tên để chọn thiết bị.")).toBeInTheDocument();

    const simulatorLinks = screen.getAllByRole("link", { name: /^Mở simulator .+/ });
    expect(simulatorLinks).toHaveLength(6);
    expect(screen.getAllByText("Đang hoàn thiện")).toHaveLength(4);
  });

  it("keeps each available home simulator card linked to its module route", () => {
    render(<Home />);

    const expectedRoutes = [
      ["Mở simulator DVOR 1150", "/simulator/dvor-1150"],
      ["Mở simulator DVOR 1150A", "/simulator/dvor-1150a"],
      ["Mở simulator DME 1119A", "/simulator/dme-1119a"],
      ["Mở simulator DVOR 220", "/simulator/software/dvor-220"],
      ["Mở simulator DME 320", "/simulator/software/dme-320"],
      ["Mở simulator ADS-B", "/simulator/ads-b"],
    ] as const;

    for (const [name, href] of expectedRoutes) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });
});
