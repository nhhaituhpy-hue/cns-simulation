import { describe, expect, it } from "vitest";

import {
  MA_MENUS,
  MA_ROOT_MENU_ID,
  SA_MENUS,
  SA_ROOT_MENU_ID,
} from "../../src/lib/menu-data";
import type { MenuTree } from "../../src/lib/menu-data/menu-types";
import { NOI_BAI_TRAINING_SENSOR } from "../../src/lib/sensor-data-presets";
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
      "sa.surveillance-clients-maintenance": 6,
      "sa.system-log": 4,
      "sa.snmp": 10,
      "sa.software": 4,
      "sa.customisation": 7,
      "sa.customisation-maintenance": 10,
      "sa.end-to-end": 6,
      "sa.config-transfer": 3,
      "sa.config-transfer-maintenance": 3,
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
      "ma.general-maintenance": 4,
      "ma.asterix-maintenance": 10,
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
  it("defaults sessions without a sensor profile to Operational Mode", () => {
    const sysadmin = new TerminalEngine({ targetLoginUser: "sysadmin" });
    const maintenance = new TerminalEngine({ targetLoginUser: "maintenance" });

    expect(sysadmin.renderCurrentMenu()).toContain("- OPERATIONAL MODE -");
    expect(maintenance.renderCurrentMenu()).toContain("- OPERATIONAL MODE -");
  });

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

  it("toggles the actual sensor mode in both directions", () => {
    const profile = structuredClone(NOI_BAI_TRAINING_SENSOR);
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: profile,
    });

    const toMaintenancePrompt = engine.processInput("9");
    expect(toMaintenancePrompt.output).toContain(
      "Current Sensor Operation Mode: OPERATIONAL",
    );
    expect(toMaintenancePrompt.output).toContain(
      "(1) Set Sensor Operating Mode to MAINTENANCE",
    );
    expect(toMaintenancePrompt.output).not.toContain("Cancel");

    const maintenanceResult = engine.processInput("1");
    expect(maintenanceResult.output).toBe(
      'Actual Sensor Operating Mode: "MAINTENANCE"\nPRESS RETURN TO CONTINUE',
    );
    expect(
      engine.getPersistentState().sensorDataProfile?.operationMode,
    ).toBe("MAINTENANCE");

    engine.processInput("");
    const toOperationalPrompt = engine.processInput("9");
    expect(toOperationalPrompt.output).toContain(
      "Current Sensor Operation Mode: MAINTENANCE",
    );
    expect(toOperationalPrompt.output).toContain(
      "(1) Set Sensor Operating Mode to OPERATIONAL",
    );

    const operationalResult = engine.processInput("1");
    expect(operationalResult.output).toBe(
      'Actual Sensor Operating Mode: "OPERATIONAL"\nPRESS RETURN TO CONTINUE',
    );
    expect(
      engine.getPersistentState().sensorDataProfile?.operationMode,
    ).toBe("OPERATIONAL");
  });

  it("uses the maintenance Customisation menu and keeps the new sensor name", () => {
    const profile = structuredClone(NOI_BAI_TRAINING_SENSOR);
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: profile,
    });

    engine.processInput("9");
    engine.processInput("1");
    engine.processInput("");
    const customisationMenu = engine.processInput("7");

    expect(customisationMenu.currentMenuId).toBe(
      "sa.customisation-maintenance",
    );
    expect(customisationMenu.output).toContain("- Maintenance Mode -");
    expect(customisationMenu.output).toContain("(  1)    Set Sensor Name");
    expect(customisationMenu.output).toContain(
      "( 10)    Configure End-to-End System Test Parameters",
    );

    const sensorNamePrompt = engine.processInput("1");
    expect(sensorNamePrompt.output).toContain("SET SENSOR NAME");
    expect(sensorNamePrompt.output).toContain("Current sensor name: NoiBai");
    expect(sensorNamePrompt.output).toContain("(1) Set New Sensor Name");
    expect(sensorNamePrompt.output).toContain(
      "(2) Leave Sensor Name Unchanged",
    );
    expect(sensorNamePrompt.output).not.toContain("Cancel");

    engine.processInput("1");
    const changed = engine.processInput("NoiBai-Training");
    expect(changed.output).toContain(
      "Sensor name has been changed successfully.",
    );
    expect(engine.getPersistentState().sensorDataProfile?.sensorName).toBe(
      "NoiBai-Training",
    );

    engine.processInput("");
    engine.processInput("0");
    engine.processInput("9");
    const operationalResult = engine.processInput("1");
    expect(operationalResult.output).toContain(
      'Actual Sensor Operating Mode: "OPERATIONAL"',
    );
  });

  it("shares operating mode and SAC/SIC values across sysadmin and maintenance logins", () => {
    const operationalMaintenance = new TerminalEngine({
      targetLoginUser: "maintenance",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    const operationalGeneral = operationalMaintenance.processInput("1");
    expect(operationalGeneral.output).toContain("Display ASTERIX Settings");
    expect(operationalGeneral.output).not.toContain("Configure ASTERIX");

    const sysadmin = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    sysadmin.processInput("9");
    sysadmin.processInput("1");
    sysadmin.processInput("");

    const maintenance = new TerminalEngine({
      targetLoginUser: "maintenance",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    maintenance.restorePersistentState(sysadmin.getPersistentState());
    expect(maintenance.renderCurrentMenu()).toContain("- MAINTENANCE MODE -");
    expect(maintenance.renderCurrentMenu()).toContain("USER: MAINTENANCE");
    expect(maintenance.renderCurrentMenu()).toContain(
      "CONFIGURATION IMPORT / EXPORT",
    );

    const general = maintenance.processInput("1");
    expect(general.currentMenuId).toBe("ma.general-maintenance");
    expect(general.output).toContain(
      "Display and Set Sensor Position (Direct / Via GPS)",
    );

    const asterixMenu = maintenance.processInput("1");
    expect(asterixMenu.currentMenuId).toBe("ma.asterix-maintenance");
    expect(asterixMenu.output).toContain("(  2)    Configure SAC");
    expect(asterixMenu.output).toContain("( 10)    Configure CAT 247");

    const sacPrompt = maintenance.processInput("2");
    expect(sacPrompt.output).toContain("ASTERIX SAC: 94");
    expect(sacPrompt.output).toContain("ASTERIX SIC: 163");
    expect(sacPrompt.output).toContain(
      "UAP FRN 49 (Special Purpose Field",
    );
    expect(sacPrompt.output).toContain("New value for SAC:");
    maintenance.processInput("95");
    maintenance.processInput("");

    const sicPrompt = maintenance.processInput("3");
    expect(sicPrompt.output).toContain("ASTERIX SAC: 95");
    expect(sicPrompt.output).toContain("ASTERIX SIC: 163");
    expect(sicPrompt.output).toContain("New value for SIC:");
    maintenance.processInput("164");

    const restoredSysadmin = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    restoredSysadmin.restorePersistentState(maintenance.getPersistentState());
    const modePrompt = restoredSysadmin.processInput("9");
    expect(modePrompt.output).toContain(
      "Current Sensor Operation Mode: MAINTENANCE",
    );
    expect(modePrompt.output).toContain(
      "Set Sensor Operating Mode to OPERATIONAL",
    );
    expect(
      restoredSysadmin.getPersistentState().sensorDataProfile?.asterix,
    ).toMatchObject({ sac: 95, sic: 164 });
  });

  it("keeps an unconfirmed manual IP across reconnect and confirms it from the new address", () => {
    const profile = structuredClone(NOI_BAI_TRAINING_SENSOR);
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      targetIpAddress: profile.network.ip,
      sensorDataProfile: profile,
    });

    engine.processInput("9");
    engine.processInput("1");
    engine.processInput("");
    engine.processInput("2");
    const manualPrompt = engine.processInput("2");
    expect(manualPrompt.output).toContain(
      "NETWORK SETTINGS FOR ADS-B QUADRANT",
    );
    expect(manualPrompt.output).toContain("Confirmation       : CONFIRMED");
    expect(manualPrompt.output).toContain("IP Address         : 192.168.10.2");

    engine.processInput("1");
    engine.processInput("192.168.10.20");
    engine.processInput("255.255.255.0");
    const pendingResult = engine.processInput("192.168.10.252");
    expect(pendingResult.output).toContain("Confirmation       : UNCONFIRMED");
    expect(pendingResult.output).toContain(
      "Reconnect using sysadmin@192.168.10.20",
    );
    expect(engine.getConnectionIpAddress()).toBe("192.168.10.20");
    expect(engine.authenticate("sysadmin@192.168.10.2")).toBe(false);
    expect(engine.authenticate("sysadmin@192.168.10.20")).toBe(true);

    const restored = new TerminalEngine({
      targetLoginUser: "sysadmin",
      targetIpAddress: "192.168.10.2",
      sensorDataProfile: NOI_BAI_TRAINING_SENSOR,
    });
    restored.restorePersistentState(engine.getPersistentState());
    expect(restored.getConnectionIpAddress()).toBe("192.168.10.20");
    expect(restored.authenticate("sysadmin@192.168.10.20")).toBe(true);

    restored.processInput("2");
    const confirmPrompt = restored.processInput("3");
    expect(confirmPrompt.output).toContain(
      "CONFIRMATION OF MANUAL NETWORK SETTINGS",
    );
    expect(confirmPrompt.output).toContain("Confirmation       : UNCONFIRMED");
    const confirmed = restored.processInput("1");
    expect(confirmed.output).toContain("Confirmation       : CONFIRMED");
    expect(confirmed.output).toContain("Current settings are confirmed.");
    expect(restored.getPersistentState().sensorDataProfile?.network).toMatchObject(
      {
        ip: "192.168.10.20",
        subnet: "255.255.255.0",
        gateway: "192.168.10.252",
        dhcp: false,
      },
    );

    restored.processInput("");
    restored.processInput("0");
    restored.processInput("9");
    const operational = restored.processInput("1");
    expect(operational.output).toContain(
      'Actual Sensor Operating Mode: "OPERATIONAL"',
    );
  });

  it("uses mode-specific sysadmin menus and configures a client in maintenance mode", () => {
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });

    expect(engine.renderCurrentMenu()).toContain("- OPERATIONAL MODE -");
    expect(engine.renderCurrentMenu()).toContain("CONFIGURATION EXPORT");
    expect(engine.renderCurrentMenu()).not.toContain(
      "CONFIGURATION IMPORT / EXPORT",
    );

    engine.processInput("9");
    engine.processInput("1");
    engine.processInput("");
    expect(engine.renderCurrentMenu()).toContain("- MAINTENANCE MODE -");
    expect(engine.renderCurrentMenu()).toContain(
      "CONFIGURATION IMPORT / EXPORT",
    );

    const clientsMenu = engine.processInput("3");
    expect(clientsMenu.currentMenuId).toBe(
      "sa.surveillance-clients-maintenance",
    );
    expect(clientsMenu.output).toContain("(  4)    Configure Client");
    expect(clientsMenu.output).toContain(
      "(  5)    Change Message Type of ASTERIX Clients",
    );

    const rowPrompt = engine.processInput("4");
    expect(rowPrompt.output).toContain("QUADRANT SURVEILLANCE CLIENTS");
    expect(rowPrompt.output).toContain("( 5) (Disabled) <unconfigured>");
    expect(rowPrompt.output).toContain(
      "PLEASE TYPE THE CLIENT ROW NUMBER YOU WANT TO SELECT:",
    );

    engine.processInput("5");
    engine.processInput("1");
    engine.processInput("3");
    engine.processInput("TRAIN-QCMS");
    engine.processInput("192.168.80.50");
    const configured = engine.processInput("20550");
    expect(configured.output).toContain("Client Type         : ADS-B via UDP");
    expect(configured.output).toContain(
      "Message Type        : Surveillance and Service Messages",
    );
    expect(configured.output).toContain("Client State        : DISABLED");
    expect(engine.getPersistentState().sensorDataProfile?.clients).toContainEqual(
      expect.objectContaining({
        id: 5,
        name: "TRAIN-QCMS",
        ip: "192.168.80.50",
        port: 20550,
        protocol: "UDP",
        messageType: "all",
        enabled: false,
      }),
    );

    engine.processInput("");
    engine.processInput("4");
    engine.processInput("6");
    engine.processInput("2");
    engine.processInput("1");
    engine.processInput("TRAIN-TCP");
    const tcpConfigured = engine.processInput("192.168.80.60");
    expect(tcpConfigured.output).toContain("Client Type         : ADS-B via TCP");
    expect(tcpConfigured.output).toContain(
      "Destination Port    : Not applicable (TCP)",
    );
    expect(engine.getPersistentState().sensorDataProfile?.clients).toContainEqual(
      expect.objectContaining({
        id: 6,
        protocol: "TCP",
        port: 0,
      }),
    );
  });

  it("exports system configuration from the maintenance import/export menu", () => {
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });

    engine.processInput("9");
    engine.processInput("1");
    engine.processInput("");
    const transferMenu = engine.processInput("8");
    expect(transferMenu.currentMenuId).toBe("sa.config-transfer-maintenance");
    expect(transferMenu.output).toContain(
      "(  1)    Export Current System Configuration",
    );
    expect(transferMenu.output).toContain(
      "(  2)    Import New System Configuration",
    );
    expect(transferMenu.output).toContain("(  3)    Reset SSH Known Hosts");

    const exportPrompt = engine.processInput("1");
    expect(exportPrompt.output).toContain(
      "EXPORT QUADRANT ADS-B RECEIVER UNIT CONFIGURATION",
    );
    expect(exportPrompt.output).toContain(
      "Continue with the Configuration Export Procedure",
    );
    expect(exportPrompt.output).toContain(
      "Abort Configuration Export Procedure",
    );

    engine.processInput("1");
    engine.processInput("NoiBai_backup.cfg");
    engine.processInput("192.168.10.8");
    const exported = engine.processInput("/home/qcms/config");
    expect(exported.output).toContain(
      "Configuration File  : NoiBai_backup.cfg",
    );
    expect(exported.output).toContain("Remote Computer IP  : 192.168.10.8");
    expect(exported.output).toContain("Transfer Method     : Secure Copy (SCP)");
    expect(exported.output).toContain("Transfer Status     : SUCCESS");

    engine.processInput("");
    engine.processInput("0");
    engine.processInput("9");
    const operational = engine.processInput("1");
    expect(operational.output).toContain(
      'Actual Sensor Operating Mode: "OPERATIONAL"',
    );
  });

  it("configures RF alert and failure thresholds from the End-to-End menu", () => {
    const engine = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });

    engine.processInput("9");
    engine.processInput("1");
    engine.processInput("");
    engine.processInput("7");
    const endToEndMenu = engine.processInput("10");
    expect(endToEndMenu.currentMenuId).toBe("sa.end-to-end");
    expect(endToEndMenu.output).toContain(
      "CONFIGURE THE END-TO-END SYSTEM CHECK PARAMETERS",
    );
    expect(endToEndMenu.output).toContain(
      "(2) Configure Power Level Thresholds for the End-to-End System Check",
    );
    expect(endToEndMenu.output).toContain(
      "(6) Quit Configuration of End-to-End Parameters",
    );

    const thresholdPrompt = engine.processInput("2");
    expect(thresholdPrompt.output).toContain(
      "CONFIGURE POWER LEVEL THRESHOLDS FOR THE END-TO-END SYSTEM CHECK",
    );
    expect(thresholdPrompt.output).toContain(
      "Current Power Level to Trigger an Alert   : 164",
    );
    expect(thresholdPrompt.output).toContain(
      "Current Power Level to Trigger a Failure : 140",
    );
    expect(thresholdPrompt.output).toContain("(1) Set New Thresholds");
    expect(thresholdPrompt.output).toContain(
      "(2) Leave Actual Configuration Unchanged",
    );

    engine.processInput("1");
    engine.processInput("170");
    const configured = engine.processInput("145");
    expect(configured.output).toContain("New Alert Power Level         : 170");
    expect(configured.output).toContain("New Failure Power Level       : 145");
    expect(engine.getPersistentState().runtime).toMatchObject({
      alertPower: 170,
      failurePower: 145,
    });
    expect(engine.getPersistentState().sensorDataProfile?.endToEnd).toMatchObject(
      {
        alertPower: 170,
        failurePower: 145,
      },
    );

    engine.processInput("");
    engine.processInput("6");
    engine.processInput("0");
    engine.processInput("9");
    const operational = engine.processInput("1");
    expect(operational.output).toContain(
      'Actual Sensor Operating Mode: "OPERATIONAL"',
    );
  });

  it("obtains the actual NoiBai sensor position from GPS in maintenance mode", () => {
    const sysadmin = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    sysadmin.processInput("9");
    sysadmin.processInput("1");
    sysadmin.processInput("");

    const maintenance = new TerminalEngine({
      targetLoginUser: "maintenance",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    maintenance.restorePersistentState(sysadmin.getPersistentState());
    const general = maintenance.processInput("1");
    expect(general.currentMenuId).toBe("ma.general-maintenance");
    expect(general.output).toContain("(  1)    Configure ASTERIX");
    expect(general.output).toContain(
      "(  2)    Display and Set Sensor Position (Direct / Via GPS)",
    );
    expect(general.output).toContain(
      "(  4)    Select Downlink Formats for Transmission",
    );

    const positionPrompt = maintenance.processInput("2");
    expect(positionPrompt.output).toContain(
      "CONFIGURE AND DISPLAY SENSOR POSITION",
    );
    expect(positionPrompt.output).toContain(
      "Latitude (degree)       : 21.212983",
    );
    expect(positionPrompt.output).toContain(
      "Longitude (degree)      : 105.831922",
    );
    expect(positionPrompt.output).toContain(
      "Geoidal Height (metres) : 29.900000",
    );
    expect(positionPrompt.output).toContain(
      "(2) Obtain Position from GPS Device.",
    );

    const gpsPrompt = maintenance.processInput("2");
    expect(gpsPrompt.output).toContain("OBTAIN POSITION FROM GPS DEVICE");
    expect(gpsPrompt.output).toContain("(1) Actual Position");
    const configured = maintenance.processInput("1");
    expect(configured.output).toContain(
      "Latitude (degree)     : 21.212983",
    );
    expect(configured.output).toContain(
      "Longitude (degree)    : 105.831922",
    );
    expect(configured.output).toContain(
      "Geoidal Height (m)    : 29.900000",
    );
    expect(maintenance.getPersistentState().sensorDataProfile?.gps).toMatchObject(
      {
        latitude: "21.212983",
        longitude: "105.831922",
        altitude: "29.900000",
      },
    );

    const restoredSysadmin = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    restoredSysadmin.restorePersistentState(maintenance.getPersistentState());
    restoredSysadmin.processInput("9");
    const operational = restoredSysadmin.processInput("1");
    expect(operational.output).toContain(
      'Actual Sensor Operating Mode: "OPERATIONAL"',
    );
  });

  it("resets SSH known hosts before retrying configuration file transfer", () => {
    const sysadmin = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    sysadmin.processInput("9");
    sysadmin.processInput("1");
    sysadmin.processInput("");

    const maintenance = new TerminalEngine({
      targetLoginUser: "maintenance",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    maintenance.restorePersistentState(sysadmin.getPersistentState());
    expect(maintenance.renderCurrentMenu()).toContain(
      "( 10)    CONFIGURATION IMPORT / EXPORT",
    );

    const transferMenu = maintenance.processInput("10");
    expect(transferMenu.currentMenuId).toBe("ma.config-transfer");
    expect(transferMenu.output).toContain("(  3)    Reset SSH Known Hosts");

    const resetPrompt = maintenance.processInput("3");
    expect(resetPrompt.output).toContain("RESET OF KNOWN HOSTS FILE FOR SSH");
    expect(resetPrompt.output).toContain(
      "SSH maintains a list of all known hosts.",
    );
    expect(resetPrompt.output).toContain(
      "(1) Reset the SSH Known Hosts File",
    );
    expect(resetPrompt.output).toContain("(2) Abort");

    const reset = maintenance.processInput("1");
    expect(reset.output).toContain(
      "The SSH known hosts file has been reset successfully.",
    );
    expect(reset.output).toContain(
      "Configuration file transfer can now be attempted again.",
    );
    maintenance.processInput("");

    const restoredSysadmin = new TerminalEngine({
      targetLoginUser: "sysadmin",
      sensorDataProfile: structuredClone(NOI_BAI_TRAINING_SENSOR),
    });
    restoredSysadmin.restorePersistentState(maintenance.getPersistentState());
    restoredSysadmin.processInput("9");
    const operational = restoredSysadmin.processInput("1");
    expect(operational.output).toContain(
      'Actual Sensor Operating Mode: "OPERATIONAL"',
    );
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
