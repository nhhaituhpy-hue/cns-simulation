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
    expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.52 W");
  });
  it("isolates all four actual cabinet occurrences and both channels, retaining values through other modules", () => {
    render(<DvorBlockDiagram />);
    const cabinets = ["1A4A1", "1A4A2", "1A4A6", "1A4A7"];
    for (const [index, cabinet] of cabinets.entries()) {
      fireEvent.click(screen.getByRole("button", { name: `Chọn ${cabinet}` }));
      const dialog = openTrim("R3");
      expect(dialog).toHaveTextContent(cabinet);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.50 W");
      for (let i = 0; i <= index; i++) turnClockwise(dialog);
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
      const lower = openTrim("R6");
      expect(within(lower).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.50 W");
      fireEvent.click(within(lower).getByRole("button", { name: "Đóng" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A3A2" }));
    for (const [index, cabinet] of cabinets.entries()) {
      fireEvent.click(screen.getByRole("button", { name: `Chọn ${cabinet}` }));
      const dialog = openTrim("R3");
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent(`${(2.5 + (index + 1) * 15 / 720).toFixed(2)} W`);
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
      expect(within(dialog).getByText("Transmitter Data")).toBeInTheDocument();
      turnClockwise(dialog);
      expect(within(dialog).getByLabelText(`PMDT Tx #1 ${id === "R2" ? "SB1" : "SB2"}`)).toHaveTextContent("2.54 W");
      expect(within(dialog).getByLabelText("Công suất tham chiếu")).toHaveTextContent("2.50 W");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
    for (const id of ["R3", "R6"]) {
      const dialog = openTrim(id);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.50 W");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
  });
  it.each([
    ["1A4A1", 1, 1], ["1A4A2", 1, 3], ["1A4A6", 2, 1], ["1A4A7", 2, 3],
  ] as const)("%s projects all four PMDT channels of Tx %s and keeps ADJ/CAL independent", (cabinet, tx, firstSb) => {
    render(<DvorBlockDiagram />);
    const expected = [2.5, 2.5, 2.5, 2.5];
    fireEvent.click(screen.getByRole("button", { name: `Chọn ${cabinet}` }));
    for (const [index, cal, adj] of [[0, "R2", "R3"], [1, "R5", "R6"]] as const) {
      const sb = firstSb + index;
      let dialog = openTrim(cal);
      expect(within(dialog).getByText("Transmitter Data")).toBeInTheDocument();
      expect(within(dialog).queryByRole("meter")).not.toBeInTheDocument();
      expect(within(dialog).queryByLabelText("Bước xoay")).not.toBeInTheDocument();
      for (let channel = 1; channel <= 4; channel++) {
        expect(within(dialog).getByLabelText(`PMDT Tx #${tx} SB${channel}`)).toHaveTextContent(`${expected[channel - 1].toFixed(2)} W`);
      }
      for (let i = 0; i < 6; i++) turnClockwise(dialog); // independent +10% CAL
      expected[sb - 1] = 2.75;
      expect(within(dialog).getByLabelText(`PMDT Tx #${tx} SB${sb}`)).toHaveTextContent("2.75 W");
      expect(within(dialog).getByLabelText("Công suất tham chiếu")).toHaveTextContent("2.50 W");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
      dialog = openTrim(adj);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.50 W");
      fireEvent.change(within(dialog).getByLabelText("Bước xoay"), { target: { value: "360" } });
      turnClockwise(dialog);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("3.00 W");
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
      dialog = openTrim(cal);
      expected[sb - 1] = 3.3;
      expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("90°");
      expect(within(dialog).getByLabelText("Công suất tham chiếu")).toHaveTextContent("3.00 W");
      for (let channel = 1; channel <= 4; channel++) {
        expect(within(dialog).getByLabelText(`PMDT Tx #${tx} SB${channel}`)).toHaveTextContent(`${expected[channel - 1].toFixed(2)} W`);
      }
      fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    }
    // The other assembly of this TX must project the same four readings.
    const peer = { "1A4A1": "1A4A2", "1A4A2": "1A4A1", "1A4A6": "1A4A7", "1A4A7": "1A4A6" }[cabinet];
    fireEvent.click(screen.getByRole("button", { name: `Chọn ${peer}` }));
    let dialog = openTrim("R2");
    for (let channel = 1; channel <= 4; channel++) {
      expect(within(dialog).getByLabelText(`PMDT Tx #${tx} SB${channel}`)).toHaveTextContent(`${expected[channel - 1].toFixed(2)} W`);
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
    fireEvent.click(screen.getByRole("button", { name: `Chọn ${tx === 1 ? "1A4A6" : "1A4A1"}` }));
    dialog = openTrim("R2");
    for (let channel = 1; channel <= 4; channel++) {
      expect(within(dialog).getByLabelText(`PMDT Tx #${tx === 1 ? 2 : 1} SB${channel}`)).toHaveTextContent("2.50 W");
    }
  });
  it.each(["R1", "R2", "R4", "R5"])("%s retains its ±180 degree range without coarse controls", (id) => {
    render(<DvorBlockDiagram />);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A1" }));
    const dialog = openTrim(id);
    expect(within(dialog).queryByLabelText("Bước xoay")).not.toBeInTheDocument();
    for (let i = 0; i < 15; i++) turnClockwise(dialog);
    expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent(/^180°$/);
    expect(within(dialog).getByRole("button", { name: "Thuận chiều kim đồng hồ" })).toBeDisabled();
    const ccw = within(dialog).getByRole("button", { name: "Ngược chiều kim đồng hồ" });
    fireEvent.click(ccw);
    expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent(/^165°$/);
    for (let i = 0; i < 25; i++) fireEvent.click(ccw);
    expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent(/^-180°$/);
    expect(ccw).toBeDisabled();
  });
  it("clamps wattmeter and screw together at 0–5 W, reverses immediately, and retains readings after dismissal", () => {
    render(<DvorBlockDiagram />);
    fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A1" }));
    for (const id of ["R3", "R6"]) {
      let dialog = openTrim(id);
      fireEvent.change(within(dialog).getByLabelText("Bước xoay"), { target: { value: "360" } });
      for (let i = 0; i < 6; i++) turnClockwise(dialog);
      fireEvent.change(within(dialog).getByLabelText("Bước xoay"), { target: { value: "15" } });
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("5.00 W");
      expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("1800°");
      const ccw = within(dialog).getByRole("button", { name: "Ngược chiều kim đồng hồ" });
      fireEvent.click(ccw);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("4.98 W");
      fireEvent.change(within(dialog).getByLabelText("Bước xoay"), { target: { value: "360" } });
      for (let i = 0; i < 11; i++) fireEvent.click(ccw);
      expect(within(dialog).getByLabelText("Số vòng từ vị trí chuẩn")).toHaveTextContent("-5.00 vòng");
      fireEvent.change(within(dialog).getByLabelText("Bước xoay"), { target: { value: "15" } });
      turnClockwise(dialog);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("0.02 W");
      fireEvent.click(ccw);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("0.00 W");
      expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("-1800°");
      fireEvent.click(within(dialog).getByRole("heading"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(dialog); // native backdrop events target the dialog
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      dialog = openTrim(id);
      expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("0.00 W");
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
    expect(within(dialog).getByRole("meter", { name: "Thang công suất đào tạo" })).toHaveAttribute("min", "0");
    expect(within(dialog).getByRole("meter", { name: "Thang công suất đào tạo" })).toHaveAttribute("max", "5");
    expect(within(dialog).getByRole("meter", { name: "Thang công suất đào tạo" })).toHaveAttribute("value", "2.5");
    expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.50 W");
    turnClockwise(dialog);
    expect(within(dialog).getByLabelText("Công suất mô phỏng")).toHaveTextContent("2.52 W");
    expect(within(dialog).getByLabelText("Góc xoay")).toHaveTextContent("15°");
    expect(within(dialog).getByTestId("screwdriver-rotation")).toHaveAttribute("transform", "rotate(15 100 100)");
  });
});
