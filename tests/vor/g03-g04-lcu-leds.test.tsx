import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LcuPanel } from "@/modules/devices/dvor-1150a/dvor-block-diagram";
import { DvorModuleFaceplate } from "@/modules/devices/dvor-1150a/dvor-module-faceplates";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtStatusBar } from "@/components/vor/pmdt-status-bar";

beforeEach(() => useVorPmdtStore.getState().reset());
afterEach(() => { cleanup(); useVorPmdtStore.getState().reset(); });

describe("live LCU", () => {
  it("dispatches each TX control to PMDT and shows route selection even when RF is Off", () => {
    render(<LcuPanel />);
    expect(screen.getByRole("button", { name: "ANTENNA 2" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "LOCAL CONTROL" }));
    fireEvent.click(screen.getByRole("button", { name: "ANTENNA 2" }));
    expect(useVorPmdtStore.getState().derived.mainTransmitter).toBe("tx1");
    expect(useVorPmdtStore.getState().derived.voting.activeTransmitter).toBe("tx2");
    fireEvent.click(screen.getByRole("button", { name: "MAIN SELECT 2" }));
    fireEvent.click(screen.getByRole("button", { name: "OFF 2" }));
    expect(screen.getByRole("button", { name: "ANTENNA 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "MAIN SELECT 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "OFF 2" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "LOAD 2" }));
    expect(useVorPmdtStore.getState().config.transmitters.tx2.load).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "INTEGRAL bypass" }));
    expect(useVorPmdtStore.getState().config.simulation.integralMonitorBypass).toBe(true);
  });

  it("shows all LCD pages with live values, navigates both ways and resets to the first page", () => {
    render(<LcuPanel />);
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("Integral Monitor 1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("Integral Monitor 2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    act(() => useVorPmdtStore.getState().setOverride("rmsVoltageData.9.volts", 221));
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("AC Power 221.00");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("VOR Temps");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("VOR PA Temps");
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("VOR Temps");
    fireEvent.click(screen.getByRole("button", { name: "Main" }));
    expect(screen.getByRole("region", { name: "Màn hình LCU" })).toHaveTextContent("Integral Monitor 1");
  });

  it("tests every LCU indicator, keeps normal fault lamps off, and connects silence, volume and Reset", () => {
    const { container } = render(<><LcuPanel /><PmdtStatusBar /></>);
    for (const label of ["REMOTE CONTROL FAULT", "ON BATTERY", "MAINTENANCE ALERT", "INTERLOCKED OFF"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("data-lit", "false");
    }
    fireEvent.click(screen.getByRole("button", { name: "LAMP TEST" }));
    expect(container.querySelectorAll('i[data-lit="false"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "LAMP TEST" }));
    act(() => useVorPmdtStore.getState().setOverride("rmsStatus.maintenanceAlert", true));
    expect(screen.getByLabelText("MAINTENANCE ALERT")).toHaveAttribute("data-lit", "true");
    expect(screen.getByLabelText("LCU simulated alarm tone")).toHaveAttribute("data-audible", "true");
    fireEvent.click(screen.getByRole("button", { name: "ALARM SILENCE" }));
    expect(screen.getByLabelText("LCU simulated alarm tone")).toHaveAttribute("data-audible", "false");
    fireEvent.change(screen.getByLabelText("LCU alarm volume"), { target: { value: "23" } });
    expect(useVorPmdtStore.getState().lcu.volume).toBe(23);
    fireEvent.click(screen.getByRole("button", { name: "RESET" }));
    expect(useVorPmdtStore.getState().protectionState.remaining).toBe(20);
    expect(screen.getByText("LCU initialization: 20.0 s")).toBeInTheDocument();
    expect(screen.queryByText(/Cold standby:/)).not.toBeInTheDocument();
  });
});

describe("live faceplate LEDs without geometry changes", () => {
  it("never lights BCPS AC ON with AC FAIL or Fast with Trickle, and distinguishes the second supply", () => {
    const { container, rerender } = render(<DvorModuleFaceplate blockId="bcps" occurrenceId="bcps-1a5a1" />);
    const color = (label: string) => container.querySelector(`[data-led="${label}"]`)?.getAttribute("data-color");
    expect(color("AC ON")).toBe("green");
    expect(color("AC FAIL")).toBe("off");
    act(() => useVorPmdtStore.getState().setOverride("rmsCurrentData.6.amps", 1.6));
    expect(color("FAST CHARGE")).toBe("amber");
    expect(color("TRICKLE CHARGE")).toBe("off");
    act(() => useVorPmdtStore.getState().setOverride("rmsVoltageData.15.volts", 40));
    expect(color("BATTERY FAULT")).toBe("red");
    rerender(<DvorModuleFaceplate blockId="bcps" occurrenceId="bcps-1a5a2" />);
    expect(color("BATTERY FAULT")).toBe("off");
    expect(color("CPU OK")).toBe("green");
    act(() => useVorPmdtStore.getState().setOverride("rmsCurrentData.6.amps", 1));
    expect(color("FAST CHARGE")).toBe("off");
    expect(color("TRICKLE CHARGE")).toBe("green");
    act(() => useVorPmdtStore.getState().setOverride("rmsVoltageData.9.volts", 0));
    expect(color("AC ON")).toBe("off");
    expect(color("AC FAIL")).toBe("red");
    expect(color("ON BATTERY")).toBe("amber");
    expect(color("TRICKLE CHARGE")).toBe("off");
  });

  it("derives monitor alarm/pre-alarm LEDs by monitor occurrence, leaving unused standby lamps off", () => {
    const { container, rerender } = render(<DvorModuleFaceplate blockId="monitor-cca" occurrenceId="monitor-1a3a3" />);
    const color = (label: string) => container.querySelector(`[data-led="${label}"]`)?.getAttribute("data-color");
    expect(color("INTEGRAL PRIMARY")).toBe("off");
    act(() => {
      const store = useVorPmdtStore.getState();
      store.login("SEC3", "THREE"); store.lcuCommand("local"); store.lcuCommand("bypass");
      store.setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
      store.applyConfigChanges();
    });
    expect(color("INTEGRAL PRIMARY")).toBe("red");
    act(() => {
      const store = useVorPmdtStore.getState();
      store.setConfigValue("monitor.routing.hz30Modulation.primary", false);
      store.setConfigValue("monitor.routing.hz30Modulation.secondary", true);
      store.applyConfigChanges();
    });
    expect(color("INTEGRAL PRIMARY")).toBe("off");
    expect(color("INTEGRAL SECONDARY")).toBe("amber");
    act(() => {
      const store = useVorPmdtStore.getState();
      store.setConfigValue("monitor.routing.hz30Modulation.primary", true);
      store.setConfigValue("monitor.routing.hz30Modulation.secondary", false);
      store.setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 95);
      store.applyConfigChanges();
    });
    expect(color("INTEGRAL PRIMARY")).toBe("off");
    expect(color("INTEGRAL SECONDARY")).toBe("off");
    expect(color("INTEGRAL PRE ALARM")).toBe("amber");
    for (const label of ["STANDBY PRIMARY", "STANDBY SECONDARY", "STANDBY PRE ALARM"]) expect(color(label)).toBe("off");
    rerender(<DvorModuleFaceplate blockId="monitor-cca" occurrenceId="monitor-1a3a10" />);
    expect(color("INTEGRAL PRIMARY")).toBe("off");
    expect(color("CPU OK")).toBe("green");
  });

  it("turns powered/CPU indicators off with their rails, not merely when RF is switched Off", () => {
    const { container, rerender } = render(<DvorModuleFaceplate blockId="carrier-amplifier" occurrenceId="cab-carrier-1" />);
    const colors = () => [...container.querySelectorAll("[data-led]")].map(lamp => lamp.getAttribute("data-color"));
    act(() => {
      useVorPmdtStore.getState().lcuCommand("local");
      useVorPmdtStore.getState().lcuCommand("off", "tx1");
    });
    expect(colors()).toEqual(["green"]);
    act(() => useVorPmdtStore.getState().setOverride("rmsVoltageData.11.volts", 0));
    expect(colors()).toEqual(["off"]);
    for (const blockId of ["rms", "synthesizer", "audio-generator", "rf-monitor", "sideband"] as const) {
      rerender(<DvorModuleFaceplate blockId={blockId} />);
      act(() => useVorPmdtStore.getState().setOverride("rmsVoltageData.1.volts", 0));
      expect(colors().every(color => color === "off")).toBe(true);
    }
  });
});
