import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PmdtLayout } from "@/components/vor/pmdt-layout";
import { createLowCarrierAnd9960Scenario } from "@/lib/dvor1150a";
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

  it.each(["F8", "toolbar"])("cancels only pending edits through %s", async (entryPoint) => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    const store = useVorPmdtStore;
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    expect(store.getState().backupConfig()).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 90);
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "Transmitters" }));
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }));
    const power = screen.getByRole("textbox", { name: "txConfigNominal.audioGenParams.outputPower" });
    await user.click(power);
    expect(power).toHaveValue("90.0");
    const before = store.getState();
    if (entryPoint === "F8") fireEvent.keyDown(document, { key: "F8" });
    else await user.click(screen.getByRole("button", { name: /Reset \(F8\)/ }));
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().derived).toBe(before.derived);
    expect(store.getState().configurationBackup).toBe(before.configurationBackup);
    expect(store.getState().configDraft).toEqual(before.config);
    expect(store.getState().configDirty).toBe(false);
    expect(store.getState().needBackup).toBe(before.needBackup);
    expect(power).toHaveValue("80.0");
    fireEvent.keyDown(document, { key: "F8" });
    expect(store.getState().config).toBe(before.config);
    expect(screen.getByRole("button", { name: /Reset \(F8\)/ })).toBeDisabled();
  });

  it("does not restart a scenario or erase applied recovery/evidence on F8", () => {
    const store = useVorPmdtStore;
    expect(store.getState().startReviewScenario(createLowCarrierAnd9960Scenario())).toBe(true);
    login("SEC3", "THREE");
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 70);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    render(<PmdtLayout mode="student" />);
    const before = store.getState();
    fireEvent.keyDown(document, { key: "F8" });
    expect(store.getState().config).toBe(before.config);
    expect(store.getState().configDraft).toEqual(before.config);
    expect(store.getState().actionHistory).toBe(before.actionHistory);
    expect(store.getState().scenario).toBe(before.scenario);
  });

  it("disables RMS Restore without a backup and restores an explicit baseline backup", async () => {
    const user = userEvent.setup();
    login("SEC3", "THREE");
    const store = useVorPmdtStore;
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    render(<PmdtLayout />);
    await user.click(screen.getByRole("button", { name: "RMS" }));
    const restore = screen.getByRole("menuitem", { name: "Config Restore" });
    expect(restore).toHaveAttribute("aria-disabled", "true");
    expect(restore).toHaveAttribute("title", "Chưa có backup — hãy dùng Config Backup trước");
    await user.click(restore);
    expect(store.getState().hasConfigurationBackup).toBe(false);
    await user.click(screen.getByRole("menuitem", { name: "Config Backup" }));
    expect(store.getState().hasConfigurationBackup).toBe(true);
    act(() => {
      store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
      expect(store.getState().applyConfigChanges()).toBe(true);
    });
    await user.click(screen.getByRole("button", { name: "RMS" }));
    expect(screen.getByRole("menuitem", { name: "Config Restore" })).not.toHaveAttribute("aria-disabled");
    await user.click(screen.getByRole("menuitem", { name: "Config Restore" }));
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(70);
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
