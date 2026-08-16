import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/vor/pmdt-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("PMDT shell", () => {
  beforeEach(() => {
    useVorPmdtStore.getState().reset();
  });

  function login(userId = "GUEST", password = "") {
    expect(useVorPmdtStore.getState().login(userId, password)).toBe(true);
  }

  it("renders the PMDT frame and default sidebar data", () => {
    render(<PmdtLayout />);

    expect(screen.getByLabelText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    act(() => login());

    expect(
      screen.getByRole("heading", {
        name: /TST 117\.0 MHz - Dual DVOR - SELEX ES Inc\. PMDT/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("16.08")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/,
    );
  });

  it("navigates enabled items and leaves disabled items inert", async () => {
    const user = userEvent.setup();
    login();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Data" }));
    expect(useVorPmdtStore.getState().activeScreen).toBe("rms-data");

    await user.click(screen.getByRole("button", { name: "RMS" }));
    await user.click(screen.getByRole("menuitem", { name: "Status" }));
    expect(useVorPmdtStore.getState().activeScreen).toBe("rms-status");
    expect(screen.getByRole("heading", { name: "RMS Status" })).toBeInTheDocument();
  });

  it("exposes both required nested submenu structures", async () => {
    const user = userEvent.setup();
    login();
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

  it("renders the reference PMDT command toolbar", async () => {
    const user = userEvent.setup();
    login();
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "Monitors" }));
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }));
    expect(screen.getByRole("heading", { name: "Monitor Configuration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next (F5)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close \(F6\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply \(F7\)/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Reset \(F8\)/ })).toBeDisabled();
  });

  it("opens the parameter panel and propagates an Output Power edit", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    useVorPmdtStore.getState().setConfigValue("simulation.local", true);
    useVorPmdtStore.getState().setConfigValue("simulation.integralMonitorBypass", true);
    render(<PmdtLayout />);

    await user.click(screen.getByRole("button", { name: "System" }));
    await user.click(screen.getByRole("menuitem", { name: "Simulation Parameters..." }));

    expect(screen.getByRole("complementary", { name: "DVOR 1150A simulation parameters" })).toBeInTheDocument();
    const outputPowerInput = screen.getAllByRole("spinbutton", { name: /Output powerW/ })[0];
    await user.clear(outputPowerInput);
    await user.type(outputPowerInput, "100");

    expect(useVorPmdtStore.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(100);
    expect(useVorPmdtStore.getState().config.transmitters.tx1.nominal.outputPower).toBe(70);
    expect(useVorPmdtStore.getState().applyConfigChanges()).toBe(true);
    expect(useVorPmdtStore.getState().config.transmitters.tx1.nominal.outputPower).toBe(100);
    expect(useVorPmdtStore.getState().data.txPower[0].tx1).toBeCloseTo(101.142857, 5);
    expect(useVorPmdtStore.getState().needBackup).toBe(true);
  });
});
