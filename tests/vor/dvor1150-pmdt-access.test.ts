import { describe, expect, it } from "vitest";
import {
  canChangeDvor1150Password,
  canEditDvor1150SecurityCodes,
  createDvor1150PmdtStore,
} from "@/stores/dvor1150-pmdt-store";

const minute = 60_000;

function testSession() {
  let time = Date.UTC(2026, 0, 1);
  const store = createDvor1150PmdtStore({ now: () => new Date(time) });
  return { state: store.getState, advance: (milliseconds: number) => { time += milliseconds; } };
}

describe("DVOR 1150 PMDT access", () => {
  it("lets the user cancel an initial login or re-logon without changing access", () => {
    const { state } = testSession();
    state().cancelLogin();
    expect(state().loginDialogOpen).toBe(false);
    expect(state().config.simulation.connected).toBe(false);
    state().openLogin("direct");
    expect(state().login("GUEST", "")).toBe(true);
    state().openLogin();
    state().login("guest", "");
    state().cancelLogin();
    expect(state()).toMatchObject({ securityLevel: 1, authenticatedUserId: "GUEST", loginError: null });
    expect(state().config.simulation.connected).toBe(true);
    expect(state().executeCommand("set-time")).toBe(false);
    expect(state().setLocalMode(true)).toBe(false);
  });

  it("blocks further attempts for five minutes, including across cancel and reopen", () => {
    const { state, advance } = testSession();
    for (let attempt = 0; attempt < 3; attempt++) expect(state().login("sec3", "THREE")).toBe(false);
    state().cancelLogin();
    state().openLogin();
    advance(5 * minute - 1);
    expect(state().login("SEC3", "THREE")).toBe(false);
    advance(1);
    expect(state().login("SEC3", "THREE")).toBe(true);
    expect(state().failedLoginAttempts).toBe(0);
  });

  it("disconnects after fifteen minutes without activity, not fifteen minutes since login", () => {
    const { state, advance } = testSession();
    expect(state().login("SEC3", "THREE")).toBe(true);
    expect(state().setLocalMode(true)).toBe(true);
    advance(14 * minute);
    state().noteActivity();
    advance(15 * minute - 1);
    state().refreshClock();
    expect(state().config.simulation.connected).toBe(true);
    advance(1);
    state().refreshClock();
    expect(state().config.simulation).toMatchObject({ local: false, connected: false });
    expect(state()).toMatchObject({ authenticatedUserId: null, connectionType: null, securityLevel: 0, loginDialogOpen: false, activeView: "home" });
  });

  it("keeps Security Codes restricted to Level 4 and writable only in direct Local access", () => {
    const { state } = testSession();
    expect(state().login("SEC3", "THREE")).toBe(true);
    state().openView("rms-config", "rms-config-security-codes", []);
    expect(state().activeView).toBe("home");
    state().openView("rms-config", "rms-config-ad-limits", []);
    state().nextView();
    expect(state().activeView).toBe("rms-config-general");
    state().logout();
    state().openModem();
    state().openLogin("modem");
    expect(state().login("SEC4", "FOUR")).toBe(true);
    state().openView("rms-config", "rms-config-security-codes", []);
    expect(state().activeView).toBe("rms-config-security-codes");
    expect(canEditDvor1150SecurityCodes(state())).toBe(false);
    expect(canChangeDvor1150Password(state())).toBe(false);
    expect(state().setLocalMode(true)).toBe(false);
    state().openLogin();
    expect(state().login("GUEST", "")).toBe(true);
    expect(state().connectionType).toBe("modem");
    expect(state().activeView).toBe("rms-config-general");
  });

  it("supports demo Level 2 and password changes without exposing passwords in the store", () => {
    const { state } = testSession();
    expect(state().login("SEC4", "FOUR")).toBe(true);
    expect(state().setLocalMode(true)).toBe(true);
    const edits = state().securityCodes.map((account) => ({ userId: account?.userId ?? "", level: account?.level ?? 1, password: "" }));
    edits[2] = { userId: "Test2", level: 2, password: "Demo2" };
    expect(state().applySecurityCodes(edits)).toBeNull();
    expect(state().securityCodes[2]).toEqual({ userId: "Test2", level: 2 });
    state().openLogin();
    expect(state().login("Test2", "Demo2")).toBe(true);
    expect(state().executeCommand("set-time")).toBe(true);
    expect(state().applyConfigChanges()).toBe(false);
    expect(state().applySecurityCodes(edits)).not.toBeNull();
    expect(state().changePassword("Demo2", "Demo3", "Demo4")).not.toBeNull();
    expect(state().changePassword("Demo2", "Demo3", "Demo3")).toBeNull();
    state().logout();
    expect(state().login("Test2", "Demo2")).toBe(false);
    expect(state().login("Test2", "Demo3")).toBe(true);
    state().reset();
    expect(state().login("Test2", "Demo3")).toBe(false);
  });
});
