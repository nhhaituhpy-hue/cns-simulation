import { createStore, type StoreApi } from "zustand/vanilla";
import {
  createDme320SimulationState,
  executeDme320Command,
  type CreateDme320SimulationOptions,
} from "../domain/engine";
import type {
  Dme320Command,
  Dme320CommandResult,
  Dme320SimulationState,
} from "../domain/types";

export interface Dme320Clock {
  now(): number;
}

export interface Dme320StoreOptions extends Omit<CreateDme320SimulationOptions, "nowMs"> {
  initialNowMs?: number;
  clock?: Dme320Clock;
}

export interface Dme320StoreState {
  simulation: Dme320SimulationState;
  lastCommandResult: Pick<Dme320CommandResult, "accepted" | "message"> | null;
  dispatch(command: Dme320Command): Dme320CommandResult;
  advanceTo(toMs: number): Dme320CommandResult;
  advanceBy(elapsedMs: number): Dme320CommandResult;
  syncToClock(): Dme320CommandResult;
  replaceSimulation(simulation: Dme320SimulationState): void;
  reset(options?: CreateDme320SimulationOptions): void;
}

export type Dme320StoreApi = StoreApi<Dme320StoreState>;

/**
 * A thin vanilla Zustand adapter. It deliberately owns no equipment rules; all
 * transitions go through the pure deterministic engine and can be replayed.
 */
export function createDme320Store(options: Dme320StoreOptions = {}): Dme320StoreApi {
  const initialNowMs = options.initialNowMs ?? options.clock?.now() ?? 0;

  return createStore<Dme320StoreState>()((set, get) => {
    function dispatch(command: Dme320Command): Dme320CommandResult {
      const result = executeDme320Command(get().simulation, command);
      set({
        simulation: result.state,
        lastCommandResult: { accepted: result.accepted, message: result.message },
      });
      return result;
    }

    return {
      simulation: createDme320SimulationState({
        nowMs: initialNowMs,
        ...(options.config ? { config: options.config } : {}),
      }),
      lastCommandResult: null,
      dispatch,
      advanceTo(toMs) {
        return dispatch({ type: "advance-time", toMs });
      },
      advanceBy(elapsedMs) {
        if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
          const simulation = get().simulation;
          const result: Dme320CommandResult = {
            state: simulation,
            accepted: false,
            message: "Elapsed time must be a finite non-negative number.",
          };
          set({ lastCommandResult: { accepted: false, message: result.message } });
          return result;
        }
        return dispatch({
          type: "advance-time",
          toMs: get().simulation.nowMs + elapsedMs,
        });
      },
      syncToClock() {
        if (!options.clock) {
          const simulation = get().simulation;
          const result: Dme320CommandResult = {
            state: simulation,
            accepted: false,
            message: "No simulation clock was injected.",
          };
          set({ lastCommandResult: { accepted: false, message: result.message } });
          return result;
        }
        return dispatch({ type: "advance-time", toMs: options.clock.now() });
      },
      replaceSimulation(simulation) {
        set({ simulation: structuredClone(simulation), lastCommandResult: null });
      },
      reset(resetOptions = {}) {
        set({
          simulation: createDme320SimulationState({
            nowMs: resetOptions.nowMs ?? options.clock?.now() ?? initialNowMs,
            ...(resetOptions.config
              ? { config: resetOptions.config }
              : options.config
                ? { config: options.config }
                : {}),
          }),
          lastCommandResult: null,
        });
      },
    };
  });
}
