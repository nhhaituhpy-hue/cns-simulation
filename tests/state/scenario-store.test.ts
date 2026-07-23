import { describe, expect, it, vi } from "vitest";

import {
  SCENARIO_STORAGE_KEY,
  SCENARIO_STORAGE_VERSION,
  deserializeScenarioStorage,
  serializeScenarioStorage,
} from "@/lib/storage";
import type { Scenario } from "@/lib/types";
import {
  createScenarioStore,
  DEFAULT_SCENARIOS,
  type CreateScenarioInput,
} from "@/stores/scenario-store";

const FIXED_NOW = new Date("2026-07-15T10:00:00.000Z");

function scenarioInput(overrides: Partial<Scenario> = {}): CreateScenarioInput {
  const source = DEFAULT_SCENARIOS[0];

  return {
    title: overrides.title ?? "Bài kiểm tra mới",
    description: overrides.description ?? source.description,
    difficulty: overrides.difficulty ?? source.difficulty,
    sites: overrides.sites ?? source.sites,
    targetSensorId: overrides.targetSensorId ?? source.targetSensorId,
    targetLoginUser: overrides.targetLoginUser ?? source.targetLoginUser,
    expectedActions: overrides.expectedActions ?? source.expectedActions,
  };
}

describe("scenario store hydration", () => {
  it("hydrates seed scenarios explicitly and persists a versioned envelope", () => {
    const store = createScenarioStore({
      storage: window.localStorage,
      now: () => FIXED_NOW,
    });

    expect(store.getState().isHydrated).toBe(false);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();

    store.getState().hydrate();

    const state = store.getState();
    const rawValue = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    expect(state.isHydrated).toBe(true);
    expect(state.scenarios).toHaveLength(DEFAULT_SCENARIOS.length);
    expect(state.scenarios[0].sites[0].sensorA?.monitoring?.lastSnmpResponseAt)
      .toBe(FIXED_NOW.toISOString());
    expect(deserializeScenarioStorage(rawValue).version).toBe(
      SCENARIO_STORAGE_VERSION,
    );
  });

  it("respects a deliberately saved empty scenario list", () => {
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      serializeScenarioStorage([]),
    );
    const store = createScenarioStore({ storage: window.localStorage });

    store.getState().hydrate();

    expect(store.getState()).toMatchObject({
      scenarios: [],
      isHydrated: true,
      storageError: null,
    });
  });

  it("falls back safely without overwriting unsupported stored data", () => {
    const futureValue = JSON.stringify({ version: 999, scenarios: [] });
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, futureValue);
    const store = createScenarioStore({ storage: window.localStorage });

    expect(() => store.getState().hydrate()).not.toThrow();

    expect(store.getState().isHydrated).toBe(true);
    expect(store.getState().scenarios).toHaveLength(DEFAULT_SCENARIOS.length);
    expect(store.getState().storageError).toContain("version");
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBe(futureValue);
  });

  it("does not access browser storage when created for SSR", () => {
    const store = createScenarioStore({ storage: null });

    expect(() => store.getState().hydrate()).not.toThrow();
    expect(store.getState().isHydrated).toBe(false);
    expect(store.getState().scenarios).toHaveLength(DEFAULT_SCENARIOS.length);
  });

  it("keeps local scenarios and seeds only missing ADS-B defaults when the remote database is empty", async () => {
    const localScenario = {
      ...DEFAULT_SCENARIOS[0],
      id: "local-only-scenario",
      title: "Local fallback must stay local",
    };
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      serializeScenarioStorage([localScenario]),
    );
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const store = createScenarioStore({
      storage: window.localStorage,
      fetcher,
      testMode: false,
    });

    store.getState().hydrate();

    await vi.waitFor(() => {
      expect(store.getState().isHydrated).toBe(true);
    });
    const scenarios = store.getState().scenarios;
    const seededDefaults = DEFAULT_SCENARIOS.filter((scenario) =>
      /^adsb-(?:0[1-9]|1[0-2])-/.test(scenario.id),
    );

    expect(scenarios[0]).toEqual(localScenario);
    expect(scenarios).toHaveLength(1 + seededDefaults.length);
    expect(scenarios.slice(1).map((scenario) => scenario.id)).toEqual(
      seededDefaults.map((scenario) => scenario.id),
    );
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1 + seededDefaults.length);
    });
    expect(fetcher).toHaveBeenCalledWith("/api/scenarios");
    const seededRequests = fetcher.mock.calls.slice(1);
    expect(
      seededRequests.some(([, init]) =>
        String(init?.body).includes("local-only-scenario"),
      ),
    ).toBe(false);
  });

  it("refreshes a versioned built-in ADS-B scenario without replacing custom scenarios", async () => {
    const standard = DEFAULT_SCENARIOS.find(
      (scenario) => scenario.id === "adsb-06-configure-network",
    )!;
    const stale = {
      ...standard,
      title: "Old network exercise",
      updatedAt: undefined,
      expectedActions: [],
    };
    const custom = {
      ...DEFAULT_SCENARIOS[0],
      id: "custom-network-exercise",
      title: "Custom exercise must remain unchanged",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([stale, custom]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const store = createScenarioStore({
      storage: window.localStorage,
      fetcher,
      testMode: false,
      now: () => FIXED_NOW,
    });

    store.getState().hydrate();

    await vi.waitFor(() => {
      expect(store.getState().isHydrated).toBe(true);
    });
    expect(
      store.getState().getScenarioById("adsb-06-configure-network"),
    ).toMatchObject({
      title: standard.title,
      updatedAt: standard.updatedAt,
      expectedActions: standard.expectedActions,
    });
    expect(
      store.getState().getScenarioById("custom-network-exercise"),
    ).toMatchObject({ title: custom.title });
    await vi.waitFor(() => {
      expect(
        fetcher.mock.calls.some(
          ([, init]) =>
            init?.method === "POST" &&
            String(init.body).includes("adsb-06-configure-network"),
        ),
      ).toBe(true);
    });
  });
});

describe("scenario store CRUD", () => {
  it("creates, updates, finds, and deletes a valid scenario", () => {
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      serializeScenarioStorage([]),
    );
    const store = createScenarioStore({
      storage: window.localStorage,
      now: () => FIXED_NOW,
      generateId: () => "scenario-generated",
    });
    store.getState().hydrate();

    const created = store.getState().createScenario(scenarioInput());
    expect(created).toMatchObject({
      id: "scenario-generated",
      title: "Bài kiểm tra mới",
      createdAt: FIXED_NOW.toISOString(),
    });
    expect(store.getState().getScenarioById(created.id)).toEqual(created);

    const updated = store.getState().updateScenario(created.id, {
      title: "Bài kiểm tra đã cập nhật",
      difficulty: "hard",
    });
    expect(updated).toMatchObject({
      id: created.id,
      title: "Bài kiểm tra đã cập nhật",
      difficulty: "hard",
      updatedAt: FIXED_NOW.toISOString(),
    });
    expect(updated?.createdAt).toBe(created.createdAt);

    const persisted = deserializeScenarioStorage(
      window.localStorage.getItem(SCENARIO_STORAGE_KEY),
    );
    expect(persisted.scenarios).toEqual([updated]);

    expect(store.getState().deleteScenario(created.id)).toBe(true);
    expect(store.getState().deleteScenario(created.id)).toBe(false);
    expect(store.getState().getScenarioById(created.id)).toBeUndefined();
    expect(
      deserializeScenarioStorage(
        window.localStorage.getItem(SCENARIO_STORAGE_KEY),
      ).scenarios,
    ).toEqual([]);
  });
});
