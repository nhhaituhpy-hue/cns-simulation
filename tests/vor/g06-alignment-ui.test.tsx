import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { DvorAlignmentFeedback } from "@/modules/devices/dvor-1150a/alignment-feedback";
import { TxConfigOffsets } from "@/components/vor/screens/tx-config-offsets";
import { useVorPmdtStore as store } from "@/stores/vor-pmdt-store";

beforeEach(() => { store.getState().reset();store.getState().login("SEC3", "THREE");store.getState().setConfigValue("simulation.local", true); });
afterEach(() => { cleanup();store.getState().reset(); });

it("shows live phase TP failures and HC limits outside the authentic PMDT table", () => {
  const { container } = render(<><DvorAlignmentFeedback blockId="sideband" occurrenceId="sideband-1a4a1" /><TxConfigOffsets /></>);
  expect(screen.getByLabelText("TP6 đo mô phỏng")).toHaveAttribute("data-status", "pass");
  act(() => { store.getState().setConfigValue("transmitters.tx1.offsets.sideband1PhaseOffset", 1);store.getState().applyConfigChanges();store.getState().turnSidebandTrim("sideband-1a4a1", "R1", 180); });
  expect(screen.getByLabelText("TP6 đo mô phỏng")).toHaveTextContent("0.100 VDC · Ngoài dải HC");
  expect(screen.getByLabelText("TP4 đo mô phỏng")).toHaveTextContent("10.000 VDC · Ngoài dải HC");
  const native = container.querySelector('[aria-label="Transmitter offsets and scale factors"]') as HTMLElement;
  expect(native).not.toHaveTextContent(/TP6|DMM|50 mV|R1/);
  act(() => store.getState().setTransmitterMode("tx1", "off"));
  expect(screen.getByLabelText("TP6 đo mô phỏng")).toHaveTextContent("Không có tín hiệu đo");
});

it("reads both synthesizer occurrences and rejects unknown/missing hardware rather than falling back to TX1", () => {
  const view = render(<DvorAlignmentFeedback blockId="synthesizer" occurrenceId="synth-1a3a1" />);
  expect(screen.getByLabelText("TP1 đo mô phỏng")).toHaveTextContent("0.000");
  view.rerender(<DvorAlignmentFeedback blockId="synthesizer" occurrenceId="synth-1a3a11" />);
  expect(screen.getByLabelText("TP1 đo mô phỏng")).toHaveTextContent("Không có tín hiệu đo");
  view.rerender(<DvorAlignmentFeedback blockId="sideband" occurrenceId="unknown" />);expect(view.container).toBeEmptyDOMElement();
  view.rerender(<DvorAlignmentFeedback blockId="sideband" />);expect(view.container).toBeEmptyDOMElement();
});

it("labels the two monitor inputs separately and does not offer automatic calibration or flight acceptance", () => {
  render(<><DvorAlignmentFeedback blockId="monitor-cca" occurrenceId="monitor-1a3a3" /><DvorAlignmentFeedback blockId="monitor-cca" occurrenceId="monitor-1a3a10" /></>);
  const first = screen.getByRole("region", { name: "Hiệu chỉnh mô phỏng monitor-1a3a3" });
  expect(within(first).getByText(/Không tự đặt tử số deviation/)).toBeInTheDocument();
  const before = screen.getByLabelText("mon2 hz30Modulation chỉ thị").textContent;
  act(() => { store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 110);store.getState().applyConfigChanges(); });
  expect(screen.getByLabelText("mon2 hz30Modulation chỉ thị")).toHaveTextContent(before!);
  expect(screen.queryByRole("button")).toBeNull();
});
