import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { DvorConfigPanel } from "@/components/vor/dvor-config-panel";
import { RmsConfigLayout } from "@/components/vor/screens/rms-config-layout";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => {
  const store = useVorPmdtStore;
  store.getState().reset();
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
});

it("the generic parameters editor keeps nominal station-common through draft and Apply", () => {
  const store = useVorPmdtStore;
  const before = store.getState().derived;
  render(<DvorConfigPanel />);
  const input = document.getElementById("dvor-config-transmitters.tx1.nominal.outputPower")!;
  fireEvent.change(input, { target: { value: "71" } });
  expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(71);
  expect(store.getState().configDraft.transmitters.tx2.nominal.outputPower).toBe(71);
  expect(store.getState().derived).toBe(before);
  act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
  expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(71);
  expect(store.getState().config.transmitters.tx2.nominal.outputPower).toBe(71);
});

it("does not offer the generic nominal input when its mirrored target is scenario-locked", () => {
  const store = useVorPmdtStore;
  const definition = createDefaultDvor1150aScenarioDefinition();
  definition.editPolicy = { mode: "restricted", allowedFieldIds: ["transmitters.tx1.nominal.outputPower"] };
  store.setState({ scenario: { active: true, definition, startedAt: null } });
  render(<DvorConfigPanel />);
  expect(document.getElementById("dvor-config-transmitters.tx1.nominal.outputPower")).toBeDisabled();
});

it("discloses stored-only calibration limits in the generic editor, not only the native grid", () => {
  render(<DvorConfigPanel />);
  expect(document.getElementById("dvor-config-monitor.calibration.mon1.txPowerOffset")).toHaveAttribute("data-vor-effect", "stored-only");
  expect(screen.getAllByText(/Chỉ lưu cấu hình: chưa xác minh/).length).toBeGreaterThan(0);
});

it("the RMS voting radios change the real draft and only affect voting on Apply", () => {
  const store = useVorPmdtStore;
  store.setState({ activeScreen: "rms-config", activeView: "rms-config-general", activeMenuPath: ["RMS", "Configuration"] });
  render(<RmsConfigLayout />);
  const input = document.querySelector<HTMLInputElement>('input[data-vor-config-field-id="monitor.votingLogic"][value="OR"]');
  expect(input).not.toBeNull();
  expect(input).not.toBeDisabled();
  fireEvent.click(input!);
  expect(store.getState().configDraft.monitor.votingLogic).toBe("OR");
  expect(store.getState().config.monitor.votingLogic).toBe("AND");
  act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
  expect(store.getState().derived.voting.logic).toBe("OR");
});
