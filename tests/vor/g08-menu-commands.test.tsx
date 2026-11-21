import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PmdtMenuBar } from "@/components/vor/pmdt-menu-bar";
import { createLowCarrierAnd9960Scenario } from "@/lib/dvor1150a";
import { unavailableVorCommandReason, vorMenuStructure } from "@/lib/vor-menu-structure";
import type { VorMenuItem } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function flatten(items: readonly VorMenuItem[]): VorMenuItem[] {
  return items.flatMap(item => [item, ...flatten(item.children ?? [])]);
}

function integralMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Monitors" }));
  return within(screen.getByRole("menu", { name: "Integral Monitor Bypass" }));
}

beforeEach(() => {
  useVorPmdtStore.getState().reset();
});
afterEach(() => { cleanup(); useVorPmdtStore.getState().reset(); });

describe("G08 native command menus", () => {
  it("has no enabled leaf without a dispatch path, including empty submenus", () => {
    expect(flatten([])).toEqual([]);
    for (const item of flatten(vorMenuStructure.flatMap(group => group.items))) {
      if (item.children?.length || !item.enabled) continue;
      expect(Boolean(item.action || item.screenId || ["tx-command-transfer", "monitor-command-integral-bypass-on", "monitor-command-integral-bypass-off", "rms-command-change-password"].includes(item.id)), item.id).toBe(true);
      expect(unavailableVorCommandReason(item.id), item.id).toBeUndefined();
    }
    expect(unavailableVorCommandReason("unknown-command")).toBeUndefined();
  });

  it("dispatches Integral On/Off immediately through native state, preserves drafts and logs evidence", () => {
    const store = useVorPmdtStore;
    store.getState().setMode("student");
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    render(<PmdtMenuBar />);
    let menu = integralMenu();
    expect(menu.getByRole("menuitem", { name: "Off" })).toHaveTextContent("•");
    fireEvent.click(menu.getByRole("menuitem", { name: "On" }));
    expect(store.getState().config.simulation.integralMonitorBypass).toBe(true);
    expect(store.getState().configDraft.simulation.integralMonitorBypass).toBe(true);
    expect(store.getState().data.monitorIntegral.bypass).toBe(true);
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(70);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(80);
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({ controlId: "simulation.integralMonitorBypass", accepted: true });
    expect(screen.queryByRole("menu", { name: "Monitors" })).not.toBeInTheDocument();
    menu = integralMenu();
    expect(menu.getByRole("menuitem", { name: "On" })).toHaveTextContent("•");
    expect(menu.getByRole("menuitem", { name: "Off" })).not.toHaveTextContent("•");
    fireEvent.click(menu.getByRole("menuitem", { name: "Off" }));
    expect(store.getState().data.monitorIntegral.bypass).toBe(false);
    expect(store.getState().configDraft.simulation.integralMonitorBypass).toBe(false);
  });

  it("keeps bypass commands in scenario evidence without applying or clearing the fault", () => {
    const store = useVorPmdtStore;
    expect(store.getState().startReviewScenario(createLowCarrierAnd9960Scenario())).toBe(true);
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    const power = store.getState().config.transmitters.tx1.nominal.outputPower;
    render(<PmdtMenuBar />);
    const menu = integralMenu();
    fireEvent.click(menu.getByRole("menuitem", { name: "On" }));
    expect(store.getState().scenario.active).toBe(true);
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(power);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({
      controlId: "simulation.integralMonitorBypass", accepted: true, after: { monitorBypass: true },
    });
  });

  it("tracks bypass changes made outside the menu without a stale selection", () => {
    const store = useVorPmdtStore;
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    render(<PmdtMenuBar />);
    const menu = integralMenu();
    act(() => { store.getState().lcuCommand("bypass"); });
    expect(menu.getByRole("menuitem", { name: "On" })).toHaveTextContent("•");
    act(() => { store.getState().setConfigValue("simulation.local", false); });
    expect(menu.getByRole("menuitem", { name: "Off" })).toHaveTextContent("•");
  });

  it.each(["GUEST", "SEC3"])("blocks unsafe Integral On for %s without changing native state", user => {
    useVorPmdtStore.getState().login(user, user === "SEC3" ? "THREE" : "");
    render(<PmdtMenuBar />);
    const menu = integralMenu();
    const on = menu.getByRole("menuitem", { name: "On" });
    expect(on).toHaveAttribute("aria-disabled", "true");
    expect(on).toHaveAttribute("title", user === "SEC3" ? "Bật Local trước khi bật Integral Monitor Bypass" : "Yêu cầu đăng nhập SEC3 hoặc SEC4");
    const before = useVorPmdtStore.getState();
    fireEvent.click(on);
    expect(useVorPmdtStore.getState()).toBe(before);
    const off = menu.getByRole("menuitem", { name: "Off" });
    if (user === "SEC3") expect(off).not.toHaveAttribute("aria-disabled");
    else expect(off).toHaveAttribute("aria-disabled", "true");
  });

  it.each(["RMS", "Monitors", "Monitor 1", "Monitor 2", "Transmitters"])("makes unsupported %s commands inert with specific reasons and no fictitious checkmarks", root => {
    useVorPmdtStore.getState().login("SEC3", "THREE");
    useVorPmdtStore.getState().setConfigValue("simulation.local", true);
    render(<PmdtMenuBar />);
    fireEvent.click(screen.getByRole("button", { name: root }));
    const unsupported = screen.getAllByRole("menuitem").filter(item => item.title.startsWith("Chưa mô phỏng"));
    expect(unsupported.length).toBeGreaterThan(0);
    const before = useVorPmdtStore.getState();
    for (const item of unsupported) {
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item).not.toHaveTextContent("•");
      fireEvent.click(item);
      expect(useVorPmdtStore.getState()).toBe(before);
    }
  });

  it("uses the documented RMS audio, spare-level and charger labels rather than invented TX/reset actions", () => {
    render(<PmdtMenuBar />);
    fireEvent.click(screen.getByRole("button", { name: "RMS" }));
    const audio = within(screen.getByRole("menu", { name: "Select Audio" }));
    expect(audio.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["No Audio", "Monitor #1 Ident", "Monitor #2 Ident"]);
    expect(screen.getAllByRole("menuitem", { name: "High" })).toHaveLength(4);
    expect(screen.getAllByRole("menuitem", { name: "Low" })).toHaveLength(4);
    expect(screen.getAllByRole("menuitem", { name: "Enable Charger" })).toHaveLength(2);
    expect(screen.getAllByRole("menuitem", { name: "Disable Charger" })).toHaveLength(2);
    expect(screen.queryByRole("menuitem", { name: "Reset" })).not.toBeInTheDocument();
  });
});
