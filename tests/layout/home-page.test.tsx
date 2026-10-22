import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page layout", () => {
  it("keeps the red hero heading readable on its dark overlay", () => {
    render(<Home />);
    const label = screen.getByText("TRUNG TÂM BẢO ĐẢM KỸ THUẬT");
    const color = label.className.match(/text-\[(#[0-9a-f]{6})\]/i)?.[1];
    expect(color).toBeDefined();
    function luminance(hex: string) {
      const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    const foreground = luminance(color!);
    const background = luminance("#15222e");
    expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it("renders carousel CTAs for available simulators", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      name: "Thực hành mô phỏng",
    });
    expect(heading).toBeInTheDocument();

    const simulatorLinks = screen.getAllByRole("link", { name: /^Mở simulator .+/ });
    expect(simulatorLinks).toHaveLength(6);
    expect(screen.getAllByText("Đang hoàn thiện")).toHaveLength(2);
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

  it("links the ADS-B card to its outdoor block diagram", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: "Mở sơ đồ khối ADS-B" }),
    ).toHaveAttribute("href", "/simulator/ads-b/block-diagram");
  });
});
