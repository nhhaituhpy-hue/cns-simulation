import { describe, expect, it } from "vitest";
import { createInitialDvor220State } from "@/modules/operations/dvor-220/domain/defaults";
import {
  getDvor220PermissionDecision,
  hasDvor220ControlOwnership,
} from "@/modules/operations/dvor-220/domain/permissions";
import { createAuthorizedDvor220State } from "./helpers";

describe("MOPIENS DVOR 220 permissions", () => {
  it("requires a connected readable session", () => {
    const state = createInitialDvor220State({ nowMs: 0 });

    expect(getDvor220PermissionDecision(state, "read")).toMatchObject({ allowed: false });
    expect(getDvor220PermissionDecision(state, "control")).toMatchObject({ allowed: false });
  });

  it("keeps level 1 read-only and gives level 2 control/configuration", () => {
    const level1 = createAuthorizedDvor220State({ level: 1 });
    const level2 = createAuthorizedDvor220State({ level: 2 });

    expect(getDvor220PermissionDecision(level1, "read").allowed).toBe(true);
    expect(getDvor220PermissionDecision(level1, "control").allowed).toBe(false);
    expect(getDvor220PermissionDecision(level2, "control").allowed).toBe(true);
    expect(getDvor220PermissionDecision(level2, "configure").allowed).toBe(true);
    expect(getDvor220PermissionDecision(level2, "calibrate").allowed).toBe(true);
    expect(getDvor220PermissionDecision(level2, "manage-users").allowed).toBe(false);
  });

  it.each([
    ["local", "LOCAL", true],
    ["local", "MAINT", true],
    ["local", "REM", false],
    ["remote", "LOCAL", false],
    ["remote", "MAINT", false],
    ["remote", "REM", true],
  ] as const)("resolves %s ownership in %s", (location, keylock, expected) => {
    const state = createAuthorizedDvor220State({ location, keylock });

    expect(hasDvor220ControlOwnership(state)).toBe(expected);
    expect(getDvor220PermissionDecision(state, "control").allowed).toBe(expected);
  });

  it("reserves user management and local RS-232 firmware update for level 3", () => {
    const localSerial = createAuthorizedDvor220State({ level: 3, kind: "rs232" });
    const localEthernet = createAuthorizedDvor220State({ level: 3, kind: "ethernet" });
    const level2Serial = createAuthorizedDvor220State({ level: 2, kind: "rs232" });

    expect(getDvor220PermissionDecision(localSerial, "manage-users").allowed).toBe(true);
    expect(getDvor220PermissionDecision(localSerial, "firmware-update").allowed).toBe(true);
    expect(getDvor220PermissionDecision(localEthernet, "firmware-update").allowed).toBe(false);
    expect(getDvor220PermissionDecision(level2Serial, "firmware-update").allowed).toBe(false);
  });

  it("enforces setup restrictions without changing read/control permissions", () => {
    const state = createAuthorizedDvor220State({ level: 2 });
    state.monitors.mon1.bypassRequested = false;
    state.monitors.mon2.bypassRequested = false;

    expect(getDvor220PermissionDecision(state, "control").allowed).toBe(true);
    expect(getDvor220PermissionDecision(state, "configure")).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("bypassed"),
    });
  });
});
