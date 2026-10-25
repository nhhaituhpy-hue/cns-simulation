import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDvor1150aScenarioDefinition, dvorConfigFieldCatalog, getDvorConfigValue } from "@/lib/dvor1150a";
import { TxConfigOffsets } from "@/components/vor/screens/tx-config-offsets";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());

function maintenance() {
  const state = useVorPmdtStore.getState();
  state.login("SEC3", "THREE");
  state.setConfigValue("simulation.local", true);
  state.setConfigValue("simulation.integralMonitorBypass", true);
}

it("steps output power through real arrow buttons while leaving running values and the other TX untouched", () => {
  maintenance();
  const before = useVorPmdtStore.getState();
  render(<TxConfigOffsets />);
  fireEvent.click(screen.getByRole("button", { name: "Increase txOffsets.1.tx1" }));
  expect(screen.getByLabelText("txOffsets.1.tx1")).toHaveValue("84.1");
  expect(useVorPmdtStore.getState().configDraft.transmitters.tx1.offsets.outputPowerScale).toBe(84.1);
  expect(useVorPmdtStore.getState().configDraft.transmitters.tx2).toEqual(before.configDraft.transmitters.tx2);
  expect(useVorPmdtStore.getState().config).toBe(before.config);
  expect(useVorPmdtStore.getState().derived).toBe(before.derived);
  fireEvent.click(screen.getByRole("button", { name: "Decrease txOffsets.1.tx1" }));
  expect(screen.getByLabelText("txOffsets.1.tx1")).toHaveValue("84.0");
  expect(useVorPmdtStore.getState().configDraft.transmitters.tx1.offsets.outputPowerScale).toBe(84);
});

describe("transmitter offset arrow guards", () => {
  it.each(["guest", "remote", "scenario"])("disables both arrows in %s mode", (mode) => {
    if (mode !== "guest") maintenance();
    if (mode === "remote") useVorPmdtStore.getState().setConfigValue("simulation.local", false);
    if (mode === "scenario") {
      const definition = createDefaultDvor1150aScenarioDefinition();
      definition.editPolicy = { mode: "restricted", allowedFieldIds: [] };
      useVorPmdtStore.setState({ scenario: { active: true, definition, startedAt: null } });
    }
    const before = useVorPmdtStore.getState();
    render(<TxConfigOffsets />);
    for (const direction of ["Increase", "Decrease"]) {
      const button = screen.getByRole("button", { name: `${direction} txOffsets.1.tx1` });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(useVorPmdtStore.getState().configDraft).toBe(before.configDraft);
  });

  it("keeps coarse phase on its four positions and clamps fine phase at both boundaries", () => {
    maintenance();
    render(<TxConfigOffsets />);
    const up = screen.getByRole("button", { name: "Increase txOffsets.6.tx1" });
    const down = screen.getByRole("button", { name: "Decrease txOffsets.6.tx1" });
    fireEvent.click(up);
    expect(screen.getByLabelText("txOffsets.6.tx1")).toHaveValue("270.0");
    expect(up).toBeDisabled();
    for (const expected of [180, 90, 0]) {
      fireEvent.click(down);
      expect(screen.getByLabelText("txOffsets.6.tx1")).toHaveValue(expected.toFixed(1));
    }
    expect(down).toBeDisabled();
    const fine = screen.getByLabelText("txOffsets.7.tx1");
    for (const [raw, direction, expected] of [["44.9", "Increase", "45.0"], ["-44.9", "Decrease", "-45.0"]]) {
      fireEvent.focus(fine);
      fireEvent.change(fine, { target: { value: raw } });
      fireEvent.blur(fine);
      const arrow = screen.getByRole("button", { name: `${direction} txOffsets.7.tx1` });
      fireEvent.click(arrow);
      expect(fine).toHaveValue(expected);
      expect(arrow).toBeDisabled();
    }
  });

  it("steps both TX fields through the catalog step for all 21 offset rows", () => {
    maintenance();
    const before = useVorPmdtStore.getState();
    const { container } = render(<TxConfigOffsets />);
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input[data-vor-config-field-id]"));
    expect(inputs).toHaveLength(42);
    for (const input of inputs) {
      const id = input.getAttribute("data-vor-config-field-id")!;
      const field = dvorConfigFieldCatalog.find((item) => item.id === id)!;
      const initial = getDvorConfigValue(before.configDraft, id) as number;
      const expected = Number((initial + field.step!).toFixed(10));
      fireEvent.click(screen.getByRole("button", { name: `Increase ${input.getAttribute("aria-label")}` }));
      expect(getDvorConfigValue(useVorPmdtStore.getState().configDraft, id)).toBe(expected);
      fireEvent.click(screen.getByRole("button", { name: `Decrease ${input.getAttribute("aria-label")}` }));
      expect(getDvorConfigValue(useVorPmdtStore.getState().configDraft, id)).toBe(initial);
    }
    expect(useVorPmdtStore.getState().config).toBe(before.config);
    expect(useVorPmdtStore.getState().derived).toBe(before.derived);
  });

  it("commits arrow changes only through Apply and preserves unrelated TX settings", () => {
    maintenance();
    const before = useVorPmdtStore.getState();
    render(<TxConfigOffsets />);
    fireEvent.click(screen.getByRole("button", { name: "Increase txOffsets.0.tx2" }));
    expect(screen.getByLabelText("txOffsets.0.tx2")).toHaveValue("0.01");
    act(() => { expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(true); });
    expect(useVorPmdtStore.getState().config.transmitters.tx2.offsets.azimuthAngleOffset).toBe(0.01);
    expect(useVorPmdtStore.getState().config.transmitters.tx1).toEqual(before.config.transmitters.tx1);
  });

  it("keeps partial text editing usable after stepping with the keyboard", () => {
    maintenance();
    render(<TxConfigOffsets />);
    const input = screen.getByLabelText("txOffsets.5.tx1");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("12.6");
    fireEvent.change(input, { target: { value: "-" } });
    expect(input).toHaveValue("-");
    fireEvent.change(input, { target: { value: "-1.2" } });
    expect(useVorPmdtStore.getState().configDraft.transmitters.tx1.offsets.carrierPllControl).toBe(-1.2);
    fireEvent.blur(input);
    expect(input).toHaveValue("-1.2");
  });

  it("supports keyboard activation of the arrow buttons and arrow keys on the input", async () => {
    maintenance();
    const user = userEvent.setup();
    render(<TxConfigOffsets />);
    const up = screen.getByRole("button", { name: "Increase txOffsets.1.tx1" });
    up.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("txOffsets.1.tx1")).toHaveValue("84.1");
    await user.keyboard(" ");
    expect(screen.getByLabelText("txOffsets.1.tx1")).toHaveValue("84.2");
    const input = screen.getByLabelText("txOffsets.1.tx1");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveValue("84.1");
  });
});
