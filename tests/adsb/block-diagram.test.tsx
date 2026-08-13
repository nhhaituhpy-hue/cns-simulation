import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdsbBlockDiagram } from "@/modules/devices/adsb/adsb-block-diagram";

describe("ADS-B outdoor block diagram interaction", () => {
  it("selects a topology block with the keyboard and opens its manual detail", () => {
    render(<AdsbBlockDiagram />);

    const sensorBlock = screen.getByRole("button", {
      name: "Chọn COMSOFT Quadrant ADS-B Sensor — Outdoor",
    });
    fireEvent.keyDown(sensorBlock, { key: "Enter" });

    expect(sensorBlock).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "COMSOFT Quadrant ADS-B Sensor — Outdoor" }),
    ).toHaveFocus();
    expect(screen.getByText("1. 100–240 V AC Power")).toBeInTheDocument();
    expect(screen.getByText("5. 24 V DC Power")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Mặt đáy Quadrant Sensor với năm cổng theo Figure 4"),
    ).toBeInTheDocument();
  });
});
