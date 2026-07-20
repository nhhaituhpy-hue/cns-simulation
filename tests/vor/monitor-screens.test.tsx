import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MonitorConfigLayout } from "@/components/vor/screens/monitor-config-layout";
import { MonitorDataLayout } from "@/components/vor/screens/monitor-data-layout";
import { MonitorOffsets } from "@/components/vor/screens/monitor-offsets";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("Monitor screens", () => {
  beforeEach(() => useVorPmdtStore.getState().reset());

  it("shows integral data and the complete 48 antenna grid", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().openScreen("monitor-data", ["Monitors", "Data"], "Data");
    render(<MonitorDataLayout />);

    expect(screen.getAllByText("113.0000")).toHaveLength(2);
    await user.click(screen.getByRole("tab", { name: "Sideband Antenna VSWR" }));
    expect(screen.getByText("Antenna 1")).toBeInTheDocument();
    expect(screen.getByText("Antenna 48")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Notch Monitor" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders alarm limits, timers, and monitor antennas", () => {
    useVorPmdtStore.getState().openScreen(
      "monitor-config",
      ["Monitors", "Configuration"],
      "Configuration",
    );
    render(<MonitorConfigLayout />);

    expect(screen.getByText("Parameter Alarm Ranges")).toBeInTheDocument();
    expect(screen.getByText("Continuous Ident")).toBeInTheDocument();
    expect(screen.getByText("Monitor 2")).toBeInTheDocument();
  });

  it("reuses one offsets component for each monitor", () => {
    const { rerender } = render(<MonitorOffsets monitorNumber={1} />);
    expect(screen.getByText("Monitor 1 Offsets & Scale Factors")).toBeInTheDocument();
    expect(screen.getByText("Odd Antenna SB Return Loss Offset")).toBeInTheDocument();

    rerender(<MonitorOffsets monitorNumber={2} />);
    expect(screen.getByText("Monitor 2 Offsets & Scale Factors")).toBeInTheDocument();
  });
});
