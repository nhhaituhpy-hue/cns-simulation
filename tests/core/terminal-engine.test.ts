import { describe, expect, it } from "vitest";

import {
  MA_MENUS,
  MA_ROOT_MENU_ID,
  SA_MENUS,
  SA_ROOT_MENU_ID,
} from "../../src/lib/menu-data";
import type { MenuTree } from "../../src/lib/menu-data/menu-types";
import {
  TerminalEngine,
  authenticateLoginUser,
  authenticateTerminalLogin,
  renderMenu,
} from "../../src/lib/terminal-engine";

describe("menu fixtures", () => {
  it("contains every planned SA root and level-two item", () => {
    const expectedCounts: Record<string, number> = {
      "sa.root": 9,
      "sa.general": 7,
      "sa.network": 7,
      "sa.surveillance-clients": 2,
      "sa.system-log": 4,
      "sa.snmp": 10,
      "sa.software": 4,
      "sa.customisation": 7,
      "sa.config-transfer": 3,
    };
    const menus: MenuTree = SA_MENUS;

    for (const [menuId, itemCount] of Object.entries(expectedCounts)) {
      expect(menus[menuId]?.items).toHaveLength(itemCount);
    }

    expect(menus["sa.software"]?.items.map((item) => item.label)).toEqual([
      "Display Version Information",
      "Reset System to Factory Default",
      "Restart System",
      "Update Software",
    ]);
  });

  it("contains every planned MA root and level-two item", () => {
    const expectedCounts: Record<string, number> = {
      "ma.root": 11,
      "ma.general": 4,
      "ma.network": 3,
      "ma.surveillance-clients": 3,
      "ma.system-log": 4,
      "ma.filters": 4,
      "ma.gps-ntp": 5,
      "ma.software": 2,
      "ma.system-stats": 8,
      "ma.customisation": 4,
      "ma.config-transfer": 3,
      "ma.monitoring-devices": 5,
    };
    const menus: MenuTree = MA_MENUS;

    for (const [menuId, itemCount] of Object.entries(expectedCounts)) {
      expect(menus[menuId]?.items).toHaveLength(itemCount);
    }
  });
});

describe("renderMenu", () => {
  it("renders a fixed-width ASCII menu with global return and exit choices", () => {
    const output = renderMenu(SA_MENUS[SA_ROOT_MENU_ID]);
    const boxedLines = output
      .split("\n")
      .filter((line) => line.startsWith("*"));

    expect(output).toContain("QUADRANT ADS-B MAINTENANCE APPLICATION");
    expect(output).toContain("(  9)    CHANGE ACTUAL OPERATION MODE");
    expect(output).toContain("(  0)    RETURN TO PREVIOUS MENU");
    expect(output).toContain("(  X)    EXIT MAINTENANCE APPLICATION");
    expect(output).not.toMatch(/[—–]/u);
    expect(boxedLines.every((line) => line.length === 74)).toBe(true);
  });

  it("aligns double-digit MA menu choices", () => {
    const output = renderMenu(MA_MENUS[MA_ROOT_MENU_ID]);

    expect(output).toContain("( 10)    CONFIGURATION EXPORT");
    expect(output).toContain("( 11)    MONITORING DEVICES");
  });
});

describe("TerminalEngine", () => {
  it("authenticates only the scenario target login user", () => {
    expect(authenticateLoginUser(" SYSADMIN ", "sysadmin")).toBe(true);
    expect(authenticateLoginUser("maintenance", "sysadmin")).toBe(false);
    expect(
      authenticateTerminalLogin(
        "sysadmin@192.168.201.1",
        "sysadmin",
        "192.168.201.1",
      ),
    ).toBe(true);
    expect(
      authenticateTerminalLogin(
        "maintenance@192.168.201.1",
        "sysadmin",
        "192.168.201.1",
      ),
    ).toBe(false);
    expect(
      authenticateTerminalLogin(
        "sysadmin@192.168.201.2",
        "sysadmin",
        "192.168.201.1",
      ),
    ).toBe(false);

    const engine = new TerminalEngine({ targetLoginUser: "maintenance" });
    expect(engine.authenticate("Maintenance")).toBe(true);
    expect(engine.authenticate("sysadmin")).toBe(false);
  });

  it("navigates with a stack and treats empty Enter or RETURN as menu 0", () => {
    const engine = new TerminalEngine({ targetLoginUser: "sysadmin" });

    const navigateResult = engine.processInput("2");
    expect(navigateResult.event).toBe("navigate");
    expect(engine.getState()).toMatchObject({
      currentMenuId: "sa.network",
      navigationStack: ["sa.root"],
    });

    const emptyReturn = engine.processInput("");
    expect(emptyReturn.normalizedInput).toBe("0");
    expect(emptyReturn.currentMenuId).toBe("sa.root");

    const topLevelReturn = engine.processInput("RETURN");
    expect(topLevelReturn.accepted).toBe(true);
    expect(topLevelReturn.currentMenuId).toBe("sa.root");
    expect(topLevelReturn.output).toContain("Already at top-level menu.");
  });

  it("keeps the current menu after invalid input", () => {
    const engine = new TerminalEngine({ targetLoginUser: "maintenance" });
    engine.processInput("6");

    const result = engine.processInput("99");

    expect(result.accepted).toBe(false);
    expect(result.event).toBe("invalid");
    expect(result.currentMenuId).toBe("ma.gps-ntp");
    expect(result.output).toContain("Invalid selection");
  });

  it("holds display screens until RETURN and records the continuation", () => {
    const engine = new TerminalEngine({ targetLoginUser: "sysadmin" });
    engine.processInput("6");

    const display = engine.processInput("1");
    expect(display.event).toBe("display");
    expect(display.output).toContain("Press RETURN to continue:");
    expect(engine.getState().pendingInteraction).toBe("display");

    const invalid = engine.processInput("2");
    expect(invalid.accepted).toBe(false);
    expect(engine.getState().pendingInteraction).toBe("display");

    const continued = engine.processInput("");
    expect(continued.event).toBe("continue");
    expect(continued.normalizedInput).toBe("0");
    expect(continued.recordableAction?.input).toBe("0");
    expect(engine.getState().pendingInteraction).toBeNull();
    expect(continued.currentMenuId).toBe("sa.software");
  });

  it("updates mock toggle state and stays in its current menu", () => {
    const engine = new TerminalEngine({ targetLoginUser: "sysadmin" });
    engine.processInput("1");
    engine.processInput("1");

    const result = engine.processInput("2");

    expect(result.event).toBe("setting-updated");
    expect(result.currentMenuId).toBe("sa.general");
    expect(engine.getState().settings["sa.adsb-cat21"]).toBe("disabled");
  });

  it("does not treat empty input as menu return while a value is required", () => {
    const engine = new TerminalEngine({ targetLoginUser: "sysadmin" });
    engine.processInput("1");
    engine.processInput("7");

    const result = engine.processInput("");

    expect(result.accepted).toBe(false);
    expect(result.event).toBe("invalid");
    expect(engine.getState().pendingInteraction).toBe("input");
    expect(engine.getState().pendingSensitive).toBe(false);
  });

  it.each(["x", "X"])("exits on %s from a pending interaction", (exitInput) => {
    const engine = new TerminalEngine({ targetLoginUser: "maintenance" });
    engine.processInput("5");
    engine.processInput("3");

    const result = engine.processInput(exitInput);

    expect(result.event).toBe("exit");
    expect(result.normalizedInput).toBe("X");
    expect(result.exited).toBe(true);
    expect(engine.getState().pendingInteraction).toBeNull();
  });

  it("never stores, records, echoes, or returns a sensitive password", () => {
    const engine = new TerminalEngine({ targetLoginUser: "maintenance" });
    const secret = "Do-Not-Store-This-Password";
    engine.processInput("9");
    engine.processInput("2");
    expect(engine.getState().pendingSensitive).toBe(true);

    const result = engine.processInput(secret);
    const serializedResult = JSON.stringify(result);
    const serializedState = JSON.stringify(engine.getState());

    expect(result.accepted).toBe(true);
    expect(result.normalizedInput).toBe("[REDACTED]");
    expect(result.recordableAction).toBeNull();
    expect(engine.getState().settings["ma.password"]).toBeUndefined();
    expect(engine.getState().pendingSensitive).toBe(false);
    expect(serializedResult).not.toContain(secret);
    expect(serializedState).not.toContain(secret);
  });
});
