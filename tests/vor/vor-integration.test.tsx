import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { PmdtLayout } from "@/components/vor/pmdt-layout";
import { useScenarioStore } from "@/stores/scenario-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("VOR integration", () => {
  beforeEach(() => {
    useVorPmdtStore.getState().reset();
    useScenarioStore.setState({
      scenarios: [],
      isHydrated: true,
      storageError: null,
    });
  });

  it("opens the PMDT preview from the Admin VOR route", () => {
    render(<AdminDashboard activeModule="vor" />);

    expect(
      screen.getByRole("heading", { name: "PMDT Simulator - DVOR 1150A" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở PMDT Simulator" })).toHaveAttribute(
      "href",
      "/simulator/dvor-1150a",
    );
  });

  it("routes PMDT menu selections to the complete screen content", async () => {
    const user = userEvent.setup();
    expect(useVorPmdtStore.getState().login("GUEST", "")).toBe(true);
    render(<PmdtLayout />);

    expect(screen.getByAltText("Selex ES")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    expect(screen.getByRole("heading", { name: "Power" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "VSWR" })).toBeInTheDocument();
  });
});
