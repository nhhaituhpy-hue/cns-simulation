import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DVOR_1150_BLOCKS, DVOR_1150_BLOCK_BY_ID } from "@/modules/devices/dvor-1150/block-diagram-data";
import { Dvor1150Cabinet } from "@/modules/devices/dvor-1150/dvor-1150-cabinet";
import styles from "@/modules/devices/dvor-1150/dvor-1150-block-diagram.module.css";

describe("DVOR 1150 source-aligned cabinet", () => {
  it("shows upright main/standby BCPS behind the cutaway power panel (Fig. 1-4, PDF 26)", () => {
    const { container } = render(<Dvor1150Cabinet surface="electronics" selectedHotspotIds={new Set()} onSelect={vi.fn()} />);
    const rear = container.querySelector('[data-layer="behind-power-panel"]')!;
    const units = rear.querySelectorAll("rect");
    const hotspots = DVOR_1150_BLOCK_BY_ID.get("bcps")!.cabinetHotspots;
    expect(units).toHaveLength(2);
    hotspots.forEach((hotspot, index) => {
      expect(hotspot.height).toBeGreaterThan(hotspot.width);
      expect(hotspot.y).toBeGreaterThanOrEqual(856);
      expect(hotspot.y + hotspot.height).toBeLessThanOrEqual(944);
      for (const key of ["x", "y", "width", "height"] as const) {
        expect(units[index]).toHaveAttribute(key, String(hotspot[key]));
      }
    });
    expect(hotspots[0].x + hotspots[0].width).toBeLessThan(hotspots[1].x);
    expect(rear.querySelector("circle")).toBeNull();
    const front = container.querySelector(`.${styles.cabinetPowerModule}`)!;
    expect(rear.compareDocumentPosition(front) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(front.firstElementChild?.tagName).toBe("path");
    expect(screen.getByText("BEHIND POWER PANEL")).toBeInTheDocument();
    expect(DVOR_1150_BLOCK_BY_ID.get("bcps")!.manualReference).toContain("PDF page 26");
  });

  it("removes connector grids from the covered commutator plates, retaining the control and ribbons (Fig. 1-5, PDF 31)", () => {
    const { container } = render(<Dvor1150Cabinet surface="commutator" selectedHotspotIds={new Set()} onSelect={vi.fn()} />);
    expect(container.querySelectorAll(`.${styles.commutatorBoard}`)).toHaveLength(2);
    expect(container.querySelectorAll(`.${styles.ribbonCable}`)).toHaveLength(2);
    expect(container.querySelectorAll(`circle.${styles.controlConnector}`)).toHaveLength(1);
    const plateConnectors = Array.from(container.querySelectorAll("circle")).filter((node) => {
      const x = Number(node.getAttribute("cx"));
      const y = Number(node.getAttribute("cy"));
      return x >= 130 && x <= 470 && ((y >= 104 && y <= 456) || (y >= 628 && y <= 920));
    });
    expect(plateConnectors).toHaveLength(0);
    expect(screen.queryByText("BEHIND POWER PANEL")).not.toBeInTheDocument();
  });

  it.each(["electronics", "commutator"] as const)("preserves every %s selectable identity and highlight", (surface) => {
    const onSelect = vi.fn();
    const { rerender, container } = render(<Dvor1150Cabinet surface={surface} selectedHotspotIds={new Set()} onSelect={onSelect} />);
    expect(container.querySelector('[data-selected="true"]')).toBeNull();
    const targets = DVOR_1150_BLOCKS.flatMap((block) => block.cabinetHotspots
      .filter((hotspot) => hotspot.surface === surface).map((hotspot) => ({ block, hotspot })));
    targets.forEach(({ block, hotspot }, index) => {
      const button = screen.getByRole("button", { name: `Chọn ${hotspot.assemblyId} ${hotspot.shortLabel}` });
      expect(button).toHaveAttribute("aria-pressed", "false");
      fireEvent.keyDown(button, { key: "Escape" });
      expect(onSelect).toHaveBeenCalledTimes(index);
      if (index === 0) fireEvent.click(button);
      else fireEvent.keyDown(button, { key: index % 2 ? "Enter" : " " });
      expect(onSelect).toHaveBeenLastCalledWith(block.id, hotspot);
    });
    for (const { hotspot } of targets) {
      rerender(<Dvor1150Cabinet surface={surface} selectedHotspotIds={new Set([hotspot.id])} onSelect={onSelect} />);
      expect(screen.getByRole("button", { name: `Chọn ${hotspot.assemblyId} ${hotspot.shortLabel}` }))
        .toHaveAttribute("data-selected", "true");
      expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
    }
  });
});
