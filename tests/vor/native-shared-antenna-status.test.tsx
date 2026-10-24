import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { MonitorAlarmLimits } from "@/components/vor/screens/monitor-alarm-limits";
import { RmsStatusLayout } from "@/components/vor/screens/rms-status-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => {
  const store = useVorPmdtStore;
  store.getState().reset();
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
});

it("the single Antenna 2 enable checkbox stages both monitor paths atomically", () => {
  const store = useVorPmdtStore;
  const before = store.getState().derived;
  render(<MonitorAlarmLimits />);
  fireEvent.click(screen.getByLabelText("monitorAntennas.0.secondAntennaEnabled"));
  expect(store.getState().configDraft.monitor.antennas.mon1.secondAntennaEnabled).toBe(true);
  expect(store.getState().configDraft.monitor.antennas.mon2.secondAntennaEnabled).toBe(true);
  expect(store.getState().derived).toBe(before);
  act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
  expect(store.getState().config.monitor.antennas.mon2.secondAntennaEnabled).toBe(true);
});

it("RMS renders a Secondary limit violation yellow rather than Primary red", () => {
  const store = useVorPmdtStore;
  store.getState().setConfigValue("monitor.routing.rfLevel.secondary", true);
  store.getState().setConfigValue("monitor.calibration.mon2.rfLevelOffset", 15);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.setState({ activeScreen: "rms-status", activeView: "rms-status-monitor-tx", activeMenuPath: ["RMS", "Status"] });
  render(<RmsStatusLayout />);
  fireEvent.click(screen.getByRole("tab", { name: "Monitor/Transmitter Status" }));
  expect(document.querySelector('[data-vor-field-id="rmsMonitorTransmitterStatus.monitors.1.secondaryAlarm"]')).toHaveAttribute("class", expect.stringContaining("--yellow"));
});
