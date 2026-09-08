import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TxConfigLayout } from "@/components/vor/screens/tx-config-layout";
import { TxDataLayout } from "@/components/vor/screens/tx-data-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("Transmitter screens", () => {
  beforeEach(() => useVorPmdtStore.getState().reset());

  it("shows power, frequency, VSWR, and Tx #1 status", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().openScreen("tx-data", ["Transmitters", "Data"], "Data");
    render(<TxDataLayout />);

    expect(screen.getByText("70.8")).toBeInTheDocument();
    expect(screen.getByText("117.0006")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Status - Tx #1" }));
    expect(screen.getByText("Sideband 1 Phase").closest("li")).toHaveTextContent(
      "green",
    );
    expect(screen.getByRole("tab", { name: "Status - Tx #2" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it.each(["tx1", "tx2"] as const)("applies shared Nominal to both transmitters while %s is on air", async (activeTx) => {
    const user = userEvent.setup();
    const store = useVorPmdtStore;
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().selectMainTransmitter(activeTx);
    store.getState().openScreen("tx-config", ["Transmitters", "Configuration"], "Configuration");
    const before = store.getState();
    const beforeRf = before.derived.monitors.mon1.parameters.rfLevel.value;
    render(<TxConfigLayout />);

    const input = screen.getByLabelText("txConfigNominal.audioGenParams.outputPower");
    await user.clear(input);
    await user.type(input, "75");
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(75);
    expect(store.getState().configDraft.transmitters.tx2.nominal.outputPower).toBe(75);
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().derived.monitors.mon1.parameters.rfLevel.value).toBe(beforeRf);

    act(() => { expect(store.getState().applyConfigChanges()).toBe(true); });
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(75);
    expect(store.getState().config.transmitters.tx2.nominal.outputPower).toBe(75);
    expect(store.getState().derived.voting.activeTransmitter).toBe(activeTx);
    expect(store.getState().derived.monitors.mon1.parameters.rfLevel.value).not.toBe(beforeRf);
    expect(store.getState().configDirty).toBe(false);
  });

  it("switches between nominal configuration and all transmitter offsets", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().openScreen(
      "tx-config",
      ["Transmitters", "Configuration"],
      "Configuration",
    );
    expect(useVorPmdtStore.getState().login("SEC3", "THREE")).toBe(true);
    useVorPmdtStore.getState().setConfigValue("simulation.local", true);
    useVorPmdtStore.getState().setConfigValue("simulation.integralMonitorBypass", true);
    render(<TxConfigLayout />);

    const outputPowerInput = screen.getByLabelText("txConfigNominal.audioGenParams.outputPower");
    expect(outputPowerInput).toHaveValue("70.0");
    expect(outputPowerInput).not.toBeDisabled();
    expect(screen.getByDisplayValue("TST")).not.toBeDisabled();
    await user.click(
      screen.getByRole("tab", { name: "Offsets and Scale Factors" }),
    );
    expect(screen.getByText("Carrier PLL Control")).toBeInTheDocument();
    expect(screen.getByText("Sideband 1 VSWR Offset")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Integral Monitor Data" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
