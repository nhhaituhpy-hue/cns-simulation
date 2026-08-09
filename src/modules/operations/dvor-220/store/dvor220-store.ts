import { createStore, type StoreApi } from "zustand/vanilla";
import { reduceDvor220Command } from "../domain/commands";
import {
  createInitialDvor220State,
  type CreateDvor220StateOptions,
} from "../domain/defaults";
import { advanceDvor220Time, deriveDvor220Snapshot } from "../domain/engine";
import type {
  Dvor220Command,
  Dvor220CommandResult,
  Dvor220Configuration,
  Dvor220DeviceState,
  Dvor220Snapshot,
} from "../domain/types";

export interface Dvor220Clock {
  now(): number;
}

export interface Dvor220StoreOptions {
  initialNowMs?: number;
  clock?: Dvor220Clock;
  configuration?: Dvor220Configuration;
}

export interface Dvor220StoreState {
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  lastCommandResult: Pick<Dvor220CommandResult, "ok" | "error"> | null;
  dispatch(command: Dvor220Command): Dvor220CommandResult;
  advanceTime(elapsedMs: number): Dvor220DeviceState;
  syncClock(): Dvor220DeviceState;
  reset(options?: CreateDvor220StateOptions): void;
}

export type Dvor220StoreApi = StoreApi<Dvor220StoreState>;

const systemClock: Dvor220Clock = {
  now: () => Date.now(),
};

/**
 * Thin state adapter shared by PMDT and LMI views. Equipment rules remain in
 * the pure reducer/engine so command streams can be replayed deterministically.
 */
export function createDvor220Store(options: Dvor220StoreOptions = {}): Dvor220StoreApi {
  const clock = options.clock ?? systemClock;
  const initialNowMs = options.initialNowMs ?? clock.now();

  function buildDevice(initialOptions: CreateDvor220StateOptions = {}): Dvor220DeviceState {
    return createInitialDvor220State({
      nowMs: initialOptions.nowMs ?? clock.now(),
      configuration: initialOptions.configuration ?? options.configuration,
    });
  }

  const initialDevice = createInitialDvor220State({
    nowMs: initialNowMs,
    configuration: options.configuration,
  });

  return createStore<Dvor220StoreState>()((set, get) => {
    const replaceDevice = (device: Dvor220DeviceState) => {
      set({ device, snapshot: deriveDvor220Snapshot(device) });
      return device;
    };

    return {
      device: initialDevice,
      snapshot: deriveDvor220Snapshot(initialDevice),
      lastCommandResult: null,
      dispatch(command) {
        const result = reduceDvor220Command(get().device, command);
        set({
          device: result.state,
          snapshot: deriveDvor220Snapshot(result.state),
          lastCommandResult: { ok: result.ok, error: result.error },
        });
        return result;
      },
      advanceTime(elapsedMs) {
        return replaceDevice(advanceDvor220Time(get().device, elapsedMs));
      },
      syncClock() {
        const elapsedMs = clock.now() - get().device.nowMs;
        if (elapsedMs < 0) {
          throw new RangeError("The injected clock cannot move DVOR 220 simulation time backwards.");
        }
        return get().advanceTime(elapsedMs);
      },
      reset(resetOptions = {}) {
        const device = buildDevice(resetOptions);
        set({
          device,
          snapshot: deriveDvor220Snapshot(device),
          lastCommandResult: null,
        });
      },
    };
  });
}
