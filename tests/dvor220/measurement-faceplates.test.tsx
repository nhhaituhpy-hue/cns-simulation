import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DVOR_220_BLOCK_BY_ID } from "@/modules/operations/dvor-220/block-diagram-data";
import { Dvor220ModuleFaceplate } from "@/modules/operations/dvor-220/dvor220-module-faceplates";
import { Dvor220BlockDiagram } from "@/modules/operations/dvor-220/dvor220-block-diagram";

afterEach(cleanup);

describe("DVOR 220 source-aligned measurement connectors", () => {
  it.each(["tsg", "scu", "dcdc-aux", "dcdc-tx", "sma-lsb", "sma-usb", "cma", "msg", "syn", "mon", "pdc", "pmu"] as const)("%s maps each physical connector to its exact catalog point", (blockId) => {
    const block = DVOR_220_BLOCK_BY_ID.get(blockId)!;
    const select = vi.fn();
    render(<Dvor220ModuleFaceplate kind={block.faceplate!} blockId={blockId} onSelectPoint={select} />);
    const panel = screen.getByRole("group");
    const buttons = within(panel).getAllByRole("button");
    expect(buttons).toHaveLength(block.testPoints.length);
    for (const point of block.testPoints) {
      const pin = within(panel).getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label} trên panel` });
      expect(pin).toHaveAttribute("data-point-id", point.id);
      fireEvent.click(pin);
      expect(select).toHaveBeenLastCalledWith(point);
      const kind = (blockId === "msg" && point.id !== "sync-30hz") || blockId === "mon" || (blockId === "syn" && point.id.startsWith("TP"))
        ? "test-pin"
        : ["tsg", "sma-lsb", "sma-usb", "cma", "msg", "syn", "pdc"].includes(blockId) ? "bnc" : "test-jack";
      expect(pin).toHaveAttribute("data-connector-kind", kind);
    }
  });

  it("opens the unnumbered MSG 30 Hz Sync BNC by semantic ID, without invented electrical limits", () => {
    const block = DVOR_220_BLOCK_BY_ID.get("msg")!;
    const point = block.testPoints.find((item) => item.id === "sync-30hz");
    expect(point).toBeDefined();
    expect(point?.label).toBe("30 Hz Sync");
    expect(point?.nominal).toBe("30 Hz");
    expect(point?.tolerance).toBeUndefined();
    expect(point?.source).toContain("Figure 7-11, PDF 477");
    expect(point?.conditions?.join(" ")).toMatch(/không ghi số hiệu J\/TP/i);
    const select = vi.fn();
    render(<Dvor220ModuleFaceplate kind="msg" blockId="msg" onSelectPoint={select} />);
    const connector = within(screen.getByRole("group")).getByRole("button", { name: "Xem tín hiệu sync-30hz 30 Hz Sync trên panel" });
    expect(connector).toHaveAttribute("data-connector-kind", "bnc");
    expect(connector).toHaveAttribute("data-point-id", "sync-30hz");
    fireEvent.click(connector);
    expect(select).toHaveBeenLastCalledWith(point);
    fireEvent.keyDown(connector, { key: "Enter" });
    fireEvent.keyDown(connector, { key: " " });
    expect(select).toHaveBeenCalledTimes(3);
    expect(select).toHaveBeenLastCalledWith(point);
  });

  it("depicts SW2–SW6 as five non-operable rotary frequency switches", () => {
    render(<Dvor220ModuleFaceplate kind="syn" blockId="syn" onSelectPoint={vi.fn()} />);
    const panel = screen.getByRole("group", { name: "Mặt panel SYN" });
    for (const id of ["SW2", "SW3", "SW4", "SW5", "SW6"]) {
      const label = within(panel).getByText(id);
      expect(label.closest("[data-control-kind='rotary-switch']")).toBeInTheDocument();
      expect(label.closest("[role='button']")).toBeNull();
    }
    expect(panel).toHaveAttribute("width", "210");
    expect(panel).toHaveAttribute("height", "720");
  });

  it("renders the PDC standby AM9960 physical trim as an ordered read-only reference", () => {
    render(<Dvor220BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "PDC, 1A8A1" })[0]);
    const region = screen.getByRole("region", { name: "Tham chiếu hiệu chỉnh" });
    const adjustment = DVOR_220_BLOCK_BY_ID.get("pdc")!.adjustments?.find((item) => item.id === "standby-am9960");
    expect(adjustment).toBeDefined();
    expect(adjustment?.control).toBe("1A8A1A1VR1");
    expect(adjustment?.target).toBe("TX1: 30%; kiểm tra TX2: 30 ±0.5%");
    expect(adjustment?.instrument).toContain("Standby MON của MON1");
    expect(adjustment?.source).toContain("§9.6.4, Figure 9-8, PDF 548 (9-22)");
    const steps = adjustment!.conditions;
    expect(steps[0]).toMatch(/TX1.*On Dummy Load/);
    expect(steps[1]).toMatch(/USB SIN.*USB COS.*CARRIER.*LSB.*tắt.*USB Phasing COS to SIN.*cực đại/);
    expect(steps[2]).toMatch(/LSB SIN.*LSB COS.*CARRIER.*USB.*tắt.*LSB Phasing COS to SIN.*cực đại/);
    expect(steps[3]).toMatch(/Tất cả RF ON.*carrier to sideband.*cực đại/);
    expect(steps[4]).toMatch(/1A8A1A1VR1.*Standby MON của MON1.*30%/);
    expect(steps[5]).toMatch(/TX2.*On Dummy Load.*30 ±0.5%/);
    expect(steps.join(" ")).not.toMatch(/clockwise|°|W\/vòng/i);
    expect(region).toHaveTextContent("Không mô phỏng thao tác hiệu chỉnh");
    expect(region).toHaveTextContent(adjustment!.control);
    expect(region).toHaveTextContent(adjustment!.target);
    expect(region).toHaveTextContent(adjustment!.source);
    for (const step of steps) expect(within(region).getByText(step)).toBeInTheDocument();
    expect(within(region).queryByRole("button")).not.toBeInTheDocument();
    expect(region.querySelector("input, select, textarea")).toBeNull();
    const panel = screen.getByRole("group", { name: "Mặt panel PDC · POWER DETECTOR / CHANGEOVER" });
    expect(within(panel).getAllByRole("button")).toHaveLength(5);
  });

  it("does not show an unsourced fixed port correction or a fake live PMU reading", () => {
    const view = render(<Dvor220ModuleFaceplate kind="pdc" blockId="pdc" />);
    expect(screen.queryByText(/-30 dB COUPLED SAMPLE/)).not.toBeInTheDocument();
    expect(screen.getByText(/PORT-SPECIFIC LOSS/)).toBeInTheDocument();
    view.rerender(<Dvor220ModuleFaceplate kind="pmu" blockId="pmu" />);
    expect(screen.queryByText("28.0")).not.toBeInTheDocument();
    expect(screen.getByText("----")).toBeInTheDocument();
  });

  it("preserves the nine MON indicators including the source's duplicate Secondary Alarm label", () => {
    render(<Dvor220ModuleFaceplate kind="mon" blockId="mon" />);
    const panel = screen.getByRole("img", { name: "Mặt panel MON" });
    expect(within(panel).getAllByText("SECONDARY ALARM")).toHaveLength(2);
    expect(panel.querySelectorAll("[data-color]")).toHaveLength(9);
  });
});
