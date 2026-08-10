import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page layout", () => {
  it("renders eight compact simulator links", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      name: "Chọn hệ thống để bắt đầu phiên mô phỏng",
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Khu vực mô phỏng" })).toBeInTheDocument();
    expect(screen.getByText("Chọn biểu tượng để mở simulator tương ứng.")).toBeInTheDocument();

    const simulatorLinks = screen.getAllByRole("link", { name: /^Mở simulator/ });
    expect(simulatorLinks).toHaveLength(8);
    expect(simulatorLinks[0]).toHaveClass("aspect-square");
  });

  it("keeps each home simulator card linked to its module route", () => {
    render(<Home />);

    const expectedRoutes = [
      ["Mở simulator DVOR 1150", "/simulator/dvor-1150"],
      ["Mở simulator DVOR 1150A", "/simulator/dvor-1150a"],
      ["Mở simulator DME 1119A", "/simulator/dme-1119a"],
      ["Mở simulator Phần mềm khai thác DVOR 220", "/simulator/software/dvor-220"],
      ["Mở simulator Phần mềm khai thác DME 320", "/simulator/software/dme-320"],
      ["Mở simulator ADS-B", "/simulator/ads-b"],
      ["Mở simulator Phần mềm khai thác VHF", "/simulator/software/vhf"],
      ["Mở simulator Phần mềm khai thác VSAT", "/simulator/software/vsat"],
    ] as const;

    for (const [name, href] of expectedRoutes) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });
});
