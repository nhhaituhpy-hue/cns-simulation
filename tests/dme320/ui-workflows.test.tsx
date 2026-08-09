import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Dme320Simulator } from "@/modules/operations/dme-320/dme320-simulator";
import { createDme320Store, type Dme320StoreApi } from "@/modules/operations/dme-320/store/dme320-store";

afterEach(() => cleanup());

async function connectAndLogin(
  user: ReturnType<typeof userEvent.setup>,
  store: Dme320StoreApi,
) {
  const connectionDialog = screen.getByRole("dialog", { name: "Connection List" });
  await user.click(within(connectionDialog).getByRole("button", { name: "Connect" }));

  const loginDialog = screen.getByRole("dialog", { name: "Login" });
  expect(within(loginDialog).getByLabelText("User Name")).toHaveValue("Administrator");
  expect(within(loginDialog).getByLabelText("Password")).toHaveValue("1234");
  await user.click(within(loginDialog).getByRole("button", { name: "Login" }));

  expect(screen.queryByRole("dialog", { name: "Login" })).not.toBeInTheDocument();
  expect(store.getState().simulation.session).toMatchObject({
    userId: "Administrator",
    level: 3,
    origin: "local",
  });
}

describe("MOPIENS DME 320 PMDT workflows", () => {
  it("connects and authenticates with the required Administrator training account", async () => {
    const user = userEvent.setup();
    const store = createDme320Store({ initialNowMs: 0 });
    render(<Dme320Simulator store={store} />);

    await connectAndLogin(user, store);

    expect(screen.getByLabelText("MOPIENS 320 DME PMDT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MOPIENS 320 DME" })).toBeInTheDocument();
  });

  it("opens a read-only Level-0 Guest session with a blank password and allows logout", async () => {
    const user = userEvent.setup();
    const store = createDme320Store({ initialNowMs: 0 });
    render(<Dme320Simulator store={store} />);

    const connectionDialog = screen.getByRole("dialog", { name: "Connection List" });
    await user.click(within(connectionDialog).getByRole("button", { name: "Connect" }));

    const loginDialog = screen.getByRole("dialog", { name: "Login" });
    const userName = within(loginDialog).getByLabelText("User Name");
    const password = within(loginDialog).getByLabelText("Password");
    await user.clear(userName);
    await user.type(userName, "gUeSt");
    await user.clear(password);
    expect(password).toHaveValue("");
    await user.click(within(loginDialog).getByRole("button", { name: "Login" }));

    expect(store.getState().simulation.session).toMatchObject({
      userId: null,
      level: 0,
      origin: "local",
    });
    expect(screen.queryByRole("dialog", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("User: Guest, mode LOCAL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
    expect(
      screen
        .getAllByRole("button", { name: "Change Over" })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Setup" }));
    expect(screen.getByRole("heading", { name: "Station Setup" })).toBeInTheDocument();
    expect(screen.getByLabelText("Station Name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Guest Logout" }));
    expect(screen.getByRole("dialog", { name: "Login" })).toBeInTheDocument();
  });

  it("navigates to Station Setup and applies a draft through the shared device store", async () => {
    const user = userEvent.setup();
    const store = createDme320Store({ initialNowMs: 0 });
    render(<Dme320Simulator store={store} />);
    await connectAndLogin(user, store);

    await user.click(screen.getByRole("button", { name: "Setup" }));
    expect(screen.getByRole("heading", { name: "Station Setup" })).toBeInTheDocument();

    const stationName = screen.getByLabelText("Station Name");
    await user.clear(stationName);
    await user.type(stationName, "TRAINING DME 320");

    expect(store.getState().simulation.config.draft.station.stationName).toBe(
      "TRAINING DME 320",
    );
    expect(store.getState().simulation.config.running.station.stationName).not.toBe(
      "TRAINING DME 320",
    );

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(store.getState().simulation.config.running.station.stationName).toBe(
      "TRAINING DME 320",
    );
    expect(store.getState().simulation.config.flashDirty).toBe(true);
  });

  it("toggles monitor bypass and renders the timed alarm and automatic changeover", async () => {
    const user = userEvent.setup();
    const store = createDme320Store({ initialNowMs: 0 });
    render(<Dme320Simulator store={store} />);
    await connectAndLogin(user, store);

    await user.click(screen.getByRole("button", { name: "Bypass" }));
    const bypassDialog = screen.getByRole("dialog", { name: "Monitor Bypass" });
    await user.click(within(bypassDialog).getByRole("button", { name: "Set Both Auto" }));
    expect(store.getState().simulation.monitors.mon1.mode).toBe("auto");
    expect(store.getState().simulation.monitors.mon2.mode).toBe("auto");
    await user.click(within(bypassDialog).getByRole("button", { name: "Close" }));

    act(() => {
      store.getState().dispatch({
        type: "inject-measurement",
        override: {
          monitorId: "mon1",
          channel: "executive",
          parameter: "timeDelayUs",
          value: 100,
        },
      });
      store.getState().advanceTo(1_000);
    });
    expect(
      screen.getByRole("status", { name: "MON1: AUTO / Alarm" }),
    ).toBeInTheDocument();
    expect(store.getState().simulation.monitorAction.automaticChangeovers).toBe(0);

    act(() => {
      store.getState().advanceTo(2_000);
      store.getState().advanceTo(6_000);
    });
    expect(store.getState().simulation.monitorAction.automaticChangeovers).toBe(1);
    expect(store.getState().simulation.transmitters.tx2.route).toBe("antenna");
    expect(
      screen.getByRole("status", { name: "TX2: Standby, on antenna, RF enabled" }),
    ).toBeInTheDocument();
  });

  it("keeps one live device state while switching between PMDT and LMI", async () => {
    const user = userEvent.setup();
    const store = createDme320Store({ initialNowMs: 0 });
    render(<Dme320Simulator store={store} />);
    await connectAndLogin(user, store);

    await user.click(screen.getByRole("button", { name: "LMI" }));
    const lmi = screen.getByLabelText("MOPIENS 320 DME Local Maintenance Interface");
    await user.click(within(lmi).getByRole("button", { name: "MAIN" }));
    expect(store.getState().simulation.mainTransponder).toBe("tx2");

    await user.click(within(lmi).getByRole("button", { name: "PMDT" }));
    expect(screen.getByLabelText("MOPIENS 320 DME PMDT")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "TX2: Main, on load, RF enabled" }),
    ).toBeInTheDocument();
  });

  it("applies Figure 4-114 advanced TXP controls to the shared device state", async () => {
    const user = userEvent.setup();
    const store = createDme320Store({ initialNowMs: 0 });
    render(<Dme320Simulator store={store} />);
    await connectAndLogin(user, store);

    act(() => {
      store.getState().dispatch({ type: "set-keylock", mode: "MAINT" });
    });

    await user.click(screen.getByRole("button", { name: "Maintenance" }));
    await user.click(screen.getByRole("button", { name: "TXP Advanced Control" }));
    expect(screen.getByRole("heading", { name: "TXP Advanced Control" })).toBeInTheDocument();

    const tx1 = () => screen.getByRole("region", { name: "TX1 Advanced Controls" });
    const tx2 = screen.getByRole("region", { name: "TX2 Advanced Controls" });
    const tx2Ident = within(tx2).getByRole("group", { name: "IDENT Keying" });
    await user.click(within(tx2Ident).getByRole("radio", { name: "Continuous" }));

    const squitter = within(tx1()).getByRole("group", { name: "Squitter Pulse" });
    await user.click(within(squitter).getByRole("radio", { name: "Off" }));
    await user.click(within(squitter).getByRole("button", { name: "Apply TX1 Squitter" }));

    const ident = within(tx1()).getByRole("group", { name: "IDENT Keying" });
    await user.click(within(ident).getByRole("radio", { name: "Continuous" }));
    await user.click(within(ident).getByRole("button", { name: "Apply TX1 IDENT Keying" }));

    const loopback = within(tx1()).getByRole("group", { name: "RF Loopback (TX to RX)" });
    await user.click(within(loopback).getByRole("radio", { name: "On" }));
    await user.click(within(loopback).getByRole("button", { name: "Apply TX1 RF Loopback" }));

    const spacing = within(tx1()).getByRole("group", { name: "Spacing" });
    const spacingOffset = within(spacing).getByRole("spinbutton", {
      name: /TX1 Spacing Offset/,
    });
    await user.clear(spacingOffset);
    await user.type(spacingOffset, "0.25");
    await user.click(within(spacing).getByRole("button", { name: "Apply TX1 Spacing Offset" }));

    expect(store.getState().simulation.transmitters.tx1).toMatchObject({
      squitterEnabled: false,
      identKeying: "continuous",
      rfLoopbackEnabled: true,
      spacingOffsetUs: 0.25,
    });
    expect(store.getState().simulation.transmitters.tx2).toMatchObject({
      squitterEnabled: true,
      identKeying: "on",
      rfLoopbackEnabled: false,
      spacingOffsetUs: 0,
    });
    expect(within(tx2Ident).getByRole("radio", { name: "Continuous" })).toBeChecked();

    act(() => {
      store.getState().dispatch({ type: "reset-system" });
    });
    const resetTx2Ident = within(
      screen.getByRole("region", { name: "TX2 Advanced Controls" }),
    ).getByRole("group", { name: "IDENT Keying" });
    expect(within(resetTx2Ident).getByRole("radio", { name: "On" })).toBeChecked();
    expect(store.getState().simulation.equipmentResetRevision).toBe(1);
  });
});
