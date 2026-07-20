import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TxConfigLayout } from "@/components/vor/screens/tx-config-layout";
import { TxDataLayout } from "@/components/vor/screens/tx-data-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("Transmitter screens", () => {
  beforeEach(() => useVorPmdtStore.getState().reset());

  it("shows power, frequency, VSWR, and Tx #1 status", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().openScreen("tx-data", ["Transmitters", "Data"], "Data");
    render(<TxDataLayout />);

    expect(screen.getByText("98.8")).toBeInTheDocument();
    expect(screen.getByText("113.0001")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Status Tx #1" }));
    expect(screen.getByText("Sideband 1 Phase").closest("li")).toHaveTextContent(
      "red",
    );
    expect(screen.getByRole("tab", { name: "Status Tx #2" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("switches between nominal configuration and all 18 offsets", async () => {
    const user = userEvent.setup();
    useVorPmdtStore.getState().openScreen(
      "tx-config",
      ["Transmitters", "Configuration"],
      "Configuration",
    );
    render(<TxConfigLayout />);

    const outputPowerInput = screen
      .getByText("Output Power")
      .closest("label")
      ?.querySelector("input");
    expect(outputPowerInput).toHaveValue("100");
    expect(screen.getByDisplayValue("FLR")).toHaveAttribute("readonly");
    await user.click(
      screen.getByRole("tab", { name: "Offsets & Scale Factors" }),
    );
    expect(screen.getByText("Carrier PLL Control")).toBeInTheDocument();
    expect(screen.getByText("Sideband VSWR Offset")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Integral Monitor Data" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
