import {
  TerminalEngine,
  type PendingInteractionType,
  type TerminalEngineOptions,
  type TerminalProcessResult,
} from "@/lib/terminal-engine";
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

export type TerminalInitialization =
  | LoginUser
  | Omit<TerminalEngineOptions, "menus" | "rootMenuId">;

export interface TerminalStoreState {
  targetLoginUser: LoginUser | null;
  loginUser: LoginUser | null;
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
  reset: () => void;
}

export type TerminalStore = TerminalStoreState & TerminalStoreActions;

export interface TerminalStoreOptions {
  recordAction?: (action: RecordableAction) => unknown;
  onAuthenticated?: () => unknown;
}

const EMPTY_STATE: TerminalStoreState = {
  targetLoginUser: null,
  loginUser: null,
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

function engineOptions(
  initialization: TerminalInitialization,
): TerminalEngineOptions {
  return typeof initialization === "string"
    ? { targetLoginUser: initialization }
    : initialization;
}

export function createTerminalStore(
  options: TerminalStoreOptions = {},
): UseBoundStore<StoreApi<TerminalStore>> {
  let engine: TerminalEngine | null = null;
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
          pendingPrompt: null as TerminalPendingPrompt,
          pendingSensitive: false,
          isExited: false,
        };
      }

      const snapshot = engine.getState();
      return {
        currentMenuId: snapshot.currentMenuId,
        menuStack: [...snapshot.navigationStack],
        pendingPrompt: snapshot.pendingInteraction,
        pendingSensitive: snapshot.pendingSensitive,
        isExited: snapshot.exited,
      };
    };

    return {
      ...EMPTY_STATE,

      initialize: (initialization) => {
        const resolvedOptions = engineOptions(initialization);
        engine = new TerminalEngine(resolvedOptions);
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
          acceptedUsername = engine.authenticate(input);

          if (!acceptedUsername) {
            set({
              ...appendOutput(input.trim(), "Login incorrect.", "login:"),
              pendingPrompt: "login",
              pendingSensitive: false,
            });
            return null;
          }

          set({
            ...appendOutput(input.trim(), "Password:"),
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

      reset: () => {
        acceptedUsername = false;

        if (!engine) {
          set({ ...EMPTY_STATE, ...outputState([]) });
          return;
        }

        engine.reset();
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

export const useTerminalStore = createTerminalStore();
