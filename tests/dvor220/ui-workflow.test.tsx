import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { createDefaultDvor220Configuration } from "@/modules/operations/dvor-220/domain/defaults";
import { createDvor220Store, type Dvor220StoreApi } from "@/modules/operations/dvor-220/store/dvor220-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => cleanup());

function createUiStore() {
  return createDvor220Store({ initialNowMs: Date.UTC(2026, 7, 10, 1, 0, 0) });
}

function connectAndLogin(store: Dvor220StoreApi) {
  render(<Dvor220Simulator store={store} />);
  const connection = screen.getByRole("dialog", { name: "Connection List" });
  fireEvent.click(within(connection).getByRole("button", { name: "Connect" }));
  const login = screen.getByRole("dialog", { name: "Login" });
  fireEvent.change(within(login).getByLabelText("Password"), { target: { value: "1234" } });
  fireEvent.click(within(login).getByRole("button", { name: "Login" }));
  expect(screen.queryByRole("dialog", { name: "Login" })).not.toBeInTheDocument();
}

describe("MOPIENS DVOR 220 simulator UI", () => {
  it("runs Connection to Login and exposes the complete PMDT chrome", () => {
    const store = createUiStore();
    render(<Dvor220Simulator store={store} />);

    expect(screen.getByRole("dialog", { name: "Connection List" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Connection List" })).getByRole("button", { name: "Connect" }));
    const login = screen.getByRole("dialog", { name: "Login" });
    fireEvent.change(within(login).getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(within(login).getByRole("button", { name: "Login" }));
    expect(within(login).getByRole("alert")).toHaveTextContent("Invalid username or password");

    fireEvent.change(within(login).getByLabelText("Password"), { target: { value: "1234" } });
    fireEvent.click(within(login).getByRole("button", { name: "Login" }));

    expect(store.getState().device.session).toMatchObject({ username: "Administrator", level: 3 });
    expect(screen.getByRole("article")).toHaveTextContent("MOPIENS 220 DVOR");
    expect(screen.getAllByRole("meter")).toHaveLength(5);
    for (const group of ["Main", "Setup", "Maintenance", "Flight Inspection", "History Log", "Administrator Logout"]) {
      expect(screen.getByRole("button", { name: group })).toBeInTheDocument();
    }
  });

  it("enforces PMDT control ownership for a remote profile in LOCAL", () => {
    const store = createUiStore();
    render(<Dvor220Simulator store={store} />);
    fireEvent.change(screen.getByLabelText("Saved connections"), { target: { value: "lab-vor-remote" } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Connection List" })).getByRole("button", { name: "Connect" }));
    const login = screen.getByRole("dialog", { name: "Login" });
    fireEvent.change(within(login).getByLabelText("Password"), { target: { value: "1234" } });
    fireEvent.click(within(login).getByRole("button", { name: "Login" }));

    expect(store.getState().snapshot.controlAvailable).toBe(false);
    expect(screen.getAllByRole("button", { name: "Change Over" }).every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.getByText("Read only")).toBeInTheDocument();
  });

  it("opens a read-only Level-0 Guest session and allows logout", () => {
    const configuration = createDefaultDvor220Configuration();
    configuration.system.allowGuestAccess = true;
    const store = createDvor220Store({
      initialNowMs: Date.UTC(2026, 7, 10, 1, 0, 0),
      configuration,
    });
    render(<Dvor220Simulator store={store} />);

    fireEvent.click(within(screen.getByRole("dialog", { name: "Connection List" })).getByRole("button", { name: "Connect" }));
    const login = screen.getByRole("dialog", { name: "Login" });
    fireEvent.change(within(login).getByLabelText("User Name"), { target: { value: "gUeSt" } });
    fireEvent.click(within(login).getByRole("button", { name: "Login" }));

    expect(store.getState().device.session).toMatchObject({ username: "Guest", level: 0 });
    expect(screen.queryByRole("dialog", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("User: Guest, mode LOCAL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Change Over" }).every((button) => button.hasAttribute("disabled"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Station Setup" }));
    expect(screen.getByLabelText(/Carrier Power/)).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Guest Logout" }));
    expect(store.getState().device.session.username).toBeNull();
    expect(screen.getByRole("dialog", { name: "Login" })).toBeInTheDocument();
  });

  it("operates changeover and monitor bypass controls", () => {
    const store = createUiStore();
    connectAndLogin(store);

    fireEvent.click(screen.getAllByRole("button", { name: "Change Over" })[0]);
    const changeover = screen.getByRole("alertdialog", { name: "Transmitter Change Over" });
    fireEvent.click(within(changeover).getByRole("button", { name: "Change Over" }));
    expect(store.getState().snapshot.activeTransmitterId).toBe("tx2");
    expect(store.getState().snapshot.transmitters.tx1.designation).toBe("main");

    fireEvent.click(screen.getAllByRole("button", { name: "Bypass" })[0]);
    const bypass = screen.getByRole("dialog", { name: "Monitor Bypass" });
    fireEvent.click(within(bypass).getByRole("button", { name: "Set Both Auto" }));
    expect(store.getState().snapshot.effectiveMonitorBypass).toBe(false);
  });

  it("uses the Cam Ranh power rail and converter labels without fabricating per-module readings", () => {
    const store = createUiStore();
    connectAndLogin(store);
    fireEvent.click(screen.getByRole("button", { name: "Power Supply" }));
    const labels = (name: string) => within(screen.getByRole("table", { name }))
      .getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(labels("DC/DC-A")).toEqual(["5V", "15V", "-15V"]);
    expect(labels("DC/DC")).toEqual(["5V", "8V", "15V", "-15V", "28V", "50V"]);
    expect(labels("AC/DC")).toEqual(["AC/DC-A", "AC/DC-C", "AC/DC-E"]);
    expect(labels("Battery")).toEqual(["Battery #1", "Battery #2"]);
    expect(within(screen.getByRole("table", { name: "DC/DC-A" })).getAllByText("—")).toHaveLength(12);
  });

  it("opens equipment detail windows separately from PMDT measurements", () => {
    const store = createUiStore();
    connectAndLogin(store);
    fireEvent.click(screen.getByRole("button", { name: "Equipment Status" }));
    fireEvent.click(screen.getByRole("button", { name: /^Transmitter 1/ }));
    const tx = within(screen.getByRole("dialog", { name: "Transmitter Status Detail" }));
    const general = within(tx.getByRole("table", { name: "General" }));
    expect(general.getByRole("columnheader", { name: "TX2" })).toBeInTheDocument();
    expect(general.getByText("On ANT")).toBeInTheDocument();
    fireEvent.click(tx.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: /^Monitor\s*(BYPASSED|AUTOMATIC)$/ }));
    const monitor = within(screen.getByRole("dialog", { name: "Monitor Status Detail" }));
    expect(monitor.getByRole("table", { name: "CH.B.2" })).toBeInTheDocument();
  });

  it("edits independent or linked thermal settings in the draft only", () => {
    const store = createUiStore();
    connectAndLogin(store);
    fireEvent.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Thermal Control Setup" }));
    const tx2Before = store.getState().device.configuration.running.thermal.tx2.fanStartC;
    fireEvent.change(screen.getByLabelText("TX1 Operation Temperature"), { target: { value: "50" } });
    expect(store.getState().device.configuration.draft.thermal.tx2.fanStartC).toBe(tx2Before);
    fireEvent.click(screen.getByLabelText("Same to TX1 and TX2"));
    fireEvent.change(screen.getByLabelText("TX1 Operation Temperature"), { target: { value: "51" } });
    expect(store.getState().device.configuration.draft.thermal.tx2.fanStartC).toBe(51);
    expect(store.getState().device.configuration.running.thermal.tx2.fanStartC).toBe(tx2Before);
  });

  it("previews course-shift alarms in both directions without changing the equipment", () => {
    const store = createUiStore();
    connectAndLogin(store);
    act(() => { store.getState().advanceTime(1000); });
    const before = store.getState().device;
    fireEvent.click(screen.getByRole("button", { name: "Flight Inspection" }));
    fireEvent.click(screen.getByRole("button", { name: "Monitor Reference Check" }));
    const reference = within(screen.getByRole("dialog", { name: "Monitor Reference Check" }));
    const baseline = Number(reference.getByRole("meter", { name: "MON1" }).getAttribute("aria-valuenow"));
    fireEvent.click(reference.getByRole("button", { name: "Azimuth Course Shift Alarm, CW" }));
    expect(Number(reference.getByRole("meter", { name: "MON1" }).getAttribute("aria-valuenow"))).toBeGreaterThan(baseline);
    expect(reference.getByLabelText("MON1: Alarm")).toBeInTheDocument();
    fireEvent.click(reference.getByRole("button", { name: "Azimuth Course Shift Alarm, CCW" }));
    expect(Number(reference.getByRole("meter", { name: "MON1" }).getAttribute("aria-valuenow"))).toBeLessThan(baseline);
    expect(reference.getByLabelText("MON1: Alarm")).toBeInTheDocument();
    fireEvent.click(reference.getByRole("button", { name: "Return to origin" }));
    expect(Number(reference.getByRole("meter", { name: "MON1" }).getAttribute("aria-valuenow"))).toBe(baseline);
    expect(store.getState().device).toEqual(before);
    fireEvent.click(reference.getByRole("button", { name: "Changeover" }));
    expect(screen.getByRole("alertdialog", { name: "Transmitter Change Over" })).toBeInTheDocument();
  });

  it("searches separate PMDT and LMI history by date, class, and LMI username", () => {
    const store = createUiStore();
    connectAndLogin(store);
    act(() => { store.getState().dispatch({ type: "set-keylock", mode: "MAINT" }); });
    fireEvent.click(screen.getByRole("button", { name: "History Log" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const pmdt = within(screen.getByRole("table", { name: "PMDT history records" }));
    expect(pmdt.getByText(/Connected to/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save CSV" })).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Event" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(pmdt.queryByText(/Connected to/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2027-01-01T00:00" } });
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "LMI History Log" }));
    fireEvent.click(screen.getByRole("button", { name: "Detail Options" }));
    const options = within(screen.getByRole("dialog", { name: "Detail Options" }));
    fireEvent.change(options.getByLabelText("Username"), { target: { value: "Administrator" } });
    fireEvent.click(options.getByRole("button", { name: "OK" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(within(screen.getByRole("table", { name: "LMI history records" })).getByText("Keylock changed to MAINT")).toBeInTheDocument();
  });

  it("shows the version reference and keeps firmware update display only", () => {
    const store = createUiStore();
    connectAndLogin(store);
    const before = store.getState().device;
    fireEvent.click(screen.getByRole("button", { name: "Maintenance" }));
    fireEvent.click(screen.getByRole("button", { name: "Version" }));
    const versions = within(screen.getByRole("table", { name: "Version Information" }));
    expect(versions.getByRole("columnheader", { name: "Up Time" })).toBeInTheDocument();
    expect(versions.getByText("1A1A2").parentElement).toHaveTextContent("1.0.0 #05123");
    fireEvent.click(versions.getByRole("button", { name: "Firmware Update 1A1A2" }));
    expect(screen.getByRole("dialog", { name: "Firmware Update" })).toHaveTextContent("Display only");
    expect(store.getState().device).toEqual(before);
  });

  it("edits Draft, applies Running and saves the Flash profile", () => {
    const store = createUiStore();
    connectAndLogin(store);
    fireEvent.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Station Setup" }));

    fireEvent.change(screen.getByLabelText(/Carrier Power/), { target: { value: "120" } });
    expect(store.getState().device.configuration.draft.station.carrierPowerW).toBe(120);
    expect(store.getState().device.configuration.running.station.carrierPowerW).toBe(100);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(store.getState().device.configuration.running.station.carrierPowerW).toBe(120);
    expect(store.getState().device.configuration.flashDirty).toBe(true);

    const saveButtons = screen.getAllByRole("button", { name: "Profile Save" });
    fireEvent.click(saveButtons[saveButtons.length - 1]);
    expect(store.getState().device.configuration.flash.station.carrierPowerW).toBe(120);
    expect(store.getState().device.configuration.flashDirty).toBe(false);
  });

  it("propagates training faults into alarm state and preserves the device through PMDT/LMI switching", () => {
    const store = createUiStore();
    connectAndLogin(store);
    fireEvent.click(screen.getAllByRole("button", { name: "Bypass" })[0]);
    fireEvent.click(within(screen.getByRole("dialog", { name: "Monitor Bypass" })).getByRole("button", { name: "Set Both Auto" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Monitor Bypass" })).getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Simulator Tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Fault Injection" }));
    const injectButtons = screen.getAllByRole("button", { name: "Inject" });
    fireEvent.click(injectButtons[0]);
    expect(store.getState().snapshot.monitors.mon1.channels.cha.stabilizing).toBe(true);
    act(() => {
      store.getState().advanceTime(1_000);
    });
    expect(store.getState().snapshot.monitors.mon1.channels.cha.primaryAlarm).toBe(true);

    const remainingInjectButtons = screen.getAllByRole("button", { name: "Inject" });
    fireEvent.click(remainingInjectButtons[0]);
    act(() => {
      store.getState().advanceTime(1_000);
    });
    expect(store.getState().snapshot.executiveAlarm).toBe(true);
    expect(store.getState().device.executive.phase).toBe("idle");

    const stateDuringPowerOnHoldoff = store.getState().device;
    const holdoffRemainingMs = (stateDuringPowerOnHoldoff.executive.powerOnHoldoffUntilMs ?? stateDuringPowerOnHoldoff.nowMs)
      - stateDuringPowerOnHoldoff.nowMs;
    expect(holdoffRemainingMs).toBeGreaterThan(0);
    act(() => {
      store.getState().advanceTime(holdoffRemainingMs);
    });
    expect(store.getState().device.executive.phase).toBe("pending-changeover");

    fireEvent.click(screen.getByRole("button", { name: "LMI" }));
    expect(screen.getByLabelText("MOPIENS 220 DVOR LMI")).toBeInTheDocument();
    expect(screen.getAllByText(/TX1/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "PMDT" }));
    expect(screen.getByLabelText("MOPIENS 220 DVOR PMDT")).toBeInTheDocument();
    expect(store.getState().snapshot.executiveAlarm).toBe(true);
  });
});
