import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { DvorBlockDiagram } from "@/modules/devices/dvor-1150a/dvor-block-diagram";

// JSDOM does not implement native modal lifecycle/focus. Browser QA covers it.
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openTrim(id: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Điều chỉnh ${id} `) }));
  return screen.getByRole("dialog");
}
function turnClockwise(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Thuận chiều kim đồng hồ" }));
}

describe("Sideband adjustment on the real block diagram", () => {
  it("stays open through StrictMode effect replay", () => {
    render(<StrictMode><DvorBlockDiagram /></StrictMode>);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A1" }));
    const dialog = openTrim("R3");
    turnClockwise(dialog);
    expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.17 W");
  });
  it("isolates all four actual cabinet occurrences and both channels, retaining values through other modules", () => {
    render(<DvorBlockDiagram />);
    const cabinets = ["1A4A1", "1A4A2", "1A4A6", "1A4A7"];
    for (const [index, cabinet] of cabinets.entries()) {
      fireEvent.click(screen.getByRole("button", { name: `Chọn ${cabinet}` }));
      const dialog = openTrim("R3");
      expect(dialog).toHaveTextContent(cabinet);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.00 W");
      for (let i = 0; i <= index; i++) turnClockwise(dialog);
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
      const lower = openTrim("R6");
      expect(within(lower).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.00 W");
      fireEvent.click(within(lower).getByRole("button", { name: "Đóng" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A3A2" }));
    for (const [index, cabinet] of cabinets.entries()) {
      fireEvent.click(screen.getByRole("button", { name: `Chọn ${cabinet}` }));
      const dialog = openTrim("R3");
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent(`${(3 + (index + 1) / 6).toFixed(2)} W`);
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
  });
  it("opens all trims with keyboard; calibration changes only PMDT, phase changes control voltage", () => {
    render(<DvorBlockDiagram />);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A1" }));
    for (const [id, tp] of [["R1", "TP4"], ["R4", "TP10"]]) {
      const trigger = screen.getByRole("button", { name: new RegExp(`^Điều chỉnh ${id} `) });
      fireEvent.keyDown(trigger, { key: id === "R1" ? "Enter" : " " });
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByLabelText("Điện áp điều khiển pha")).toHaveTextContent(`${tp} · 6.00 VDC`);
      expect(within(dialog).queryByText(/WATTMETER|PMDT/)).not.toBeInTheDocument();
      turnClockwise(dialog);
      expect(within(dialog).getByLabelText("Điện áp điều khiển pha")).toHaveTextContent("6.33 VDC");
      expect(dialog).toHaveTextContent("Quy ước đào tạo");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
    for (const id of ["R2", "R5"]) {
      const dialog = openTrim(id);
      expect(within(dialog).getByText("PMDT · CAL")).toBeInTheDocument();
      turnClockwise(dialog);
      expect(within(dialog).getByLabelText("Số đọc PMDT mô phỏng")).toHaveTextContent("3.05 W");
      expect(within(dialog).getByLabelText("Công suất tham chiếu")).toHaveTextContent("3.00 W");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
    for (const id of ["R3", "R6"]) {
      const dialog = openTrim(id);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.00 W");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
  });
  it("clamps wattmeter and screw together at 1–5 W, reverses immediately, and retains readings after dismissal", () => {
    render(<DvorBlockDiagram />);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A1" }));
    for (const id of ["R3", "R6"]) {
      let dialog = openTrim(id);
      for (let i = 0; i < 30; i++) turnClockwise(dialog);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("5.00 W");
      expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("180°");
      const ccw = within(dialog).getByRole("button", { name: "Ngược chiều kim đồng hồ" });
      fireEvent.click(ccw);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("4.83 W");
      for (let i = 0; i < 30; i++) fireEvent.click(ccw);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("1.00 W");
      expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("-180°");
      fireEvent.click(within(dialog).getByRole("heading"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(dialog); // native backdrop events target the dialog
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      dialog = openTrim(id);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("1.00 W");
      fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
  });
  it("opens R3 as a wattmeter and immediately rotates the screw with increasing power", () => {
    render(<DvorBlockDiagram />);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A1" }));
    const dialog = openTrim("R3");
    expect(within(dialog).getByText("WATTMETER")).toBeInTheDocument();
    expect(within(dialog).queryByText(/PMDT/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole("meter", { name: "Thang công suất đào tạo" })).toHaveAttribute("min", "1");
    expect(within(dialog).getByRole("meter", { name: "Thang công suất đào tạo" })).toHaveAttribute("max", "5");
    expect(within(dialog).getByRole("meter", { name: "Thang công suất đào tạo" })).toHaveAttribute("value", "3");
    expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.00 W");
    turnClockwise(dialog);
    expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.17 W");
    expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("15°");
    expect(within(dialog).getByTestId("screwdriver-rotation")).toHaveAttribute("transform", "rotate(15 100 100)");
  });
});
