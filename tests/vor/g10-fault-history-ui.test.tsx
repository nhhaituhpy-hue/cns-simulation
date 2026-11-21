import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MonitorFaultHistory, faultHistoryTimestamp } from "@/components/vor/screens/monitor-fault-history";
import { appendDvorFault, initialDvorFaultHistory, sampleDvorFaultHistory } from "@/lib/dvor1150a/fault-history";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { useVorPmdtStore as store } from "@/stores/vor-pmdt-store";

beforeEach(() => store.getState().reset());
afterEach(cleanup);
function seed() {
  const config = createDefaultDvor1150aConfig();
  let history = sampleDvorFaultHistory(initialDvorFaultHistory(), config, buildDvor1150aSnapshot(config), "2026-11-21T08:00:00Z");
  for (let i = 1; i <= 3; i++) {
    config.transmitters.tx1.offsets.referenceModulationScale = 50 - i * 5;
    config.monitor.votingLogic = i === 2 ? "AND" : "OR";
    const snapshot = buildDvor1150aSnapshot(config);
    history = appendDvorFault(history, config, snapshot, `2026-11-21T08:00:0${i}Z`);
  }
  store.setState({ faultHistory: history });
  return history;
}

describe("G10 authentic fault history controls", () => {
  it("shows empty fields without a fabricated alarm, disables Older and uses no live values", () => {
    render(<MonitorFaultHistory />);
    expect(screen.getByRole("button", { name: "Older ==>" })).toBeDisabled();
    const row = screen.getByRole("row", { name: /30 Hz Modulation/ });
    expect(within(row).getAllByText("—")).toHaveLength(2);
    expect(within(row).getAllByText("%")).toHaveLength(1);
    fireEvent.click(screen.getByRole("tab", { name: "Local Control Unit" }));
    expect(screen.getByRole("table", { name: "Recorded Local Control Unit status" })).not.toHaveTextContent("01/10/26");
  });

  it("cycles three captured events and preserves the displayed record while live measurements change", () => {
    const history = seed();render(<MonitorFaultHistory />);
    const table = screen.getByRole("table", { name: "Integral fault measurements" });
    const latest = table.textContent;
    expect(screen.getAllByText("21/11/26 08:00:03")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Older ==>" }));
    expect(table).toHaveTextContent("Alarm #2");
    const older = table.textContent;
    act(() => { store.getState().login("SEC3", "THREE");store.getState().setConfigValue("simulation.local", true);store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 80);store.getState().applyConfigChanges(); });
    expect(table.textContent).toBe(older);
    fireEvent.click(screen.getByRole("button", { name: "Older ==>" }));expect(table).toHaveTextContent("Alarm #3");
    fireEvent.click(screen.getByRole("button", { name: "Older ==>" }));expect(table.textContent).toBe(latest);
    act(() => store.setState({ activeMenuPath: ["Monitor 2", "Fault History"] }));
    expect(screen.getByRole("region", { name: "Monitor 2 Fault History" })).toBeInTheDocument();
    const mon2 = history.events[0].alarm.rows.find(row => row.label === "30 Hz Modulation")!.mon2Value;
    expect(within(screen.getByRole("row", { name: /30 Hz Modulation/ })).getByText(mon2)).toBeInTheDocument();
  });

  it("renders recorded LCU logic/route rather than current state, leaving unmodeled mismatch inputs unknown", () => {
    seed();render(<MonitorFaultHistory />);fireEvent.click(screen.getByRole("tab", { name: "Local Control Unit" }));
    expect(Array.from(screen.getByRole("table", { name: "Recorded Local Control Unit status" }).querySelectorAll("time")).map(time => time.textContent)).toEqual(["21/11/26 08:00:01", "21/11/26 08:00:02", "21/11/26 08:00:03"]);
    expect(screen.getByRole("row", { name: /Monitor Logic/ })).toHaveTextContent("ORANDOR");
    act(() => store.setState({ config: { ...store.getState().config, monitor: { ...store.getState().config.monitor, votingLogic: "AND" } } }));
    expect(screen.getByRole("row", { name: /Monitor Logic/ })).toHaveTextContent("ORANDOR");
    expect(within(screen.getByRole("row", { name: /Primary Mismatch/ })).getAllByText("—")).toHaveLength(3);
  });

  it("does not show an invalid timestamp as a real measurement time", () => {
    expect(faultHistoryTimestamp(null)).toBe("—");
    expect(faultHistoryTimestamp({ timestamp: "bad", rows: [], sidebandFaults: { mon1: [], mon2: [] } })).toBe("—");
  });
});
