import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TxStatus } from "@/components/vor/screens/tx-status";
import { MonitorConfigGeneral } from "@/components/vor/screens/monitor-config-general";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function maintenance() {
  const store = useVorPmdtStore;
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  return store;
}

beforeEach(() => useVorPmdtStore.getState().reset());

describe("1150A native monitor general controls", () => {
  it("can enable Notch Monitor from its initially unchecked native checkbox, staging until Apply", () => {
    const store = maintenance();
    render(<MonitorConfigGeneral />);
    const checkbox = screen.getByRole("checkbox", { name: "Notch Monitor enabled" });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(store.getState().configDraft.monitor.routing.notchMonitor.primary).toBe(true);
    expect(store.getState().config.monitor.routing.notchMonitor.primary).toBe(false);
    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    expect(store.getState().config.monitor.routing.notchMonitor.primary).toBe(true);
    fireEvent.click(checkbox);
    expect(store.getState().configDraft.monitor.routing.notchMonitor.primary).toBe(false);
    expect(store.getState().configDraft.monitor.routing.notchMonitor.secondary).toBe(false);
    act(() => store.getState().discardConfigChanges());
    expect(checkbox).toBeChecked();
  });
  it("classifies a parameter exclusively as Primary or Secondary through native radios", () => {
    const store = maintenance();
    render(<MonitorConfigGeneral />);
    const secondary = document.querySelector<HTMLInputElement>('[data-vor-config-field-id="monitor.routing.rfLevel.secondary"]')!;
    expect(secondary).toHaveAttribute("type", "radio");
    fireEvent.click(secondary);
    expect(store.getState().configDraft.monitor.routing.rfLevel).toEqual({ primary: false, secondary: true });
    expect(store.getState().config.monitor.routing.rfLevel).toEqual({ primary: true, secondary: false });
  });
});

describe("1150A native transmitter status isolation", () => {
  it.each([1, 2] as const)("renders only TX%s's own fault in its status panel", (txNumber) => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters[txNumber === 1 ? "tx1" : "tx2"].faults.overtemperature = true;
    useVorPmdtStore.getState().replaceConfig(config);
    const { rerender } = render(<TxStatus txNumber={txNumber} />);
    expect(screen.getByLabelText("PA Thermal Shutdown: red")).toBeInTheDocument();
    rerender(<TxStatus txNumber={txNumber === 1 ? 2 : 1} />);
    expect(screen.getByLabelText("PA Thermal Shutdown: green")).toBeInTheDocument();
  });

  it("does not modify monitor readings or the other TX when only a standby status fault is set", () => {
    const config = createDefaultDvor1150aConfig();
    const before = buildDvor1150aSnapshot(config);
    config.transmitters.tx2.faults.overtemperature = true;
    const after = buildDvor1150aSnapshot(config);
    expect(after.monitors).toEqual(before.monitors);
    expect(after.effectiveTransmitters.tx1).toEqual(before.effectiveTransmitters.tx1);
  });
});
