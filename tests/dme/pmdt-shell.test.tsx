import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/dme/pmdt-layout";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

describe("DME PMDT shell", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
  });

  function login(userId = "GUEST", password = "") {
    expect(useDmePmdtStore.getState().login(userId, password)).toBe(true);
  }

  it("renders the DME identity and documented sidebar data", () => {
    render(<PmdtLayout />);
    expect(screen.getByRole("form", { name: "Login" })).toBeInTheDocument();
    act(() => login());
    expect(screen.getByRole("heading", { name: /VIETNAM TUY HOA 117X - Dual DME - SELEX ES Inc\. PMDT/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Selex ES" })).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("11.97")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveTextContent(/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(screen.queryByText(/GUEST \(view only\)/i)).not.toBeInTheDocument();
  });

  it("opens enabled DME screens and leaves unavailable items inert", async () => {
    const user = userEvent.setup();
    login();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Status" }));
    expect(useDmePmdtStore.getState().activeScreen).toBe("rms-status");
    expect(screen.getByText("PMDT Logon Level")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "RMS" }));
    const dataItem = screen.getByRole("menuitem", { name: "Data" });
    expect(dataItem).not.toHaveAttribute("aria-disabled", "true");
    await user.click(dataItem);
    expect(useDmePmdtStore.getState().activeScreen).toBe("rms-data");
  });

  it("keeps maintenance commands disabled in Remote and enables them in Local", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "RMS" }));
    expect(screen.getByRole("menuitem", { name: "Config Backup" })).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Commands" }));
    await within(screen.getByRole("menu", { name: "Transmitter 1" })).getByRole("menuitem", { name: "Antenna" }).click();
    expect(within(screen.getByRole("menu", { name: "Transmitter 1" })).getByRole("menuitem", { name: "Antenna" })).toHaveAttribute("aria-disabled", "true");

    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    await waitFor(() => expect(within(screen.getByRole("menu", { name: "Transmitter 1" })).getByRole("menuitem", { name: "Antenna" })).not.toHaveAttribute("aria-disabled", "true"));
  });

  it("keeps the TX Transfer command enabled in Remote", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Commands" }));
    const commands = screen.getByRole("menu", { name: "Commands" });
    const transfer = within(commands).getByRole("menuitem", { name: "Transfer" });
    expect(transfer).not.toHaveAttribute("aria-disabled", "true");
    await user.click(transfer);
    expect(useDmePmdtStore.getState().data.monitorTransmitterStatus.mainSelect).toBe(2);
  });

  it("shows scenario-specific alarm text in RMS Logs", async () => {
    const user = userEvent.setup();
    login();
    useDmePmdtStore.getState().setOverride("alarmLogs.0.timeTag", "18/07/2026 09:10:11");
    useDmePmdtStore.getState().setOverride("alarmLogs.0.type", "Monitor 1 + 2");
    useDmePmdtStore.getState().setOverride("alarmLogs.0.alarm", "Custom DME alarm");
    useDmePmdtStore.getState().setOverride("alarmLogs.0.state", "Alarm", "alarm");
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Logs" }));
    await user.click(screen.getByRole("tab", { name: "Alarms" }));
    expect(screen.getByText("18/07/2026 09:10:11")).toHaveAttribute("data-dme-field-id", "alarmLogs.0.timeTag");
    expect(screen.getByText("Monitor 1 + 2")).toHaveAttribute("data-dme-field-id", "alarmLogs.0.type");
    expect(screen.getByText("Custom DME alarm")).toHaveAttribute("data-dme-field-id", "alarmLogs.0.alarm");
    expect(screen.getByText("Alarm", { selector: '[data-dme-field-id="alarmLogs.0.state"]' })).toBeInTheDocument();
  });

  it("switches through referenced monitor and transmitter tabs", async () => {
    const user = userEvent.setup();
    login();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Monitors" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    await user.click(screen.getByRole("tab", { name: "Standby" }));
    expect(useDmePmdtStore.getState().activeView).toBe("monitor-standby");
    expect(screen.getAllByRole("cell", { name: /50.01/ }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    await user.click(screen.getByRole("tab", { name: "RTC Data" }));
    expect(useDmePmdtStore.getState().activeView).toBe("tx-rtc-data");
    expect(screen.getByText("Delay Control Status")).toBeInTheDocument();
  });

  it("renders the PMDT function-key controls on the configuration screen", async () => {
    const user = userEvent.setup();
    login();
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "Monitors" }));
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }));

    for (const label of ["Print", "Copy", "Next (F5)", "Close (F6)", "Apply (F7)", "Reset (F8)"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Apply (F7)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset (F8)" })).toBeDisabled();
    const simulator = screen.getByRole("region", { name: "DME PMDT Simulator" });
    expect(within(simulator).getByText("Monitor Configuration")).toBeInTheDocument();
  });

  it("stages monitor executive-alarm and limit edits in Local", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "Monitors" }));
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }));
    await user.click(screen.getByRole("tab", { name: "Alarm Limits" }));

    const delayNominal = screen.getByRole("spinbutton", { name: "Delay Nominal" });
    expect(delayNominal).toBeDisabled();
    const delayAlarmRange = screen.getByRole("spinbutton", { name: "Delay Alarm Range" });
    await user.clear(delayAlarmRange);
    await user.type(delayAlarmRange, "0.45");
    expect(useDmePmdtStore.getState().configDraft.alarmLimits[0].alarmHigh).toBe(0.45);
    expect(useDmePmdtStore.getState().configDirty).toBe(true);
  });

  it("opens DME-specific simulation parameters and exposes the channel allocation", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "System" }));
    await user.click(screen.getByRole("menuitem", { name: "Simulation Parameters..." }));

    const panel = screen.getByRole("complementary", { name: "DME 1119A simulation parameters" });
    expect(within(panel).getByText("DME 1119A Parameters")).toBeInTheDocument();
    expect(within(panel).getByRole("cell", { name: "117X" })).toBeInTheDocument();
    expect(within(panel).getByRole("textbox", { name: "Assigned receiver (RX) MHz" })).toHaveValue("1141.000");
    expect(within(panel).getByRole("textbox", { name: "Transmitter reply (TX) MHz" })).toHaveValue("1204.000");
    expect(within(panel).getByRole("textbox", { name: "Monitor interrogator (INT) MHz" })).toHaveValue("1141.000");
    expect(within(panel).getByRole("textbox", { name: "Receiver LO MHz" })).toHaveValue("1016.000");

    await user.selectOptions(within(panel).getByRole("combobox", { name: "Channel type" }), "Y");
    expect(within(panel).getByRole("cell", { name: "117Y" })).toBeInTheDocument();
    expect(within(panel).getByRole("textbox", { name: "Transmitter reply (TX) MHz" })).toHaveValue("1078.000");
    expect(within(panel).getByRole("textbox", { name: "INT pulse spacing us" })).toHaveValue("36");
    expect(within(panel).getByRole("textbox", { name: "TX reply pulse spacing us" })).toHaveValue("30");
    expect(within(panel).getByRole("textbox", { name: "Nominal reply delay us" })).toHaveValue("56");
  });

  it("routes the Monitor 1 calibration shortcuts to the calibration tab", async () => {
    const user = userEvent.setup();
    login();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Monitor 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Interrogator Nominal Power" }));

    expect(useDmePmdtStore.getState().activeView).toBe("monitor-1-calibration");
    expect(screen.getByRole("region", { name: "Monitor 1 Calibration" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Interrogator Nominal Power" })).toHaveValue(-13.2);
  });

  it("keeps both DME transmitters powered while transferring the antenna", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Commands" }));
    await within(screen.getByRole("menu", { name: "Transmitter 2" })).getByRole("menuitem", { name: "Antenna" }).click();

    const state = useDmePmdtStore.getState().data;
    expect(state.monitorTransmitterStatus.mainSelect).toBe(2);
    expect(state.monitorTransmitterStatus.antennaSelect).toBe(2);
    expect(state.monitorTransmitterStatus.transmitterOn).toEqual({ tx1: true, tx2: true });
    expect(state.transmitters.tx1.load).toBe("green");
    expect(state.transmitters.tx2.main).toBe("green");
    expect(state.transmitters.tx2.antenna).toBe("green");

    // The manual specifies that Off changes only the transmitter power state;
    // relay selectors remain unchanged until a later Antenna/Load command.
    expect(useDmePmdtStore.getState().setTransmitterMode("tx2", "off")).toBe(true);
    const offState = useDmePmdtStore.getState().data;
    expect(offState.monitorTransmitterStatus.mainSelect).toBe(2);
    expect(offState.monitorTransmitterStatus.antennaSelect).toBe(2);
    expect(offState.monitorTransmitterStatus.transmitterOn).toEqual({ tx1: true, tx2: false });
    expect(offState.transmitters.tx1.load).toBe("green");
    expect(offState.transmitters.tx2.off).toBe("green");
  });

  it("exposes the RMS command names from the 1119A manual", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Commands" }));
    const menu = screen.getByRole("menu", { name: "Commands" });
    for (const label of ["Reset RMS CPU", "Reset Station Hardware", "Enable Command Mode", "Disable Command Mode"]) {
      expect(within(menu).getByRole("menuitem", { name: label })).toBeInTheDocument();
    }
  });

  it("stages DME parameter changes until Apply and marks the config for backup", () => {
    login("SEC3", "THREE");
    expect(useDmePmdtStore.getState().setLocalMode(true)).toBe(true);
    const store = useDmePmdtStore.getState();
    store.setParameterValue("rmsConfigStation.channelType", "Y");
    store.setParameterValue("rmsVoltageData.0.enabled", true);
    store.setParameterValue("monitorConfigGeneral.1.secondary", true);
    expect(useDmePmdtStore.getState().data.rmsConfigStation.channelType).toBe("X");
    expect(useDmePmdtStore.getState().data.rmsVoltageData[0].enabled).toBe(false);
    expect(useDmePmdtStore.getState().configDraft.monitorConfigGeneral[1]).toMatchObject({ primary: false, secondary: true });
    expect(useDmePmdtStore.getState().configDraft.rmsConfigStation.channelType).toBe("Y");
    expect(useDmePmdtStore.getState().configDirty).toBe(true);
    expect(useDmePmdtStore.getState().applyConfigChanges()).toBe(true);
    expect(useDmePmdtStore.getState().data.rmsConfigStation.channelType).toBe("Y");
    expect(useDmePmdtStore.getState().data.rmsVoltageData[0].enabled).toBe(true);
    expect(useDmePmdtStore.getState().data.monitorConfigGeneral[1]).toMatchObject({ primary: false, secondary: true });
    expect(useDmePmdtStore.getState().needBackup).toBe(true);
    expect(useDmePmdtStore.getState().backupConfig()).toBe(true);
    expect(useDmePmdtStore.getState().needBackup).toBe(false);
  });
});
