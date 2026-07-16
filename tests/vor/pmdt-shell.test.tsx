import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/vor/pmdt-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("PMDT shell", () => {
  beforeEach(() => {
    useVorPmdtStore.getState().reset();
  });

  it("renders the PMDT frame and default sidebar data", () => {
    render(<PmdtLayout />);

    expect(
      screen.getByRole("heading", {
        name: /Dual DVOR - SELEX Systems Integration Inc. PMDT/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("15.99")).toBeInTheDocument();
    expect(screen.getByText("17/01/2011 23:33:56")).toBeInTheDocument();
  });

  it("navigates enabled items and leaves disabled items inert", async () => {
    const user = userEvent.setup();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    expect(useVorPmdtStore.getState().activeScreen).toBe("rms-data");

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Status" }));
    expect(useVorPmdtStore.getState().activeScreen).toBe("rms-data");
    expect(screen.getByRole("menuitem", { name: "Status" })).toHaveAttribute(
      "title",
      "Chưa khả dụng",
    );
  });

  it("exposes both required nested submenu structures", async () => {
    const user = userEvent.setup();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Monitor 1" }));
    expect(
      screen.getByRole("menuitem", { name: "Test Signal Output (J3)" }),
    ).toHaveAttribute("aria-haspopup", "menu");
    expect(
      screen.getByRole("menuitem", { name: "Integral Composite" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    expect(screen.getByRole("menuitem", { name: "Commands" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(
      screen.getByRole("menuitem", { name: "Hold Commutator..." }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
