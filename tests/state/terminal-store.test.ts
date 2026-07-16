import { describe, expect, it, vi } from "vitest";

import type { RecordableAction } from "@/lib/types";
import { createTerminalStore } from "@/stores/terminal-store";

function logIn(
  store: ReturnType<typeof createTerminalStore>,
  username: "sysadmin" | "maintenance",
  password = "training-password",
): void {
  store.getState().processInput(username);
  store.getState().processInput(password);
}

describe("terminal store", () => {
  it("coordinates authentication and engine navigation from one snapshot", () => {
    const recorded: RecordableAction[] = [];
    const store = createTerminalStore({
      recordAction: (action) => recorded.push(action),
    });
    store.getState().initialize("sysadmin");

    expect(store.getState()).toMatchObject({
      currentMenuId: "sa.root",
      isLoggedIn: false,
      authPhase: "username",
      pendingPrompt: "login",
      pendingSensitive: false,
    });

    store.getState().processInput("maintenance");
    expect(store.getState().authPhase).toBe("username");
    store.getState().processInput("sysadmin");
    expect(store.getState()).toMatchObject({
      pendingPrompt: "password",
      pendingSensitive: true,
    });
    store.getState().processInput("training-password");
    expect(store.getState()).toMatchObject({
      loginUser: "sysadmin",
      isLoggedIn: true,
      authPhase: "authenticated",
      pendingPrompt: null,
      pendingSensitive: false,
    });

    const result = store.getState().processInput("1");
    expect(result?.event).toBe("navigate");
    expect(store.getState()).toMatchObject({
      currentMenuId: "sa.general",
      menuStack: ["sa.root"],
    });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ menuId: "sa.root", input: "1" });
    expect(store.getState().outputLines).toBe(store.getState().output);
  });

  it("never retains login or change-password secrets", () => {
    const recorded: RecordableAction[] = [];
    const loginPassword = "Login-Secret-123";
    const changedPassword = "Changed-Secret-456";
    const store = createTerminalStore({
      recordAction: (action) => recorded.push(action),
    });
    store.getState().initialize("sysadmin");
    logIn(store, "sysadmin", loginPassword);
    store.getState().processInput("7");
    store.getState().processInput("9");
    expect(store.getState()).toMatchObject({
      pendingPrompt: "input",
      pendingSensitive: true,
    });
    const result = store.getState().processInput(changedPassword);
    const serializedState = JSON.stringify(store.getState());

    expect(result?.normalizedInput).toBe("[REDACTED]");
    expect(result?.recordableAction).toBeNull();
    expect(store.getState().pendingSensitive).toBe(false);
    expect(serializedState).not.toContain(loginPassword);
    expect(serializedState).not.toContain(changedPassword);
    expect(JSON.stringify(recorded)).not.toContain(changedPassword);
  });

  it("resets authentication, output, and engine navigation between attempts", () => {
    const store = createTerminalStore();
    store.getState().initialize("sysadmin");
    logIn(store, "sysadmin");
    store.getState().processInput("2");
    expect(store.getState().currentMenuId).toBe("sa.network");

    store.getState().reset();

    expect(store.getState()).toMatchObject({
      targetLoginUser: "sysadmin",
      loginUser: null,
      isLoggedIn: false,
      authPhase: "username",
      currentMenuId: "sa.root",
      menuStack: [],
      output: ["login:"],
      pendingPrompt: "login",
      pendingSensitive: false,
      isExited: false,
      lastProcessResult: null,
    });

    store.getState().initialize("maintenance");
    expect(store.getState()).toMatchObject({
      targetLoginUser: "maintenance",
      currentMenuId: "ma.root",
      menuStack: [],
    });
  });

  it("requires the standard username@device-IP login for student sessions", () => {
    const onAuthenticated = vi.fn();
    const store = createTerminalStore({ onAuthenticated });

    store.getState().initialize({
      targetLoginUser: "sysadmin",
      targetIpAddress: "192.168.201.1",
    });

    store.getState().processInput("sysadmin");
    expect(store.getState().authPhase).toBe("username");

    store.getState().processInput("sysadmin@192.168.201.1");
    expect(store.getState().authPhase).toBe("password");

    store.getState().processInput("training-password");
    expect(store.getState().isLoggedIn).toBe(true);
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });});
