import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { RmsDataLayout } from "@/components/vor/screens/rms-data-layout";
import { RmsLogsLayout } from "@/components/vor/screens/rms-logs-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("RMS screens", () => {
  beforeEach(() => useVorPmdtStore.getState().reset());

  it("shows exact maintenance data and blocks unavailable tabs", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().openScreen("rms-data", ["RMS", "Data"], "Data");
    render(<RmsDataLayout />);

    expect(screen.getByText("General Alerts")).toBeInTheDocument();
    expect(screen.getByLabelText("Local Mode")).not.toBeChecked();
    expect(screen.getByLabelText("File System Fault, Mon 2")).toBeChecked();

    const powerTab = screen.getByRole("tab", { name: "Power Supply Data" });
    expect(powerTab).not.toHaveAttribute("aria-disabled", "true");
    await user.click(powerTab);
    expect(useVorPmdtStore.getState().activeView).toBe("rms-power-supply");
  });

  it("records the detailed Digital I/O view in student mode", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().initializeSession({ mode: "student" });
    useVorPmdtStore.getState().openScreen("rms-data", ["RMS", "Data"], "Data");
    render(<RmsDataLayout />);

    await user.click(screen.getByRole("tab", { name: "Digital I/O" }));
    expect(screen.getByText("Smoke Detector")).toBeInTheDocument();
    expect(useVorPmdtStore.getState().attemptEvents.at(-1)?.viewId).toBe(
      "rms-digital-io",
    );
  });

  it("switches between alarm and maintenance logs", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().setOverride("alarmLogs.0.timeTag", "18/07/2026 09:10:11");
    useVorPmdtStore.getState().setOverride("alarmLogs.0.type", "Monitor 1 + 2");
    useVorPmdtStore.getState().setOverride("alarmLogs.0.alarm", "Custom VOR alarm");
    useVorPmdtStore.getState().setOverride("alarmLogs.0.state", "Alarm", "alarm");
    useVorPmdtStore.getState().setOverride("maintenanceLogs.0.alert", "Custom VOR maintenance alert");
    useVorPmdtStore.getState().openScreen("rms-logs", ["RMS", "Logs"], "Logs");
    render(<RmsLogsLayout />);

    expect(screen.getByText("18/07/2026 09:10:11")).toHaveAttribute("data-vor-field-id", "alarmLogs.0.timeTag");
    expect(screen.getByText("Monitor 1 + 2")).toHaveAttribute("data-vor-field-id", "alarmLogs.0.type");
    expect(screen.getByText("Custom VOR alarm")).toHaveAttribute("data-vor-field-id", "alarmLogs.0.alarm");
    expect(screen.getByText("Alarm", { selector: '[data-vor-field-id="alarmLogs.0.state"]' })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Maintenance Alerts" }));
    expect(screen.getByText("Custom VOR maintenance alert")).toHaveAttribute("data-vor-field-id", "maintenanceLogs.0.alert");
    expect(screen.getAllByText("Alert").length).toBeGreaterThan(0);
  });
});
