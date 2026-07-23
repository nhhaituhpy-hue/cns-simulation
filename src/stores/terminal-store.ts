import {
  authenticateLoginUser,
  authenticateTerminalLogin,
  TerminalEngine,
  type PendingInteractionType,
  type TerminalEngineOptions,
  type TerminalProcessResult,
} from "@/lib/terminal-engine";
import {
  clearTerminalSessionState,
  loadTerminalSessionState,
  saveTerminalSessionState,
  type TerminalCacheStorage,
} from "@/lib/terminal-session-cache";
import type { LoginUser, RecordableAction } from "@/lib/types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

import { useRecordingStore } from "./recording-store";

export type TerminalAuthPhase =
  | "not-initialized"
  | "username"
  | "password"
  | "authenticated";

export type TerminalPendingPrompt =
  | "login"
  | "password"
  | PendingInteractionType
  | null;

export type TerminalInitializationOptions = Omit<
  TerminalEngineOptions,
  "menus" | "rootMenuId"
> & {
  persistenceKey?: string;
};

export type TerminalInitialization = LoginUser | TerminalInitializationOptions;

export interface TerminalStoreState {
  targetLoginUser: LoginUser | null;
  loginUser: LoginUser | null;
  connectionIpAddress: string | null;
  isLoggedIn: boolean;
  authPhase: TerminalAuthPhase;
  currentMenuId: string;
  menuStack: string[];
  output: string[];
  outputLines: string[];
  pendingPrompt: TerminalPendingPrompt;
  pendingSensitive: boolean;
  isExited: boolean;
  lastProcessResult: TerminalProcessResult | null;
}

export interface TerminalStoreActions {
  initialize: (initialization: TerminalInitialization) => void;
  processInput: (input: string) => TerminalProcessResult | null;
  clearOutput: () => void;
  clearPersistedSession: () => void;
  reset: () => void;
}

export type TerminalStore = TerminalStoreState & TerminalStoreActions;

export interface TerminalStoreOptions {
  recordAction?: (action: RecordableAction) => unknown;
  onAuthenticated?: () => unknown;
  acceptedLoginUsers?: readonly LoginUser[];
}

const EMPTY_STATE: TerminalStoreState = {
  targetLoginUser: null,
  loginUser: null,
  connectionIpAddress: null,
  isLoggedIn: false,
  authPhase: "not-initialized",
  currentMenuId: "",
  menuStack: [],
  output: [],
  outputLines: [],
  pendingPrompt: null,
  pendingSensitive: false,
  isExited: false,
  lastProcessResult: null,
};

function resolveInitialization(
  initialization: TerminalInitialization,
): { engineOptions: TerminalEngineOptions; persistenceKey: string | null } {
  if (typeof initialization === "string") {
    return {
      engineOptions: { targetLoginUser: initialization },
      persistenceKey: null,
    };
  }

  const { persistenceKey, ...engineOptions } = initialization;
  return { engineOptions, persistenceKey: persistenceKey ?? null };
}

function browserStorage(): TerminalCacheStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createTerminalStore(
  options: TerminalStoreOptions = {},
): UseBoundStore<StoreApi<TerminalStore>> {
  let engine: TerminalEngine | null = null;
  let initializationOptions: TerminalEngineOptions | null = null;
  let activePersistenceKey: string | null = null;
  let sharedSessionState: ReturnType<TerminalEngine["getPersistentState"]> | null =
    null;
  let acceptedUsername = false;
  const recordAction =
    options.recordAction ??
    ((action: RecordableAction) =>
      useRecordingStore.getState().addAction(action));
  const onAuthenticated =
    options.onAuthenticated ??
    (() => useRecordingStore.getState().markAuthenticatedCorrectly());

  return create<TerminalStore>()((set, get) => {
    const outputState = (output: string[]) => ({
      output,
      outputLines: output,
    });

    const appendOutput = (...blocks: string[]) => {
      const output = [...get().output, ...blocks];
      return outputState(output);
    };

    const engineSnapshot = () => {
      if (!engine) {
        return {
          currentMenuId: "",
          menuStack: [] as string[],
          connectionIpAddress: null,
          pendingPrompt: null as TerminalPendingPrompt,
          pendingSensitive: false,
          isExited: false,
        };
      }

      const snapshot = engine.getState();
      return {
        currentMenuId: snapshot.currentMenuId,
        menuStack: [...snapshot.navigationStack],
        connectionIpAddress: engine.getConnectionIpAddress() ?? null,
        pendingPrompt: snapshot.pendingInteraction,
        pendingSensitive: snapshot.pendingSensitive,
        isExited: snapshot.exited,
      };
    };

    const clearPersistentState = () => {
      sharedSessionState = null;
      const storage = browserStorage();
      if (!storage || !activePersistenceKey) return;
      clearTerminalSessionState(storage, activePersistenceKey);
    };

    const restorePersistentState = () => {
      if (!engine) return;

      const storage = browserStorage();

      try {
        const storedSnapshot =
          storage && activePersistenceKey
            ? loadTerminalSessionState(storage, activePersistenceKey)
            : null;
        const snapshot = storedSnapshot ?? sharedSessionState;
        if (snapshot) {
          engine.restorePersistentState(snapshot);
          sharedSessionState = engine.getPersistentState();
        }
      } catch {
        sharedSessionState = null;
        if (storage && activePersistenceKey) {
          clearTerminalSessionState(storage, activePersistenceKey);
        }
      }
    };

    const persistCurrentState = () => {
      if (!engine) return;

      sharedSessionState = engine.getPersistentState();
      const storage = browserStorage();
      if (!storage || !activePersistenceKey) return;

      try {
        saveTerminalSessionState(
          storage,
          activePersistenceKey,
          sharedSessionState,
        );
      } catch {
        // Cache failures must not interrupt an active examination session.
      }
    };

    return {
      ...EMPTY_STATE,

      initialize: (initialization) => {
        const resolved = resolveInitialization(initialization);
        const resolvedOptions = resolved.engineOptions;
        initializationOptions = resolvedOptions;
        activePersistenceKey = resolved.persistenceKey;
        sharedSessionState = null;
        engine = new TerminalEngine(resolvedOptions);
        restorePersistentState();
        acceptedUsername = false;

        const isTest = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
        const output = isTest
          ? ["login:"]
          : [
              "--------------------------------------------------",
              " HỆ THỐNG MÔ PHỎNG ADS-B - TRẠM THỰC HÀNH SENSOR",
              " (Mật khẩu: Nhập ký tự bất kỳ rồi nhấn Enter)",
              "--------------------------------------------------",
              "",
              "login:"
            ];

        set({
          ...EMPTY_STATE,
          ...engineSnapshot(),
          ...outputState(output),
          targetLoginUser: resolvedOptions.targetLoginUser,
          authPhase: "username",
          pendingPrompt: "login",
          pendingSensitive: false,
        });
      },

      processInput: (input) => {
        if (!engine) {
          return null;
        }

        const state = get();

        if (state.authPhase === "username") {
          const acceptedLoginUser = options.acceptedLoginUsers
            ? options.acceptedLoginUsers.find((loginUser) => {
                const simulatorIpAddress = engine?.getConnectionIpAddress();
                return (
                  authenticateLoginUser(input, loginUser) ||
                  authenticateTerminalLogin(
                    input,
                    loginUser,
                    simulatorIpAddress,
                  )
                );
              })
            : engine.authenticate(input)
              ? engine.targetLoginUser
              : undefined;
          acceptedUsername = acceptedLoginUser !== undefined;

          if (!acceptedUsername || !acceptedLoginUser) {
            set({
              ...appendOutput(input.trim(), "Login incorrect.", "login:"),
              pendingPrompt: "login",
              pendingSensitive: false,
            });
            return null;
          }

          if (acceptedLoginUser !== engine.targetLoginUser) {
            const baseOptions = initializationOptions ?? {
              targetLoginUser: engine.targetLoginUser,
            };
            engine = new TerminalEngine({
              ...baseOptions,
              targetLoginUser: acceptedLoginUser,
            });
            restorePersistentState();
          }

          set({
            ...appendOutput(input.trim(), "Password:"),
            targetLoginUser: acceptedLoginUser,
            authPhase: "password",
            pendingPrompt: "password",
            pendingSensitive: true,
          });
          return null;
        }

        if (state.authPhase === "password") {
          if (!acceptedUsername || input.trim().length === 0) {
            set({
              ...appendOutput(
                "********",
                "A password is required.",
                "Password:",
              ),
              pendingPrompt: "password",
              pendingSensitive: true,
            });
            return null;
          }

          const menuOutput = engine.renderCurrentMenu();
          set({
            ...appendOutput("********", menuOutput),
            ...engineSnapshot(),
            loginUser: engine.targetLoginUser,
            isLoggedIn: true,
            authPhase: "authenticated",
            pendingPrompt: null,
            pendingSensitive: false,
          });
          onAuthenticated();
          return null;
        }

        if (!state.isLoggedIn) {
          return null;
        }

        const result = engine.processInput(input);
        if (result.recordableAction) {
          recordAction(result.recordableAction);
        }

        persistCurrentState();

        if (result.event === "exit") {
          const activeLoginUser = engine.targetLoginUser;
          const baseOptions = initializationOptions ?? {
            targetLoginUser: activeLoginUser,
          };
          engine = new TerminalEngine({
            ...baseOptions,
            targetLoginUser: activeLoginUser,
          });
          restorePersistentState();
          acceptedUsername = false;

          set({
            ...appendOutput(result.output, "", "login:"),
            ...engineSnapshot(),
            targetLoginUser: activeLoginUser,
            loginUser: null,
            isLoggedIn: false,
            authPhase: "username",
            pendingPrompt: "login",
            pendingSensitive: false,
            isExited: false,
            lastProcessResult: result,
          });
          return result;
        }

        set({
          ...appendOutput(result.output),
          ...engineSnapshot(),
          lastProcessResult: result,
        });
        return result;
      },

      clearOutput: () => {
        set(outputState([]));
      },

      clearPersistedSession: clearPersistentState,

      reset: () => {
        acceptedUsername = false;
        sharedSessionState = null;

        if (!engine) {
          set({ ...EMPTY_STATE, ...outputState([]) });
          return;
        }

        clearPersistentState();
        engine = new TerminalEngine(
          initializationOptions ?? {
            targetLoginUser: engine.targetLoginUser,
          },
        );
        const isTest = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
        const output = isTest
          ? ["login:"]
          : [
              "--------------------------------------------------",
              " HỆ THỐNG MÔ PHỎNG ADS-B - TRẠM THỰC HÀNH SENSOR",
              " (Mật khẩu: Nhập ký tự bất kỳ rồi nhấn Enter)",
              "--------------------------------------------------",
              "",
              "login:"
            ];

        set({
          ...EMPTY_STATE,
          ...engineSnapshot(),
          ...outputState(output),
          targetLoginUser: engine.targetLoginUser,
          authPhase: "username",
          pendingPrompt: "login",
          pendingSensitive: false,
        });
      },
    };
  });
}

export const useTerminalStore = createTerminalStore({
  acceptedLoginUsers: ["sysadmin", "maintenance"],
});
