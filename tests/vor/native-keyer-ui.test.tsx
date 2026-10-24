import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TxConfigNominal } from "@/components/vor/screens/tx-config-nominal";
import { TxDataMain } from "@/components/vor/screens/tx-data-main";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { getDvorConfigValue } from "@/lib/dvor1150a";

beforeEach(() => useVorPmdtStore.getState().reset());
function maintenance() {
  useVorPmdtStore.getState().login("SEC3", "THREE");
  useVorPmdtStore.getState().setConfigValue("simulation.local", true);
  useVorPmdtStore.getState().setConfigValue("simulation.integralMonitorBypass", true);
}

describe("1150A native keyer integration", () => {
  it("keeps every conditional Keyer Input control disabled until External Keying is selected", () => {
    maintenance();
    render(<TxConfigNominal />);
    const labels = ["Keyer Input Level", "Windowed Keying Input", "Self-Key on Loss of Keying Signal", "Shutdown on Loss of Keyed Signal", "Restart when Keying Signal Resumes"];
    for (const label of labels) expect(screen.getByLabelText(label)).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "External Keying" }));
    for (const label of labels) expect(screen.getByLabelText(label)).toBeEnabled();
  });

  it("edits all keyer configuration with shared nominal draft/Apply semantics", () => {
    maintenance();
    const before = useVorPmdtStore.getState();
    render(<TxConfigNominal />);
    const external = screen.getByRole("radio", { name: "External Keying" });
    expect(external).not.toBeDisabled();
    fireEvent.click(external);
    for (const [label, value] of [["Keyer Input Level", "Active High/Open"], ["External Keying output", "Windowed"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    for (const label of ["Windowed Keying Input", "Self-Key on Loss of Keying Signal", "Shutdown on Loss of Keyed Signal", "Restart when Keying Signal Resumes", "Suppress External Keyer on Shutdown"]) {
      const input = screen.getByLabelText(label);
      expect(input).not.toBeDisabled();
      fireEvent.click(input);
    }
    expect(useVorPmdtStore.getState().config).toBe(before.config);
    expect(useVorPmdtStore.getState().derived).toBe(before.derived);
    act(() => { expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(true); });
    const after = useVorPmdtStore.getState();
    expect(after.config.transmitters.tx1.nominal).toMatchObject({ keyerMode: "external", keyerInputLevel: "Active High/Open", windowedKeyingInput: true, selfKeyOnLoss: true, shutdownOnLoss: true, restartWhenResumed: true, externalKeying: "Windowed", suppressOnShutdown: true });
    expect(after.config.transmitters.tx2.nominal).toEqual(after.config.transmitters.tx1.nominal);
    expect(after.derived.data.txConfigNominal.keyerInput.selfKeyOnLoss).toBe(true);
    expect(after.derived.data.txConfigNominal.keyerOutput.externalKeying).toBe("Windowed");
    const parsed = parseDvor1150aConfig(after.config);
    expect(parsed).not.toBeNull();
    expect(getDvorConfigValue(parsed!, "transmitters.tx1.nominal.windowedKeyingInput")).toBe(true);
  });

  it("shows explicitly unresolved external keying rather than inventing a normal ident", () => {
    maintenance();
    useVorPmdtStore.getState().setConfigValue("transmitters.tx1.nominal.keyerMode", "external");
    expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(true);
    render(<TxDataMain />);
    expect(screen.getByText("awaiting-external-signal")).toBeInTheDocument();
  });
});
