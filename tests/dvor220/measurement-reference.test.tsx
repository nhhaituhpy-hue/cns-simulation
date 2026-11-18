import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StrictMode } from "react";
import { Dvor220BlockDiagram } from "@/modules/operations/dvor-220/dvor220-block-diagram";
import { DVOR_220_BLOCK_BY_ID } from "@/modules/operations/dvor-220/block-diagram-data";

// Only the test owns JSDOM's missing native modal lifecycle; browser QA covers focus trapping.
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    } },
  });
});
afterEach(cleanup);

// Exercise the actual cabinet -> point -> instrument path, not an isolated stub.
describe("DVOR 220 source-backed measurement references", () => {
  it.each(["cma", "sma-lsb", "sma-usb"] as const)("%s shows source-backed software calibration procedures without fake physical screws", (blockId) => {
    render(<Dvor220BlockDiagram />);
    const block = DVOR_220_BLOCK_BY_ID.get(blockId)!;
    const hotspot = block.cabinetHotspots[0];
    fireEvent.click(screen.getAllByRole("button", { name: `${hotspot.shortLabel}, ${hotspot.assemblyId}` })[0]);
    const procedures = screen.getByRole("region", { name: "Tham chiếu hiệu chỉnh" });
    expect(procedures).toHaveTextContent("Không mô phỏng thao tác hiệu chỉnh");
    for (const item of block.adjustments!) {
      expect(within(procedures).getByText(item.label)).toBeInTheDocument();
      expect(within(procedures).getAllByText(item.control).length).toBeGreaterThan(0);
      expect(within(procedures).getByText(item.target)).toBeInTheDocument();
      expect(within(procedures).getAllByText(item.source).length).toBeGreaterThan(0);
    }
    expect(within(procedures).queryByRole("button")).not.toBeInTheDocument();
  });
  it("clears stale references and restores body overflow on block/occurrence switch and unmount", () => {
    document.body.style.overflow = "auto";
    const view = render(<StrictMode><Dvor220BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A2A5" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal" }));
    expect(document.body.style.overflow).toBe("hidden");
    // Programmatic navigation exercises cleanup; native modal blocks background user input.
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A3A5" })[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto");
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal" }));
    fireEvent.click(screen.getAllByRole("button", { name: "MON 1, 1A2A7" })[0]);
    expect(document.querySelector("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu TP49 Baseband" }));
    view.unmount();
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });
  it("dismisses only actual backdrop clicks and returns focus through StrictMode replay", () => {
    render(<StrictMode><Dvor220BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A2A5" })[0]);
    const trigger = screen.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    dialog.getBoundingClientRect = () => ({ left: 10, right: 110, top: 10, bottom: 110, width: 100, height: 100, x: 10, y: 10, toJSON: () => ({}) });
    fireEvent.click(dialog, { clientX: 50, clientY: 50 });
    expect(dialog).toHaveAttribute("open");
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    expect(document.querySelector("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
  it("shows a negative DC rail as a DMM reference with source, not a fabricated waveform", () => {
    render(<Dvor220BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "DC/DC, 1A2A4" })[0]);
    const point = DVOR_220_BLOCK_BY_ID.get("dcdc-tx")!.testPoints.find((item) => item.id === "-15 V")!;
    fireEvent.click(screen.getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label}` }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(point.instrument!)).toBeInTheDocument();
    expect(within(dialog).getByText(point.nominal!)).toBeInTheDocument();
    expect(within(dialog).getByText(point.tolerance!)).toBeInTheDocument();
    expect(within(dialog).getByText(point.source!)).toBeInTheDocument();
    expect(within(dialog).getByText(/Chưa có ảnh waveform tham chiếu/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("meter")).not.toBeInTheDocument();
  });
  it("opens the same source reference from a keyboard-operated faceplate TEST PIN", () => {
    render(<Dvor220BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A2A5" })[0]);
    const faceplate = screen.getByRole("group", { name: "Mặt panel MSG" });
    const pin = within(faceplate).getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal trên panel" });
    expect(pin).toHaveAttribute("data-connector-kind", "test-pin");
    pin.focus();
    fireEvent.keyDown(pin, { key: "Enter" });
    expect(within(screen.getByRole("dialog")).getByText(/Figure 7-12/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Đóng ×" }));
    expect(pin).toHaveFocus();
    fireEvent.keyDown(pin, { key: " " });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("switches TP49 waveform conditions without remounting the native dialog", () => {
    render(<StrictMode><Dvor220BlockDiagram /></StrictMode>);
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A2A5" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("button", { name: "Đóng ×" })).toHaveFocus();
    expect(within(dialog).getByRole("button", { name: "TP49 Carrier" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(dialog).getByRole("button", { name: "TP49 Carrier - Ident key down" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("img")).toHaveAttribute("alt", "Dạng sóng Carrier tại TP49 của MSG khi phát Ident");
    expect(within(dialog).getByText(/Figure 7-13/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Figure 7-12/)).not.toBeInTheDocument();
  });
  it("keeps captured scope readings and setup explicitly separate from manufacturer limits", () => {
    render(<Dvor220BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A2A5" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal" }));
    const dialog = screen.getByRole("dialog");
    const point = DVOR_220_BLOCK_BY_ID.get("msg")!.testPoints.find((item) => item.id === "TP49")!;
    const initial = point.waveforms![0];
    const ident = point.waveforms![1];
    expect(within(dialog).getByRole("heading", { name: "Số đọc trên ảnh · không phải giới hạn hãng" })).toBeInTheDocument();
    for (const value of [...initial.observedReadings!, ...initial.scopeSettings!]) expect(within(dialog).getByText(value)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: ident.caption }));
    for (const value of ident.observedReadings!) expect(within(dialog).getByText(value)).toBeInTheDocument();
    for (const value of initial.observedReadings!) expect(within(dialog).queryByText(value)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Chưa có dung sai được xác minh; không suy ra giới hạn từ ảnh chụp.")).toBeInTheDocument();
  });
  it("opens a point's source waveform with reference-only status and returns focus on Escape", () => {
    render(<Dvor220BlockDiagram />);
    fireEvent.click(screen.getAllByRole("button", { name: "MSG, 1A2A5" })[0]);
    const trigger = screen.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Tham chiếu từ manual.*không phải số đo trực tiếp/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Figure 7-12/)).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: /Carrier/ })).toBeInTheDocument();
    // Browsers translate Escape in a native dialog into a cancel event.
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
