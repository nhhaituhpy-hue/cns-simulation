import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Dvor1150aMonitorClock } from "@/components/vor/dvor1150a-monitor-clock";
import { PmdtLoginDialog } from "@/components/vor/pmdt-login-dialog";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => {
  vi.useFakeTimers();
  const store = useVorPmdtStore;
  store.getState().reset();
  store.getState().login("SEC3", "THREE");
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("monitor.votingLogic", "OR");
  store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
  store.getState().applyConfigChanges();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); useVorPmdtStore.getState().reset(); });

it("keeps protection running hidden, logged out, disconnected and on another PMDT screen", () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  useVorPmdtStore.setState(state => ({
    config: { ...state.config, simulation: { ...state.config.simulation, connected: false } },
  }));
  useVorPmdtStore.getState().logout();
  render(<Dvor1150aMonitorClock />);
  act(() => vi.advanceTimersByTime(1000));
  expect(useVorPmdtStore.getState().monitorElapsed).toBeCloseTo(1);
  act(() => useVorPmdtStore.getState().openScreen("rms-status", ["RMS", "Status"], "RMS Status"));
  act(() => vi.advanceTimersByTime(4000));
  expect(useVorPmdtStore.getState().protectionState).toMatchObject({ phase: "cold-transfer", remaining: 20 });
  act(() => vi.advanceTimersByTime(20000));
  expect(useVorPmdtStore.getState().derived.voting.activeTransmitter).toBe("tx2");
});

it("uses elapsed monotonic time rather than assuming a throttled callback is 100 ms", () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  render(<Dvor1150aMonitorClock />);
  now = 25_000;
  act(() => vi.advanceTimersByTime(100));
  expect(useVorPmdtStore.getState().derived.voting.activeTransmitter).toBe("tx2");
});

it("preselects the station's SEC3 account without bypassing authentication", () => {
  useVorPmdtStore.getState().reset();
  render(<PmdtLoginDialog />);
  expect(screen.getByLabelText("User ID")).toHaveValue("SEC3");
  expect(screen.getByLabelText("Password")).toHaveValue("");
  expect(useVorPmdtStore.getState().securityLevel).toBe(0);
});
