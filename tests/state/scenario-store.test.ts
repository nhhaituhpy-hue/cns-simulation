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
        headers: { "Content-Type": "application/json", "x-cns-scenario-access": "source" },
      }),
    );
    const store = createScenarioStore({
      storage: window.localStorage,
      fetcher,
      testMode: false,
    });

    store.getState().bindSession("admin-test", "source");
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, serializeScenarioStorage([localScenario]));
    store.getState().hydrate();

    await vi.waitFor(() => {
      expect(store.getState().isHydrated).toBe(true);
    });
    const scenarios = store.getState().scenarios;
    const seededDefaults = DEFAULT_SCENARIOS.filter((scenario) =>
      /^adsb-(?:0[1-9]|1[0-3])-/.test(scenario.id),
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
        headers: { "Content-Type": "application/json", "x-cns-scenario-access": "source" },
      }),
    );
    const store = createScenarioStore({
      storage: window.localStorage,
      fetcher,
      testMode: false,
      now: () => FIXED_NOW,
    });

    store.getState().bindSession("admin-test", "source");
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
  it("creates, updates, finds, and deletes a valid scenario", async () => {
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

    const created = await store.getState().createScenario(scenarioInput());
    expect(created).toMatchObject({
      id: "scenario-generated",
      title: "Bài kiểm tra mới",
      createdAt: FIXED_NOW.toISOString(),
    });
    expect(store.getState().getScenarioById(created.id)).toEqual(created);

    const updated = await store.getState().updateScenario(created.id, {
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


describe("server-authoritative scenario edits", () => {
  it("rejects 409 without changing local state or reporting saved", async () => {
    const source = { ...DEFAULT_SCENARIOS[0], revision: 1 };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({error: "Kịch bản đã thay đổi ở phiên khác."}), {status: 409}));
    const store = createScenarioStore({storage: window.localStorage, defaultScenarios: [source], fetcher, testMode: false});
    store.getState().bindSession("admin-test", "source");
    store.setState({scenarios: [source], isHydrated: true});
    const pending = store.getState().updateScenario(source.id, {title: "Do not save"});
    await expect(Promise.resolve(pending)).rejects.toThrow("Kịch bản đã thay đổi");
    expect(store.getState().scenarios).toEqual([source]);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({expectedRevision: 1});
  });
  it("stores the returned canonical revision only after the server accepts", async () => {
    const source = { ...DEFAULT_SCENARIOS[0], revision: 1 };
    const saved = {...source, title: "Server confirmed", revision: 2};
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({success: true, scenario: saved}), {status: 200}));
    const store = createScenarioStore({storage: null, defaultScenarios: [source], fetcher, testMode: false});
    store.getState().bindSession("admin-test", "source");
    store.setState({scenarios: [source], isHydrated: true});
    expect(await store.getState().updateScenario(source.id, {title: saved.title})).toEqual(saved);
    expect(store.getState().scenarios).toEqual([saved]);
  });
  it("respects an empty practice snapshot instead of restoring cached private sources or seeding", async () => {
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, serializeScenarioStorage([{...DEFAULT_SCENARIOS[0], id: "private-draft"}]));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", {headers: {"x-cns-scenario-access": "practice"}}));
    const store = createScenarioStore({storage: window.localStorage, fetcher, testMode: false});
    store.getState().bindSession("student-test", "practice");
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().isHydrated).toBe(true));
    expect(store.getState().scenarios).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});


describe("scenario session isolation", () => {
  it("starts empty and never restores an unknown identity cache", () => {
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, serializeScenarioStorage(DEFAULT_SCENARIOS));
    const fetcher = vi.fn<typeof fetch>();
    const store = createScenarioStore({ storage: window.localStorage, fetcher, testMode: false });
    expect(store.getState().scenarios).toEqual([]);
    store.getState().hydrate();
    expect(store.getState().scenarios).toEqual([]);
    expect(store.getState().isHydrated).toBe(false);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not reset an unchanged session but clears identity-only and scope-only changes", () => {
    const store = createScenarioStore({ storage: window.localStorage, testMode: false });
    store.getState().bindSession("admin-a", "source");
    store.setState({ scenarios: [DEFAULT_SCENARIOS[0]], isHydrated: true });
    store.getState().bindSession("admin-a", "source");
    expect(store.getState().isHydrated).toBe(true);
    store.getState().bindSession("admin-b", "source");
    expect(store.getState().scenarios).toEqual([]);
    store.setState({ scenarios: [DEFAULT_SCENARIOS[0]], isHydrated: true });
    store.getState().bindSession("admin-b", "practice");
    expect(store.getState().scenarios).toEqual([]);
    expect(store.getState().isHydrated).toBe(false);
  });
  it("rejects a source response when the bound session only permits practice", async () => {
    const draft = { ...DEFAULT_SCENARIOS[0], id: "wrong-scope-draft" };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([draft]), { headers: { "x-cns-scenario-access": "source" } }));
    const store = createScenarioStore({ storage: window.localStorage, fetcher, testMode: false });
    store.getState().bindSession("student-a", "practice");
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().isHydrated).toBe(true));
    expect(store.getState().scenarios).toEqual([]);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
  });
  it("rejects an old admin save rather than resurrecting its private source", async () => {
    let resolveSave!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(new Promise<Response>(resolve => { resolveSave = resolve; }));
    const draft = { ...DEFAULT_SCENARIOS[0], id: "pending-save", revision: 1 };
    const store = createScenarioStore({ storage: window.localStorage, fetcher, testMode: false });
    store.getState().bindSession("admin-a", "source");
    store.setState({ scenarios: [draft], isHydrated: true });
    const pending = store.getState().updateScenario(draft.id, { title: "Old admin edit" });
    store.getState().bindSession("student-a", "practice");
    resolveSave(new Response(JSON.stringify({ success: true, scenario: { ...draft, revision: 2 } })));
    await expect(pending).rejects.toThrow("Scenario session changed");
    expect(store.getState().scenarios).toEqual([]);
    expect(store.getState().storageError).toBeNull();
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
  });
  it("discards an old admin GET after switching identity even when it resolves last", async () => {
    let resolveAdmin!: (response: Response) => void;
    const adminResponse = new Promise<Response>(resolve => { resolveAdmin = resolve; });
    const draft = { ...DEFAULT_SCENARIOS[0], id: "late-private-draft" };
    const fetcher = vi.fn<typeof fetch>()
      .mockReturnValueOnce(adminResponse)
      .mockResolvedValueOnce(new Response("[]", { headers: { "x-cns-scenario-access": "practice" } }));
    const store = createScenarioStore({ storage: window.localStorage, defaultScenarios: [draft], fetcher, testMode: false });
    store.getState().bindSession("admin-a", "source");
    store.getState().hydrate();
    store.getState().bindSession("student-a", "practice");
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().isHydrated).toBe(true));
    resolveAdmin(new Response(JSON.stringify([draft]), { headers: { "x-cns-scenario-access": "source" } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(store.getState().scenarios).toEqual([]);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("clears a hydrated admin singleton before loading student practice", async () => {
    const draft = { ...DEFAULT_SCENARIOS[0], id: "private-admin-draft" };
    const practice = { ...DEFAULT_SCENARIOS[0], id: "published-practice" };
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([draft]), { headers: { "x-cns-scenario-access": "source" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([practice]), { headers: { "x-cns-scenario-access": "practice" } }));
    const store = createScenarioStore({ storage: window.localStorage, defaultScenarios: [], fetcher, testMode: false });
    store.getState().bindSession("admin-a", "source");
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().isHydrated).toBe(true));
    expect(store.getState().scenarios).toEqual([draft]);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toContain(draft.id);

    store.getState().bindSession("student-a", "practice");
    expect(store.getState().scenarios).toEqual([]);
    expect(store.getState().isHydrated).toBe(false);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().scenarios).toEqual([practice]));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
  });
});

describe("scoped remote hydration", () => {
  it("never restores cached admin sources for a teacher with an empty authorized scope", async () => {
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, serializeScenarioStorage([{...DEFAULT_SCENARIOS[0], id: "private-admin-draft"}]));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", {headers: {"x-cns-scenario-access": "scoped-source"}}));
    const store = createScenarioStore({storage: window.localStorage, fetcher, testMode: false});
    store.getState().bindSession("teacher-test", "scoped-source");
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().isHydrated).toBe(true));
    expect(store.getState().scenarios.map(s => s.id)).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("never refreshes a canonical built-in source with a local default or drops its revision", async () => {
    const source = {...DEFAULT_SCENARIOS.find(s => s.id === "adsb-06-configure-network")!, revision: 3, title: "Examiner reviewed canonical", updatedAt: "2026-10-20T00:00:00.000Z"};
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([source]), {headers: {"x-cns-scenario-access": "source"}}));
    const store = createScenarioStore({storage: null, defaultScenarios: [DEFAULT_SCENARIOS.find(s => s.id === source.id)!], fetcher, testMode: false});
    store.getState().bindSession("admin-test", "source");
    store.getState().hydrate();
    await vi.waitFor(() => expect(store.getState().isHydrated).toBe(true));
    expect(store.getState().scenarios[0]).toMatchObject({title: source.title, revision: 3});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
