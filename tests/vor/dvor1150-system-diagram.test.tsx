import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DVOR_1150_BLOCK_BY_ID } from "@/modules/devices/dvor-1150/block-diagram-data";
import { Dvor1150SystemDiagram } from "@/modules/devices/dvor-1150/dvor-1150-system-diagram";

describe("DVOR 1150 Rev. K system diagram", () => {
  it("renders and selects every TX sideband occurrence with its own cabinet target", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<Dvor1150SystemDiagram selectedOccurrenceId={null} onSelect={onSelect} />);
    const occurrences = DVOR_1150_BLOCK_BY_ID.get("sideband-generator")!.diagramOccurrences;
    for (const [index, occurrence] of occurrences.entries()) {
      const button = screen.getByRole("button", { name: `Chọn ${occurrence.label}` });
      expect(button).toHaveAttribute("aria-pressed", "false");
      if (index === 0) fireEvent.click(button);
      else fireEvent.keyDown(button, { key: index === 1 ? "Enter" : " " });
      expect(onSelect).toHaveBeenLastCalledWith("sideband-generator", occurrence);
    }
    const selected = occurrences[3];
    rerender(<Dvor1150SystemDiagram selectedOccurrenceId={selected.id} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: `Chọn ${selected.label}` })).toHaveAttribute("aria-pressed", "true");
  });

  it("draws independent FWD and REV samples from every isolator to RF Monitor A2", () => {
    render(<Dvor1150SystemDiagram selectedOccurrenceId={null} onSelect={vi.fn()} />);
    const paths = [];
    for (const isolator of [1, 2, 3, 4]) {
      for (const direction of ["REV", "FWD"]) {
        const sample = screen.getByRole("img", { name: `Mẫu sideband ISO${isolator} ${direction} → RF Monitor A2` });
        const path = sample.querySelector("path")!;
        const y = 328 + (isolator - 1) * 46;
        const portX = 780 + (isolator - 1) * 20;
        expect(path.getAttribute("d")).toBe(direction === "REV"
          ? `M906 ${y - 16}V${y - 22}H${portX}V282`
          : `M930 ${y + 16}V${y + 22}H${portX + 10}V282`);
        paths.push(path.getAttribute("d"));
        expect(sample.querySelector("text")?.textContent).toBe(direction);
        expect(sample.querySelector("text")).toHaveAttribute("x", "950");
        expect(sample.querySelector("text")).toHaveAttribute("y", String(direction === "REV" ? y - 7 : y + 14));
      }
    }
    expect(new Set(paths).size).toBe(8);
  });

  it("uses the supplied Rev. K caption and tolerates no selected occurrence", () => {
    const onSelect = vi.fn();
    const { container } = render(<Dvor1150SystemDiagram selectedOccurrenceId={null} onSelect={onSelect} />);
    expect(screen.getByText("FIGURE 2-2 · REV. K · JANUARY 2008")).toBeInTheDocument();
    expect(container.querySelector('[aria-pressed="true"]')).toBeNull();
    const button = screen.getAllByRole("button")[0];
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
