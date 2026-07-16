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
    await user.click(powerTab);
    expect(powerTab).toHaveAttribute("aria-disabled", "true");
    expect(useVorPmdtStore.getState().activeView).toBe("rms-maintenance-alerts");
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
    useVorPmdtStore.getState().openScreen("rms-logs", ["RMS", "Logs"], "Logs");
    render(<RmsLogsLayout />);

    expect(screen.getAllByText("Tx Frequency Error").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "Maintenance Alerts" }));
    expect(screen.getAllByText("Battery Fault").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alert").length).toBeGreaterThan(0);
  });
});
