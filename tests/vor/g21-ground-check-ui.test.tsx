import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TxGroundCheck } from "@/components/vor/screens/tx-ground-check";
import { DiagnosticsWorkspace } from "@/components/vor/screens/diagnostics-workspace";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

beforeEach(() => useVorPmdtStore.getState().reset());
const s = () => useVorPmdtStore.getState();

describe("G21 ground check screen", () => {
  it("shows placeholders and the model limitation note before any run", () => {
    render(<TxGroundCheck txNumber={1} />);
    expect(screen.getByRole("status")).toHaveTextContent("No ground check has been run");
    expect(screen.getByText(/Training model only/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getAllByText("—").length).toBeGreaterThan(10);
  });

  it("runs, completes on the simulated clock and fills the tables from the snapshot", () => {
    render(<TxGroundCheck txNumber={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("status")).toHaveTextContent("in progress");
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    act(() => s().advanceMonitorTime(60));
    expect(screen.getByRole("status")).toHaveTextContent("Completed");
    expect(screen.getByRole("status")).toHaveTextContent("Monitor 2");
    const spreadRow = screen.getByText("Error Spread").closest("tr");
    expect(spreadRow?.textContent).not.toContain("—");
  });

  it("opens Advanced with print, copy, save and close actions over the snapshot", () => {
    const createObjectURL = vi.fn(() => "blob:ground-check");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    render(<TxGroundCheck txNumber={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    act(() => s().advanceMonitorTime(60));
    fireEvent.click(screen.getByRole("button", { name: "Advanced..." }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Duantal Error/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Print" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Copy" })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save As" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("G21 diagnostics screen", () => {
  it("labels diagnostics as a trainer model on both tabs without inventing a NOTAM warning", () => {
    render(<DiagnosticsWorkspace />);
    expect(screen.getByText(/Trainer model: these diagnostics simulate/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Fault Isolation" }));
    expect(screen.getByText(/Trainer model: these diagnostics simulate/)).toBeInTheDocument();
    expect(screen.getByText("Run a diagnostic to populate the result.")).toBeInTheDocument();
    expect(screen.queryByText(/Issue a NOTAM/)).not.toBeInTheDocument();
  });
});
