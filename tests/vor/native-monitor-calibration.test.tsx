import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MonitorOffsets } from "@/components/vor/screens/monitor-offsets";
import { MonitorTestResults } from "@/components/vor/screens/monitor-test-results";
import { MonitorIntegral } from "@/components/vor/screens/monitor-integral";
import { createDefaultDvor1150aConfig, getDvorConfigValue, validateDvorConfig, dvorConfigFieldCatalog } from "@/lib/dvor1150a";
import { parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());
function maintenance() {
  const store = useVorPmdtStore;
  store.getState().login("SEC3", "THREE");
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  return store;
}

describe("1150A test-generator certification", () => {
  it("accepts old v1 saved profiles without the additive certification branch", () => {
    const old = createDefaultDvor1150aConfig();
    delete old.monitor.testGeneratorCalibration;
    old.transmitters.tx1.offsets.outputPowerScale = 79;
    const parsed = parseDvor1150aConfig(old);
    expect(parsed).not.toBeNull();
    expect(parsed?.transmitters.tx1.offsets.outputPowerScale).toBe(79);
    expect(validateDvorConfig(old)).toEqual([]);
    expect(getDvorConfigValue(old, "monitor.testGeneratorCalibration.mon1.hz30ModulationScale")).toBe(100);
  });
  it.each([1, 2] as const)("edits MON%s test-generator scale and affects only that monitor's generator reading after Apply", (mon) => {
    const store = maintenance();
    const before = store.getState();
    const { unmount } = render(<MonitorOffsets monitorNumber={mon} />);
    const scale = screen.getByLabelText(`monitorOffsets.${mon}.1.testGen`);
    expect(scale).not.toBeDisabled();
    fireEvent.focus(scale);
    fireEvent.change(scale, { target: { value: "80" } });
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().derived).toBe(before.derived);
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    expect(store.getState().derived.monitors).toEqual(before.derived.monitors);
    expect(store.getState().derived.effectiveTransmitters).toEqual(before.derived.effectiveTransmitters);
    unmount();
    act(() => store.getState().openScreen("monitor-test-results", [`Monitor ${mon}`, "Test Results"], "Test Results"));
    const { unmount: unmountResults } = render(<MonitorTestResults />);
    fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
    expect(document.querySelector(`[data-vor-field-id="testGeneratorResults.mon${mon}.hz30Modulation"]`)).toHaveTextContent("24.0");
    unmountResults();
    act(() => store.getState().openScreen("monitor-test-results", [`Monitor ${mon === 1 ? 2 : 1}`, "Test Results"], "Test Results"));
    render(<MonitorTestResults />);
    fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
    expect(document.querySelector(`[data-vor-field-id="testGeneratorResults.mon${mon === 1 ? 2 : 1}.hz30Modulation"]`)).toHaveTextContent("30.0");
  });

  it("keeps genuinely blank certification and standby cells blank", () => {
    maintenance();
    render(<MonitorOffsets monitorNumber={1} />);
    expect(document.querySelector('[data-vor-field-id="monitorOffsets.1.4.testGen"] input')).toBeNull();
    expect(document.querySelector('[data-vor-field-id="monitorOffsets.1.0.standby"] input')).toBeNull();
  });
  it("stages test-generator setup and applies the common source without changing on-air monitor data", () => {
    const store = maintenance();
    const before = store.getState();
    render(<MonitorTestResults />);
    fireEvent.click(screen.getByRole("tab", { name: "Test Generator" }));
    const setup = screen.getByLabelText("30 Hz Modulation setup");
    expect(setup).not.toHaveAttribute("readonly");
    fireEvent.change(setup, { target: { value: "35" } });
    expect(document.querySelector('[data-vor-field-id="testGeneratorResults.mon1.hz30Modulation"]')).toHaveTextContent("30.0");
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    expect(document.querySelector('[data-vor-field-id="testGeneratorResults.mon1.hz30Modulation"]')).toHaveTextContent("35.0");
    expect(store.getState().derived.monitors).toEqual(before.derived.monitors);
  });
  it.each([1, 2] as const)("edits MON%s standby power calibration against the load TX only", (mon) => {
    const store = maintenance();
    expect(store.getState().setTransmitterMode("tx2", "load")).toBe(true);
    const before = store.getState();
    render(<MonitorOffsets monitorNumber={mon} />);
    const scale = screen.getByLabelText(`monitorOffsets.${mon}.6.standby`);
    expect(scale).not.toBeDisabled();
    fireEvent.change(scale, { target: { value: "80" } });
    expect(store.getState().derived).toBe(before.derived);
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    const derived = store.getState().derived as typeof before.derived & { standbyMonitors: Record<string, { txPower: number; txFrequencyError: number; transmitter: string | null }> };
    expect(derived.standbyMonitors[`mon${mon}`].transmitter).toBe("tx2");
    expect(derived.standbyMonitors[`mon${mon}`].txPower).toBeCloseTo(before.derived.effectiveTransmitters.tx2.effectiveOutputPower * 0.8);
    expect(derived.standbyMonitors[`mon${mon === 1 ? 2 : 1}`].txPower).toBeCloseTo(before.derived.effectiveTransmitters.tx2.effectiveOutputPower);
    expect(derived.monitors).toEqual(before.derived.monitors);
    expect(derived.data.txPower).toEqual(before.data.txPower);
  });
  it("displays the calibrated standby measurements separately from Integral", () => {
    const store = maintenance();
    store.getState().setTransmitterMode("tx2", "load");
    store.getState().setConfigValue("monitor.standbyCalibration.mon2.txPowerOffset", 5);
    store.getState().setConfigValue("monitor.standbyCalibration.mon2.txFrequencyErrorOffset", 3);
    expect(store.getState().applyConfigChanges()).toBe(true);
    render(<MonitorIntegral monitorNumber={2} />);
    // Figure 3-44's power offset is %, with no verified basis: stored-only.
    expect(document.querySelector('[data-vor-field-id="standbyData.mon2.txPower"]')).toHaveTextContent("65.5");
    expect(document.querySelector('[data-vor-field-id="standbyData.mon2.txFrequencyError"]')).toHaveTextContent("3.0");
  });
  it("identifies stored-only calibration and removes TG cells absent from Figure 3-44", () => {
    maintenance();
    render(<MonitorOffsets monitorNumber={1} />);
    expect(screen.getByLabelText("monitorOffsets.1.7.integral")).toHaveAttribute("data-vor-effect", "stored-only");
    expect(screen.getByText(/Chỉ lưu cấu hình/)).toBeInTheDocument();
    expect(document.querySelector('[data-vor-field-id="monitorOffsets.1.6.testGen"] input')).toBeNull();
    expect(document.querySelector('[data-vor-field-id="monitorOffsets.1.7.testGen"] input')).toBeNull();
    expect(document.querySelector('[data-vor-field-id="monitorOffsets.1.8.testGen"] input')).toBeNull();
    expect(dvorConfigFieldCatalog.filter(field => field.id.startsWith("monitor.testGeneratorCalibration."))).toHaveLength(10);
  });
});
