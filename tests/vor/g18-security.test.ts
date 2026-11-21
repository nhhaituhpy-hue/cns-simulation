import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { extractDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";

function admin() {
  const store = createVorPmdtStore();
  store.getState().login("SEC4", "FOUR");
  store.getState().setConfigValue("simulation.local", true);
  store.getState().openView("rms-config", "rms-config-security", ["RMS", "Configuration", "Security Codes"], "Security Codes");
  return store;
}
function add(store: ReturnType<typeof admin>, id = "TECH", password = "DemoPass991", level = 2) {
  store.getState().stageSecurityField(3, "userId", id);
  store.getState().stageSecurityField(3, "password", password);
  store.getState().stageSecurityField(3, "securityLevel", level);
}

describe("G18 private native training credentials", () => {
  it("supports Level2 discrete RF commands but not critical parameters, bypass, backup or security", () => {
    const store = createVorPmdtStore();
    expect(store.getState().login("SEC2", "TWO2")).toBe(true);
    store.getState().setConfigValue("simulation.local", true);
    expect(store.getState().setTransmitterMode("tx1", "off")).toBe(true);
    expect(store.getState().setTransmitterMode("tx1", "main")).toBe(true);
    const config = store.getState().config;
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 90);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    expect(store.getState().config).toBe(config);
    expect(store.getState().configDirty).toBe(false);
    expect(store.getState().backupConfig()).toBe(false);
    expect(store.getState().getSecurityRows()).toEqual([]);
    expect(store.getState().stageSecurityField(3, "password", "DemoPass991")).toBe(false);
    expect(store.getState().applySecurityUsers()).toBe(false);
    store.getState().openView("rms-config", "rms-config-security", [], "Security Codes");
    expect(store.getState().activeView).not.toBe("rms-config-security");
  });

  it("requires Local for Load/Off, leaves GUEST read-only and keeps case-sensitive login", () => {
    const store = createVorPmdtStore();
    expect(store.getState().login("sec3", "THREE")).toBe(false);
    expect(store.getState().login("SEC3", "three")).toBe(false);
    expect(store.getState().login("GUEST", "")).toBe(true);
    store.getState().setConfigValue("simulation.local", true);
    expect(store.getState().config.simulation.local).toBe(false);
    expect(store.getState().setTransmitterMode("tx1", "off")).toBe(false);
    expect(store.getState().login("SEC2", "TWO2")).toBe(true);
    expect(store.getState().setTransmitterMode("tx1", "load")).toBe(false);
    expect(store.getState().setTransmitterMode("tx1", "off")).toBe(false);
  });

  it("blocks all accounts after three failures, including valid credentials, until exactly five minutes", () => {
    const store = createVorPmdtStore();
    for (let i = 0; i < 3; i++) expect(store.getState().login("", "")).toBe(false);
    expect(store.getState().loginLockRemaining).toBe(300);
    store.getState().openLogin();store.getState().logout();
    expect(store.getState().login("SEC4", "FOUR")).toBe(false);
    for (const time of [NaN, Infinity, -1]) store.getState().advanceSecurityTime(time);
    expect(store.getState().loginLockRemaining).toBe(300);
    store.getState().advanceSecurityTime(299.9);
    expect(store.getState().login("GUEST", "")).toBe(false);
    store.getState().advanceSecurityTime(0.1);
    expect(store.getState().login("SEC4", "FOUR")).toBe(true);
    expect(store.getState().loginLockRemaining).toBe(0);
    expect(store.getState().login("SEC3", "bad")).toBe(false);
    expect(store.getState().loginLockRemaining).toBe(0);
  });

  it("times out Remote inactivity without touching RF, drafts or protection; Local disables it", () => {
    const store = createVorPmdtStore();
    store.getState().login("SEC3", "THREE");
    const config = store.getState().config, protection = store.getState().protectionState;
    store.getState().advanceSecurityTime(899);
    expect(store.getState().securityLevel).toBe(3);
    store.getState().noteSecurityActivity();
    store.getState().advanceSecurityTime(899);
    expect(store.getState().securityLevel).toBe(3);
    store.getState().advanceSecurityTime(1);
    expect(store.getState()).toMatchObject({ securityLevel: 0, loginDialogOpen: true });
    expect(store.getState().config).toBe(config);expect(store.getState().protectionState).toBe(protection);
    store.getState().login("SEC3", "THREE");store.getState().setConfigValue("simulation.local", true);
    store.getState().advanceSecurityTime(5000);
    expect(store.getState().securityLevel).toBe(3);
    store.getState().setConfigValue("simulation.local", false);
    store.getState().advanceSecurityTime(900);
    expect(store.getState().securityLevel).toBe(0);
  });

  it("stages atomically, applies, deletes, edits levels and clears password drafts on F8", () => {
    const store = admin();add(store);
    expect(store.getState().login("TECH", "DemoPass991")).toBe(false);
    store.getState().login("SEC4", "FOUR");store.getState().setConfigValue("simulation.local", true);
    store.getState().openView("rms-config", "rms-config-security", [], "Security Codes");
    add(store);
    store.getState().discardConfigChanges();
    expect(store.getState().getSecurityRows()[3].userId).toBe("");
    add(store);expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().securityNeedsBackup).toBe(true);
    expect(store.getState().login("TECH", "DemoPass991")).toBe(true);
    expect(store.getState().securityLevel).toBe(2);
    store.getState().login("SEC4", "FOUR");
    store.getState().stageSecurityField(3, "securityLevel", 1);
    expect(store.getState().applySecurityUsers()).toBe(true);
    expect(store.getState().login("TECH", "DemoPass991")).toBe(true);
    expect(store.getState().securityLevel).toBe(1);
    store.getState().login("SEC4", "FOUR");
    store.getState().stageSecurityField(3, "userId", "");
    expect(store.getState().applySecurityUsers()).toBe(true);
    expect(store.getState().login("TECH", "DemoPass991")).toBe(false);
  });

  it.each(["abc", "HAS SPACE", "école", "a".repeat(33), "GUEST", "SEC3"])("rejects invalid, reserved or duplicate ID %s atomically", id => {
    const store = admin();add(store, id);
    expect(store.getState().applySecurityUsers()).toBe(false);
    expect(store.getState().securityError).toBeTruthy();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
  });

  it("validates passwords, first Level4 row and rechecks permission after staging", () => {
    const store = admin();add(store, "TECH", "bad");
    expect(store.getState().applySecurityUsers()).toBe(false);
    expect(store.getState().stageSecurityField(0, "securityLevel", 3)).toBe(false);
    expect(store.getState().stageSecurityField(99, "userId", "NOPE")).toBe(false);
    store.getState().stageSecurityField(0, "userId", "");
    expect(store.getState().applySecurityUsers()).toBe(false);
    store.getState().discardConfigChanges();add(store);
    store.getState().setConfigValue("simulation.local", false);
    expect(store.getState().applySecurityUsers()).toBe(false);
    store.getState().setConfigValue("simulation.local", true);
    store.setState(state => ({ config: { ...state.config, simulation: { ...state.config.simulation, connected: false } } }));
    expect(store.getState().applySecurityUsers()).toBe(false);
    store.setState(state => ({ config: { ...state.config, simulation: { ...state.config.simulation, connected: true } } }));
    store.setState(state => ({ scenario: { ...state.scenario, active: true } }));
    expect(store.getState().applySecurityUsers()).toBe(false);
  });

  it("backs up applied accounts, restores them on LCU reset, and starts defaults in a new store", () => {
    const store = admin();add(store);
    expect(store.getState().applySecurityUsers()).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().securityNeedsBackup).toBe(false);
    store.getState().stageSecurityField(3, "password", "OtherPass992");
    expect(store.getState().applySecurityUsers()).toBe(true);
    expect(store.getState().lcuCommand("reset")).toBe(true);
    expect(store.getState().login("TECH", "DemoPass991")).toBe(true);
    expect(store.getState().login("TECH", "OtherPass992")).toBe(false);
    const fresh = createVorPmdtStore();
    expect(fresh.getState().login("TECH", "DemoPass991")).toBe(false);
    expect(fresh.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().reset();expect(store.getState().login("TECH", "DemoPass991")).toBe(false);
  });

  it("changes only the current password with validation and never serializes credentials", () => {
    const store = admin();
    store.getState().setMode("student");
    const config = extractDvor1150aConfig(store.getState().config);
    expect(store.getState().changeOwnPassword("bad", "DemoPass991", "DemoPass991")).toBe(false);
    expect(store.getState().changeOwnPassword("FOUR", "bad", "bad")).toBe(false);
    expect(store.getState().changeOwnPassword("FOUR", "DemoPass991", "mismatch")).toBe(false);
    expect(store.getState().changeOwnPassword("FOUR", "DemoPass991", "DemoPass991")).toBe(true);
    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().actionHistory).toContainEqual(expect.objectContaining({ controlId: "change-own-password", accepted: true }));
    expect(extractDvor1150aConfig(store.getState().config)).toEqual(config);
    const serialized = JSON.stringify(store.getState());
    expect(serialized).not.toContain("DemoPass991");expect(serialized).not.toContain('"password":');
    expect(store.getState().getSecurityRows().every(row => !("password" in row))).toBe(true);
    expect(store.getState().login("SEC4", "DemoPass991")).toBe(true);
    expect(store.getState().login("SEC4", "FOUR")).toBe(false);
    store.getState().login("GUEST", "");
    expect(store.getState().changeOwnPassword("", "DemoPass991", "DemoPass991")).toBe(false);
  });
});
