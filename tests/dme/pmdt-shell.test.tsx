import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/dme/pmdt-layout";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

describe("DME PMDT shell", () => {
  beforeEach(() => {
    useDmePmdtStore.getState().reset();
  });

  it("renders the DME identity and documented sidebar data", () => {
    render(<PmdtLayout />);
    expect(screen.getByRole("heading", { name: /Dual DME - SELEX Systems Integration Inc. PMDT/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "ATTECH" })).toBeInTheDocument();
    expect(screen.getByText("TTECH")).toBeInTheDocument();
    expect(screen.queryByLabelText("SELEX")).not.toBeInTheDocument();
    expect(screen.getByText("Dual DME Model 1118A/1119A")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("12.02")).toBeInTheDocument();
    expect(screen.getAllByText("17/01/2011 10:40:06").length).toBeGreaterThan(0);
  });

  it("opens enabled DME screens and leaves unavailable items inert", async () => {
    const user = userEvent.setup();
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

  it("shows scenario-specific alarm text in RMS Logs", async () => {
    const user = userEvent.setup();
    useDmePmdtStore.getState().setOverride("alarmLogs.0.timeTag", "18/07/2026 09:10:11");
    useDmePmdtStore.getState().setOverride("alarmLogs.0.type", "Monitor 1 + 2");
    useDmePmdtStore.getState().setOverride("alarmLogs.0.alarm", "Custom DME alarm");
    useDmePmdtStore.getState().setOverride("alarmLogs.0.state", "Alarm", "alarm");
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Logs" }));
    expect(screen.getByText("18/07/2026 09:10:11")).toHaveAttribute("data-dme-field-id", "alarmLogs.0.timeTag");
    expect(screen.getByText("Monitor 1 + 2")).toHaveAttribute("data-dme-field-id", "alarmLogs.0.type");
    expect(screen.getByText("Custom DME alarm")).toHaveAttribute("data-dme-field-id", "alarmLogs.0.alarm");
    expect(screen.getByText("Alarm", { selector: '[data-dme-field-id="alarmLogs.0.state"]' })).toBeInTheDocument();
  });

  it("switches through referenced monitor and transmitter tabs", async () => {
    const user = userEvent.setup();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Monitors" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    await user.click(screen.getByRole("tab", { name: "Standby" }));
    expect(useDmePmdtStore.getState().activeView).toBe("monitor-standby");
    expect(screen.getByRole("cell", { name: /49.99/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    await user.click(screen.getByRole("tab", { name: "RTC Data" }));
    expect(useDmePmdtStore.getState().activeView).toBe("tx-rtc-data");
    expect(screen.getByText("Delay Control Status")).toBeInTheDocument();
  });

  it("omits the PMDT function-key controls requested by the simulator brief", async () => {
    const user = userEvent.setup();
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "Monitors" }));
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }));

    for (const label of ["Save", "Print", "Next", "Close", "Apply", "Reset"]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
    for (const key of ["F5", "F6", "F7", "F8"]) {
      expect(screen.queryByText(key)).not.toBeInTheDocument();
    }
    const simulator = screen.getByRole("region", { name: "DME PMDT Simulator" });
    expect(within(simulator).getByText("Monitor Configuration")).toBeInTheDocument();
  });
});
