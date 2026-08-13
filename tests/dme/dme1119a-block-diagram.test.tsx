import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dme1119aBlockDiagram } from "@/modules/devices/dme-1119a/dme-1119a-block-diagram";

describe("DME 1119A block diagram explorer", () => {
  it("shows only Front/Rear cabinet and the Dual High Power schematic", () => {
    render(<Dme1119aBlockDiagram />);

    expect(screen.getByRole("tab", { name: "Front Cabinet" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rear Cabinet" })).toBeInTheDocument();
    expect(screen.queryByText("Side View")).not.toBeInTheDocument();
    expect(screen.getByText("Dual High Power")).toBeInTheDocument();
    expect(screen.queryByText("Simplified")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Figure 1-10 Dual High Power/ })).toBeInTheDocument();
  });

  it("selects Preselector and LNA as distinct receive-path blocks", () => {
    render(<Dme1119aBlockDiagram />);

    const preselector = screen.getByRole("button", { name: "Chọn DME Preselector Assembly" });
    fireEvent.keyDown(preselector, { key: "Enter" });
    expect(preselector).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "DME Preselector Assembly" })).toBeInTheDocument();

    const lna = screen.getByRole("button", { name: "Chọn Low-noise Amplifier" });
    fireEvent.click(lna);
    expect(lna).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Low-noise Amplifier" })).toBeInTheDocument();
  });
});
