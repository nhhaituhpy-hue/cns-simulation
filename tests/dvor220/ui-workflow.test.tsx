import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { createDefaultDvor220Configuration } from "@/modules/operations/dvor-220/domain/defaults";
import { createDvor220Store, type Dvor220StoreApi } from "@/modules/operations/dvor-220/store/dvor220-store";

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

    fireEvent.click(screen.getByRole("button", { name: "Maintenance" }));
    fireEvent.click(screen.getByRole("button", { name: "Fault Controls" }));
    const injectButtons = screen.getAllByRole("button", { name: "Inject" });
    fireEvent.click(injectButtons[0]);
    expect(store.getState().snapshot.monitors.mon1.channels.cha.primaryAlarm).toBe(true);

    const remainingInjectButtons = screen.getAllByRole("button", { name: "Inject" });
    fireEvent.click(remainingInjectButtons[0]);
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
