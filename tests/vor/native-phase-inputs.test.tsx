import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtConfigControl } from "@/components/vor/pmdt-config-control";
import { TxConfigOffsets } from "@/components/vor/screens/tx-config-offsets";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());

function maintenance() {
  const state = useVorPmdtStore.getState();
  state.login("SEC3", "THREE");
  state.setConfigValue("simulation.local", true);
  state.setConfigValue("simulation.integralMonitorBypass", true);
}

function enter(input: HTMLElement, value: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe.each(["tx1", "tx2"] as const)("native phase inputs %s", (tx) => {
  const coarseId = `txOffsets.6.${tx}`;
  const fieldId = `transmitters.${tx}.offsets.carrierSidebandPhaseOffsetCoarse`;
  const other = tx === "tx1" ? "tx2" : "tx1";

  it("uses the same numeric text input and spinner wrapper as the neighboring Fine field", () => {
    render(<TxConfigOffsets />);
    const coarse = screen.getByRole("textbox", { name: coarseId });
    const fine = screen.getByRole("textbox", { name: `txOffsets.7.${tx}` });
    expect(coarse).toHaveAttribute("type", "text");
    expect(coarse).toHaveAttribute("inputmode", "decimal");
    expect(coarse).toHaveAttribute("data-vor-config-field-id", fieldId);
    expect(coarse).toHaveAttribute("data-vor-field-type", "number");
    expect(coarse).toHaveValue(tx === "tx1" ? "180.0" : "90.0");
    expect(coarse.parentElement?.className).toBe(fine.parentElement?.className);
    expect(coarse.parentElement).toHaveClass("pmdt-tx-offset-spinner");
    expect(coarse).toBeDisabled();
  });

  it("stages all four valid coarse positions without changing the running or other transmitter until Apply", () => {
    maintenance();
    const before = useVorPmdtStore.getState();
    render(<TxConfigOffsets />);
    const input = screen.getByRole("textbox", { name: coarseId });
    expect(input).toBeEnabled();
    for (const value of [270, 180, 90, 0]) {
      enter(input, value.toFixed(1));
      const state = useVorPmdtStore.getState();
      expect(state.configDraft.transmitters[tx].offsets.carrierSidebandPhaseOffsetCoarse).toBe(value);
      expect(state.configDraft.transmitters[other]).toEqual(before.configDraft.transmitters[other]);
      expect(state.config).toBe(before.config);
      expect(state.derived).toBe(before.derived);
      expect(input).toHaveValue(value.toFixed(1));
    }
    act(() => { expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(true); });
    expect(useVorPmdtStore.getState().config.transmitters[tx].offsets.carrierSidebandPhaseOffsetCoarse).toBe(0);
    expect(useVorPmdtStore.getState().config.transmitters[other]).toEqual(before.config.transmitters[other]);
  });

  it("rejects invalid or incomplete positions and restores the accepted value on blur", () => {
    maintenance();
    render(<TxConfigOffsets />);
    const input = screen.getByRole("textbox", { name: coarseId });
    enter(input, "90.0");
    for (const invalid of ["", "45", "360", "90.1", "abc"]) {
      enter(input, invalid);
      expect(useVorPmdtStore.getState().configDraft.transmitters[tx].offsets.carrierSidebandPhaseOffsetCoarse).toBe(90);
      expect(input).toHaveValue("90.0");
    }
  });

  it("keeps the scenario edit-policy lock on the numeric input", () => {
    maintenance();
    const definition = createDefaultDvor1150aScenarioDefinition();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: [] };
    useVorPmdtStore.setState({ scenario: { active: true, definition, startedAt: null } });
    render(<TxConfigOffsets />);
    expect(screen.getByRole("textbox", { name: coarseId })).toBeDisabled();
  });
});

it("preserves dropdown rendering for catalog fields whose type is select", () => {
  render(<PmdtConfigControl displayFieldId="standby-ident" configFieldId="transmitters.tx1.nominal.standbyIdentCode" />);
  expect(screen.getByRole("combobox", { name: "standby-ident" })).toBeInTheDocument();
});
