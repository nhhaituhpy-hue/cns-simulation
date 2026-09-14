import { describe, expect, it, vi } from "vitest";
import {
  createDefaultDme320Config,
  DEFAULT_DME320_ACCOUNTS,
} from "@/modules/operations/dme-320/domain/defaults";
import { createLowPowerDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import {
  createDme320Store,
  hydrateDme320ProfilesWhenIdle,
} from "@/modules/operations/dme-320/store/dme320-store";
import { extractDme320Config, getDme320ConfigPersistenceAction } from "@/lib/simulator-config/dme-320";

function createStore() {
  const store = createDme320Store();
  const account = DEFAULT_DME320_ACCOUNTS.find((item) => item.level === 2)!;
  store
    .getState()
    .dispatch({ type: "login", userId: account.userId, password: account.password, origin: "local" });
  return store;
}

describe("DME 320 scenario persistence isolation", () => {
  it("suppresses every exercise transition and resumes normal persistence after End", () => {
    const store = createStore();
    const writes: string[] = [];
    const unsubscribe = store.subscribe((state, previous) => {
      const action = getDme320ConfigPersistenceAction(state.simulation, previous.simulation);
      if (action) writes.push(action);
    });
    store.getState().dispatch({ type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    const config = structuredClone(store.getState().simulation.config.running);
    config.transmitters.tx1.outputPowerPercent = 100;
    store.getState().dispatch({ type: "set-draft-config", config });
    store.getState().dispatch({ type: "apply-draft" });
    store.getState().dispatch({ type: "restart-scenario" });
    store.getState().dispatch({ type: "reset-system" });
    store.getState().dispatch({ type: "end-scenario" });
    expect(writes).toEqual([]);
    const ordinary = structuredClone(store.getState().simulation.config.running);
    ordinary.station.stationName = "User station";
    store.getState().dispatch({ type: "set-draft-config", config: ordinary });
    store.getState().dispatch({ type: "apply-draft" });
    store.getState().dispatch({ type: "save-running-to-flash" });
    expect(writes).toEqual(["apply", "flash-save"]);
    expect(store.getState().simulation.config.flash.station.stationName).toBe("User station");
    unsubscribe();
  });

  it("ignores direct hydration while active and defers the server profile until End", () => {
    const store = createStore();
    store.getState().dispatch({ type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    const server = createDefaultDme320Config();
    server.station.stationName = "Server profile";
    store.getState().replaceConfigurationProfiles(server, server);
    expect(store.getState().simulation.config.running.station.stationName).not.toBe("Server profile");
    const onHydrated = vi.fn();
    const cleanup = hydrateDme320ProfilesWhenIdle(store, server, server, [], onHydrated);
    store.getState().advanceBy(1000);
    store.getState().dispatch({ type: "restart-scenario" });
    expect(onHydrated).not.toHaveBeenCalled();
    expect(store.getState().simulation.config.running.transmitters.tx1.outputPowerPercent).toBe(40);
    store.getState().dispatch({ type: "end-scenario" });
    expect(onHydrated).toHaveBeenCalledTimes(1);
    expect(store.getState().simulation.config.running).toEqual(server);
    store.getState().advanceBy(1000);
    expect(onHydrated).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("cancels a deferred hydration on unmount", () => {
    const store = createStore();
    store.getState().dispatch({ type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    const server = createDefaultDme320Config();
    server.station.stationName = "Cancelled response";
    const onHydrated = vi.fn();
    const cleanup = hydrateDme320ProfilesWhenIdle(store, server, server, [], onHydrated);
    cleanup();
    store.getState().dispatch({ type: "end-scenario" });
    expect(onHydrated).not.toHaveBeenCalled();
    expect(store.getState().simulation.config.running.station.stationName).not.toBe("Cancelled response");
  });

  it("hydrates immediately when idle and excludes scenario inputs from persisted config", () => {
    const store = createStore();
    const onHydrated = vi.fn();
    const server = createDefaultDme320Config();
    server.station.stationName = "Server profile";
    hydrateDme320ProfilesWhenIdle(store, server, server, [], onHydrated)();
    expect(onHydrated).toHaveBeenCalledTimes(1);
    store.getState().dispatch({ type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    const persisted = extractDme320Config(store.getState().simulation.config.flash);
    expect(persisted.station.stationName).toBe("Server profile");
    expect(persisted).not.toHaveProperty("scenario");
    expect(persisted).not.toHaveProperty("faults");
    expect(persisted).not.toHaveProperty("measurementOverrides");
  });
});
