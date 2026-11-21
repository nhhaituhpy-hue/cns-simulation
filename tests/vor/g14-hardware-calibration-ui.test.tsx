import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { DvorBlockDiagram } from "@/modules/devices/dvor-1150a/dvor-block-diagram";
import { createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { TxDataMain } from "@/components/vor/screens/tx-data-main";
import { RmsPowerSupply } from "@/components/vor/screens/rms-power-supply";
import { DvorConfigPanel } from "@/components/vor/dvor-config-panel";

vi.mock("@/components/simulator/simulator-config-persistence", () => ({ SimulatorConfigPersistence: () => null }));
beforeEach(() => {
  useVorPmdtStore.getState().reset();
  const config = createDefaultDvor1150aConfig();
  config.simulation.local = true;
  config.simulation.integralMonitorBypass = true;
  config.transmitters.tx2.load = true;
  useVorPmdtStore.getState().replaceConfig(config);
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const close = () => fireEvent.click(screen.getByRole("button", { name: "Đóng hiệu chỉnh detector" }));
function bcps(id: 1 | 2) {
  fireEvent.click(screen.getByRole("button", { name: `Chọn 1A5A${id}` }));
  fireEvent.click(screen.getByRole("button", { name: `Hiệu chỉnh detector BCPS${id} · mô phỏng phần cứng` }));
  return screen.getByRole("dialog");
}

it("opens the RF pot from the actual faceplate, updates native PMDT and keeps the reference independent through StrictMode", () => {
  const { container } = render(<StrictMode><DvorBlockDiagram /><TxDataMain /><DvorConfigPanel /></StrictMode>);
  fireEvent.click(screen.getByRole("button", { name: "Chọn 1A4A4" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "Điều chỉnh RF Monitor R1" }), { key: "Enter" });
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByLabelText("RF thực TX1")).toHaveTextContent("70.80 W");
  fireEvent.click(within(dialog).getByRole("button", { name: "Tăng R1" }));
  expect(within(dialog).getByLabelText("Góc R1")).toHaveTextContent("15°");
  expect(within(dialog).getByLabelText("RF thực TX1")).toHaveTextContent("70.80 W");
  expect(within(dialog).getByLabelText("RF chỉ thị TX1")).toHaveTextContent("76.70 W");
  expect(container.querySelector('[data-vor-field-id="txPower.0.tx1"]')).toHaveTextContent("76.7");
  expect(container.querySelector('[data-vor-config-field-id^="hardwareCalibration."]')).toBeNull();
  close();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("uses the actual BCPS occurrences, independent DVM/clamp readings and HC tolerances without changing PMDT table columns", () => {
  const { container } = render(<><DvorBlockDiagram /><RmsPowerSupply /></>);
  let dialog = bcps(1);
  fireEvent.click(within(dialog).getByRole("button", { name: "Tăng R30" }));
  expect(within(dialog).getByLabelText("DVM AC")).toHaveTextContent("232.3 VAC");
  expect(within(dialog).getByLabelText("Ampe kìm AC")).toHaveTextContent("2.30 A");
  expect(within(dialog).getByLabelText("Kết quả so sánh AC")).toHaveTextContent("Ngoài dung sai");
  expect(container.querySelector('[data-vor-field-id="rmsVoltageData.9.volts"]')).toHaveTextContent("232.3");
  fireEvent.click(within(dialog).getByRole("button", { name: "Tăng R56" }));
  expect(container.querySelector('[data-vor-field-id="rmsCurrentData.0.amps"]')).toHaveTextContent("2.3");
  expect(within(dialog).getByText(/AC Input trên PMDT lấy AC Monitor riêng/)).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "Giảm R30" }));
  expect(within(dialog).getByLabelText("Kết quả so sánh AC")).toHaveTextContent("Trong dung sai");
  close();
  dialog = bcps(2);
  fireEvent.click(within(dialog).getByRole("button", { name: "Tăng R30" }));
  expect(within(dialog).getByLabelText("Detector AC nội bộ")).toHaveTextContent("236.2 VAC");
  expect(container.querySelector('[data-vor-field-id="rmsVoltageData.9.volts"]')).toHaveTextContent("232.3");
  expect(screen.getAllByRole("columnheader", { name: "Parameter" })).toHaveLength(2);
  expect(screen.queryByRole("combobox", { name: /BCPS/ })).toBeNull();
});

it("shows the guard rather than changing calibration when Local/Bypass are missing", () => {
  render(<DvorBlockDiagram />);
  const dialog = bcps(1);
  act(() => {
    const config = createDefaultDvor1150aConfig();
    useVorPmdtStore.getState().replaceConfig(config);
  });
  expect(within(dialog).getByRole("button", { name: "Tăng R30" })).toBeDisabled();
  expect(within(dialog).getByText("Cần Local và Monitor Bypass để hiệu chỉnh.")).toBeVisible();
  expect(useVorPmdtStore.getState().config.hardwareCalibration!.bcps1.R30).toBe(0);
});
