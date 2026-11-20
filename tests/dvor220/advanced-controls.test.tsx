import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dvor220MaintenanceScreen } from "@/modules/operations/dvor-220/ui/maintenance-screens";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { useStore } from "zustand";
import { createAuthorizedDvor220State } from "./helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(cleanup);

function setup() {
  const store = createDvor220Store({ initialNowMs: 0 });
  store.setState({ device: createAuthorizedDvor220State() });
  store.getState().advanceTime(1000);
  function Harness() {
    const state = useStore(store);
    return <Dvor220MaintenanceScreen screenId="maintenance-advanced" {...state} navigate={() => {}} />;
  }
  render(<Harness />);
  return store;
}

describe("TM Advanced Controls", () => {
  it("renders collapsible sections in TM order without classroom injection controls", () => {
    const store = setup();
    expect(Array.from(document.querySelectorAll("summary")).map((node) => node.textContent)).toEqual([
      "Monitor Certification", "Antenna Manual", "Fault Clear", "Automatic Ground Error Check",
    ]);
    expect(screen.queryByRole("button", { name: "Inject High VSWR" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "MON1 +2°" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Advanced control pages" })).not.toBeInTheDocument();
    expect(store.getState().device.faults).toEqual([]);
  });

  it("toggles both CH.A bearing alarms without clearing unrelated faults and replaces direction", () => {
    const store = setup();
    act(() => { store.getState().dispatch({ type: "inject-fault", fault: { id: "unrelated", kind: "antenna-vswr", antenna: 9, usbVswr: 3.1 } }); });
    const cw = screen.getByRole("button", { name: "Azimuth Course Shift Alarm CW" });
    fireEvent.click(cw);
    act(() => { store.getState().advanceTime(1000); });
    for (const monitor of ["mon1", "mon2"] as const) {
      expect(store.getState().snapshot.monitors[monitor].channels.cha.readings.bearingError.status).toBe("alarm");
    }
    fireEvent.click(cw);
    act(() => { store.getState().advanceTime(1000); });
    for (const monitor of ["mon1", "mon2"] as const) {
      expect(store.getState().snapshot.monitors[monitor].channels.cha.readings.bearingError.status).toBe("normal");
    }
    expect(store.getState().device.faults.map((fault) => fault.id)).toEqual(["unrelated"]);
    fireEvent.click(cw);
    fireEvent.click(screen.getByRole("button", { name: "Azimuth Course Shift Alarm CCW" }));
    expect(store.getState().device.faults.filter((fault) => fault.id.startsWith("certification-")).every((fault) => fault.id.includes("-lower-"))).toBe(true);
  });

  it.each([
    ["30 Hz AM High Alarm", "am30Hz", "upperAlarm", 1],
    ["30 Hz AM Low Alarm", "am30Hz", "lowerAlarm", -1],
    ["9960 Hz Subcarrier AM High Alarm", "am9960Hz", "upperAlarm", 1],
    ["9960 Hz Subcarrier AM Low Alarm", "am9960Hz", "lowerAlarm", -1],
    ["RF Level High Alarm", "rfLevel", "upperAlarm", 1],
    ["RF Level Low Alarm", "rfLevel", "lowerAlarm", -1],
  ] as const)("drives %s beyond the configured limit", (label, parameter, limit, sign) => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: label }));
    const expected = store.getState().device.configuration.running.monitor.channels.cha.limits[parameter][limit]! + sign * 0.01;
    expect(store.getState().device.faults).toEqual(expect.arrayContaining(
      ["mon1", "mon2"].map((monitorId) => expect.objectContaining({ monitorId, channelId: "cha", parameter, value: expected })),
    ));
  });

  it("clears only the selected transmitter reverse-fault latch", () => {
    const store = setup();
    act(() => {
      for (const transmitterId of ["tx1", "tx2"] as const) {
        store.getState().dispatch({ type: "inject-fault", fault: { id: transmitterId, kind: "transmitter-unit", transmitterId, unit: "cma", condition: "fault" } });
        store.getState().dispatch({ type: "clear-fault", faultId: transmitterId });
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "TX1" }));
    expect(store.getState().device.transmitters.tx1.reverseFaultLatched).toBe(false);
    expect(store.getState().device.transmitters.tx2.reverseFaultLatched).toBe(true);
  });

  it("selects and swaps sideband positions in the 48-antenna manual dialog", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Antenna Manual" }));
    const dialog = within(screen.getByRole("dialog", { name: "Antenna Manual" }));
    expect(dialog.getAllByRole("button", { name: /^Antenna #/ })).toHaveLength(48);
    expect(dialog.getByRole("status")).toHaveTextContent("Selected antenna #1 · USB #1 · LSB #25");
    const antenna = dialog.getByRole("button", { name: "Antenna #2" });
    fireEvent.click(antenna);
    expect(antenna).toHaveAttribute("aria-pressed", "true");
    expect(dialog.getByRole("status")).toHaveTextContent("USB #2 · LSB #26");
    fireEvent.click(antenna);
    expect(dialog.getByRole("status")).toHaveTextContent("USB #26 · LSB #2");
    fireEvent.click(dialog.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Antenna Manual" })).not.toBeInTheDocument();
  });

  it("applies IDENT Keyer through Draft and preserves Flash", () => {
    const store = setup();
    fireEvent.change(screen.getByLabelText("IDENT Keyer"), { target: { value: "continuous" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(store.getState().device.configuration.running.station.identKeyer).toBe("continuous");
    expect(store.getState().device.configuration.flash.station.identKeyer).toBe("independent");
  });

  it("keeps the classroom Antenna / VSWR Test available", () => {
    const store = createDvor220Store({ initialNowMs: 0 });
    render(<Dvor220Simulator store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Simulator Tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Antenna / VSWR Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Inject High VSWR" }));
    expect(store.getState().snapshot.pdc.antennas[0]).toMatchObject({ usbVswr: 3.1, lsbVswr: 2.8 });
  });
});
