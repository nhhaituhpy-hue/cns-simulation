import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PmdtMenuBar } from "@/components/vor/pmdt-menu-bar";
import { RmsConfigLayout } from "@/components/vor/screens/rms-config-layout";
import { MonitorStatus } from "@/components/vor/screens/monitor-status";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
beforeEach(() => {
  useVorPmdtStore.getState().reset();
  useVorPmdtStore.getState().login("SEC3", "THREE");
  useVorPmdtStore.getState().setConfigValue("simulation.local", true);
});
afterEach(() => { cleanup(); useVorPmdtStore.getState().reset(); });

it("edits documented automatic restart controls through Apply; count stays read-only", () => {
  useVorPmdtStore.getState().openScreen("rms-config", ["RMS", "Configuration"], "Configuration");
  render(<RmsConfigLayout />);
  const enabled = screen.getByRole("checkbox", { name: "rmsConfigGeneral.automaticRestartsEnabled" });
  const delay = screen.getByRole("textbox", { name: "rmsConfigGeneral.firstRestartDelay" });
  expect(enabled).not.toBeChecked();
  expect(delay).toBeDisabled();
  fireEvent.click(enabled);
  expect(delay).not.toBeDisabled();
  fireEvent.change(delay, { target: { value: "60" } });
  expect(useVorPmdtStore.getState().config.station.automaticRestartsEnabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Apply (F7)" }));
  expect(useVorPmdtStore.getState().config.station).toMatchObject({ automaticRestartsEnabled: true, firstRestartDelay: 60 });
  expect(document.querySelector('[data-vor-field-id="rmsConfigGeneral.numberOfAutomaticRestarts"]')).toHaveValue("2");
  expect(document.querySelector('[data-vor-field-id="rmsConfigGeneral.numberOfAutomaticRestarts"]')).toHaveAttribute("readonly");
});

it("dispatches Transfer from the PMDT menu while retaining designated Main", () => {
  render(<PmdtMenuBar />);
  fireEvent.click(screen.getByRole("button", { name: "Transmitters" }));
  fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Commands" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Transfer" }));
  expect(useVorPmdtStore.getState().derived.voting.activeTransmitter).toBe("tx2");
  expect(useVorPmdtStore.getState().derived.mainTransmitter).toBe("tx1");
});

it("projects Hot Standby Present from actual Load state instead of a fixed lamp", () => {
  render(<MonitorStatus monitorNumber={1} />);
  const row = screen.getByText("Hot Standby Present").parentElement!;
  expect(row).not.toHaveTextContent("G");
  act(() => {
    useVorPmdtStore.getState().setConfigValue("station.standbyMode", "Hot Standby");
    useVorPmdtStore.getState().applyConfigChanges();
  });
  expect(row).toHaveTextContent("G");
});
