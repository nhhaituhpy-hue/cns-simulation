import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtSidebar } from "@/components/vor/pmdt-sidebar";
import { TxDataMain } from "@/components/vor/screens/tx-data-main";
import { MonitorIntegral } from "@/components/vor/screens/monitor-integral";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("G02 Load-mode PMDT readouts", () => {
  beforeEach(() => {
    const store = useVorPmdtStore;
    store.getState().reset();
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().setTransmitterMode("tx1", "load");
  });

  it("renders Load power, VSWR and trim feedback without an antenna field", () => {
    render(<><PmdtSidebar /><TxDataMain /><MonitorIntegral /></>);
    expect(document.querySelector('[data-vor-field-id="txPower.0.tx1"]')).toHaveTextContent("70.8");
    expect(document.querySelector('[data-vor-field-id="txVswr.0.value1"]')).toHaveTextContent("1.00");
    expect(document.querySelector('[data-vor-field-id="sidebarParams.azimuth.value"]')).toHaveTextContent("—");
    expect(screen.getAllByText("No Ident").length).toBeGreaterThan(0);
    act(() => {
      useVorPmdtStore.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
      useVorPmdtStore.getState().applyConfigChanges();
    });
    expect(document.querySelector('[data-vor-field-id="txPower.0.tx1"]')).toHaveTextContent("80.9");
  });

  it("renders zero RF and blank local VSWR/frequency after Off", () => {
    useVorPmdtStore.getState().setTransmitterMode("tx1", "off");
    render(<TxDataMain />);
    expect(document.querySelector('[data-vor-field-id="txPower.0.tx1"]')).toHaveTextContent("0.0");
    expect(document.querySelector('[data-vor-field-id="txVswr.0.value1"]')).toBeEmptyDOMElement();
    expect(document.querySelector('[data-vor-field-id="txFrequency.0.value1"]')).toBeEmptyDOMElement();
  });
});
