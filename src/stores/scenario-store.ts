import {
  SCENARIO_STORAGE_KEY,
  loadScenarios,
  removeScenario,
  saveScenarios,
  upsertScenario,
  type StorageLike,
} from "@/lib/storage";
import type { Scenario } from "@/lib/types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

import { cloneScenarios, DEFAULT_SCENARIOS } from "./default-scenarios";

export type CreateScenarioInput = Omit<
  Scenario,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdAt?: string;
};

export type UpdateScenarioInput = Partial<
  Omit<Scenario, "id" | "createdAt" | "updatedAt">
>;

export type ScenarioAccessScope = "source" | "scoped-source" | "practice";

export interface ScenarioStoreState {
  sessionIdentity: string | null;
  sessionScope: ScenarioAccessScope | null;
  scenarios: Scenario[];
  isHydrated: boolean;
  storageError: string | null;
}

export interface ScenarioStoreActions {
  bindSession: (identity: string | null, scope: ScenarioAccessScope | null) => void;
  hydrate: () => void;
  createScenario: (input: CreateScenarioInput) => Promise<Scenario>;
  updateScenario: (
    scenarioId: string,
    updates: UpdateScenarioInput,
  ) => Promise<Scenario | null>;
  deleteScenario: (scenarioId: string) => boolean;
  getScenarioById: (scenarioId: string) => Scenario | undefined;
  resetToDefaults: () => Scenario[];
}

export type ScenarioStore = ScenarioStoreState & ScenarioStoreActions;

export interface ScenarioStoreOptions {
  storage?: StorageLike | null;
  defaultScenarios?: readonly Scenario[];
  now?: () => Date;
  generateId?: () => string;
  fetcher?: typeof fetch;
  testMode?: boolean;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Scenario storage failed.";
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const ADS_B_TRAINING_SCENARIO_ID =
  /^adsb-(?:0[1-9]|1[0-3])-/;

function mergeMissingTrainingScenarios(
  existingScenarios: readonly Scenario[],
  defaultScenarios: readonly Scenario[],
  monitoringTimestamp: string,
): { scenarios: Scenario[]; missing: Scenario[] } {
  const existingIds = new Set(existingScenarios.map((scenario) => scenario.id));
  const refreshableDefaults = new Map(
    defaultScenarios
      .filter(
        (scenario) =>
          ADS_B_TRAINING_SCENARIO_ID.test(scenario.id) && scenario.updatedAt,
      )
      .map((scenario) => [scenario.id, scenario]),
  );
  const refreshed: Scenario[] = [];
  const existing = cloneScenarios(existingScenarios).map((scenario) => {
    const standard = refreshableDefaults.get(scenario.id);
    if (scenario.revision !== undefined || !standard || standard.updatedAt === scenario.updatedAt) return scenario;

    const replacement = cloneScenarios([standard], monitoringTimestamp)[0];
    refreshed.push(replacement);
    return replacement;
  });
  const missingDefaults = defaultScenarios.filter(
    (scenario) =>
      ADS_B_TRAINING_SCENARIO_ID.test(scenario.id) &&
      !existingIds.has(scenario.id),
  );
  const missing = cloneScenarios(missingDefaults, monitoringTimestamp);

  return {
    scenarios: [...existing, ...missing],
    missing: [...refreshed, ...missing],
  };
}

export function createScenarioStore(
  options: ScenarioStoreOptions = {},
): UseBoundStore<StoreApi<ScenarioStore>> {
  const defaults = options.defaultScenarios ?? DEFAULT_SCENARIOS;
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;
  const fetcher = options.fetcher ?? globalThis.fetch;
  const isTest =
    options.testMode ??
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test");
  const resolveStorage = (): StorageLike | null =>
    Object.prototype.hasOwnProperty.call(options, "storage")
      ? (options.storage ?? null)
      : getBrowserStorage();

  return create<ScenarioStore>()((set, get) => {
    let sessionEpoch = 0;
    const persist = (scenarios: readonly Scenario[]): string | null => {
      const storage = resolveStorage();

      if (!storage) {
        return null;
      }

      try {
        saveScenarios(storage, scenarios);
        return null;
      } catch (error) {
        return errorMessage(error);
      }
    };

    const ensureHydrated = (): void => {
      if (!get().isHydrated) {
        get().hydrate();
      }
    };

    const syncMissingTrainingScenarios = (
      scenarios: readonly Scenario[],
    ): void => {
      for (const scenario of scenarios) {
        void fetcher("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scenario),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Scenario seed API returned ${response.status}.`,
              );
            }
          })
          .catch((error) => {
            console.error(
              `Failed to seed built-in scenario "${scenario.id}":`,
              error,
            );
          });
      }
    };

    const saveRemote = async (scenario: Scenario, expectedRevision?: number): Promise<Scenario> => {
      const requestEpoch = sessionEpoch;
      try {
        const response = await fetcher("/api/scenarios", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...scenario, ...(expectedRevision === undefined ? {} : { expectedRevision }) }),
        });
        const body = await response.json();
        if (requestEpoch !== sessionEpoch) throw new Error("Scenario session changed.");
        if (!response.ok || body.success !== true || !body.scenario) {
          throw new Error(typeof body.error === "string" ? body.error : "Không thể lưu kịch bản.");
        }
        return body.scenario as Scenario;
      } catch (error) {
        if (requestEpoch === sessionEpoch) set({ storageError: errorMessage(error) });
        throw error;
      }
    };

    return {
      sessionIdentity: null,
      sessionScope: null,
      scenarios: isTest ? cloneScenarios(defaults) : [],
      isHydrated: false,
      storageError: null,

      bindSession: (identity, scope) => {
        if (identity && get().sessionIdentity === identity && get().sessionScope === scope) return;
        sessionEpoch += 1;
        let storageError: string | null = null;
        try {
          resolveStorage()?.removeItem(SCENARIO_STORAGE_KEY);
        } catch (error) {
          storageError = errorMessage(error);
        }
        set({ sessionIdentity: identity, sessionScope: scope, scenarios: [], isHydrated: false, storageError });
      },

      hydrate: () => {
        if (get().isHydrated) {
          return;
        }

        const storage = resolveStorage();
        if (isTest) {
          if (!storage) {
            return;
          }
          try {
            const rawValue = storage.getItem(SCENARIO_STORAGE_KEY);
            if (rawValue === null || rawValue.trim() === "") {
              const scenarios = cloneScenarios(defaults, now().toISOString());
              saveScenarios(storage, scenarios);
              set({ scenarios, isHydrated: true, storageError: null });
              return;
            }
            set({
              scenarios: cloneScenarios(loadScenarios(storage)),
              isHydrated: true,
              storageError: null,
            });
          } catch (error) {
            set({
              scenarios: cloneScenarios(defaults, now().toISOString()),
              isHydrated: true,
              storageError: errorMessage(error),
            });
          }
          return;
        }

        if (!get().sessionIdentity || !get().sessionScope) {
          get().bindSession(null, null);
          return;
        }
        const requestEpoch = sessionEpoch;
        const requestScope = get().sessionScope;
        let sourceAccess = false;
        fetcher("/api/scenarios")
          .then((res) => {
            if (requestEpoch !== sessionEpoch) throw new Error("Scenario session changed.");
            const responseScope = res.headers.get("x-cns-scenario-access");
            if ((responseScope === "source" && requestScope !== "source") ||
                (responseScope === "scoped-source" && requestScope === "practice")) {
              throw new Error("Scenario response exceeds the session scope.");
            }
            sourceAccess = requestScope === "source" && responseScope === "source";
            if (res.ok) {
              return res.json().then((data: Scenario[]) => ({ data, scoped: !sourceAccess }));
            }
            throw new Error("API response not ok");
          })
          .then(({ data, scoped }: { data: Scenario[]; scoped: boolean }) => {
            if (requestEpoch !== sessionEpoch) return;
            if (scoped && Array.isArray(data)) {
              // Never restore private cached sources or seed/refresh published snapshots.
              set({ scenarios: data, isHydrated: true, storageError: null });
              storage?.removeItem(SCENARIO_STORAGE_KEY);
              return;
            }
            if (data && Array.isArray(data) && data.length > 0) {
              const merged = mergeMissingTrainingScenarios(
                data,
                defaults,
                now().toISOString(),
              );
              set({
                scenarios: merged.scenarios,
                isHydrated: true,
                storageError: persist(merged.scenarios),
              });
              syncMissingTrainingScenarios(merged.missing);
            } else {
              // Nếu DB trống, hydrate từ localStorage hoặc dùng defaults
              throw new Error("DB is empty");
            }
          })
          .catch((err) => {
            if (requestEpoch !== sessionEpoch) return;
            if (!sourceAccess) {
              set({ scenarios: [], isHydrated: true, storageError: errorMessage(err) });
              return;
            }
            console.warn("Using localStorage fallback for scenarios:", err.message);
            if (!storage) {
              return;
            }

            try {
              const rawValue = storage.getItem(SCENARIO_STORAGE_KEY);

              if (rawValue === null || rawValue.trim() === "") {
                const scenarios = cloneScenarios(defaults, now().toISOString());
                saveScenarios(storage, scenarios);
                set({ scenarios, isHydrated: true, storageError: null });
                return;
              }

              const merged = mergeMissingTrainingScenarios(
                loadScenarios(storage),
                defaults,
                now().toISOString(),
              );
              set({
                scenarios: merged.scenarios,
                isHydrated: true,
                storageError: persist(merged.scenarios),
              });
              syncMissingTrainingScenarios(merged.missing);
            } catch (error) {
              set({
                scenarios: cloneScenarios(defaults, now().toISOString()),
                isHydrated: true,
                storageError: errorMessage(error),
              });
            }
          });
      },

      createScenario: async (input) => {
        ensureHydrated();
        const requestEpoch = sessionEpoch;

        const createdAt = input.createdAt ?? now().toISOString();
        const scenario: Scenario = {
          ...input,
          id: input.id?.trim() || generateId(),
          createdAt,
        };
        const saved = isTest ? scenario : await saveRemote(scenario);
        if (requestEpoch !== sessionEpoch) throw new Error("Scenario session changed.");
        const scenarios = upsertScenario(get().scenarios, saved);
        set({ scenarios, storageError: persist(scenarios) });
        return saved;
      },

      updateScenario: async (scenarioId, updates) => {
        ensureHydrated();
        const requestEpoch = sessionEpoch;
        const existing = get().scenarios.find(scenario => scenario.id === scenarioId);
        if (!existing) return null;
        const updated: Scenario = {
          ...existing, ...updates, id: existing.id, createdAt: existing.createdAt,
          revision: existing.revision, updatedAt: now().toISOString(),
        };
        const saved = isTest ? updated : await saveRemote(updated, existing.revision);
        if (requestEpoch !== sessionEpoch) throw new Error("Scenario session changed.");
        const scenarios = upsertScenario(get().scenarios, saved);
        set({ scenarios, storageError: persist(scenarios) });
        return saved;
      },

      deleteScenario: (scenarioId) => {
        ensureHydrated();

        if (!get().scenarios.some((scenario) => scenario.id === scenarioId)) {
          return false;
        }

        const scenarios = removeScenario(get().scenarios, scenarioId);
        set({ scenarios, storageError: persist(scenarios) });

        if (!isTest) {
          // Đồng bộ lên Supabase
          fetcher(`/api/scenarios?id=${encodeURIComponent(scenarioId)}`, {
            method: "DELETE",
          }).catch((err) => console.error("Failed to sync delete scenario with Supabase:", err));
        }

        return true;
      },

      getScenarioById: (scenarioId) =>
        get().scenarios.find((scenario) => scenario.id === scenarioId),

      resetToDefaults: () => {
        const scenarios = cloneScenarios(defaults, now().toISOString());
        const storage = resolveStorage();
        const storageError = persist(scenarios);

        // Lấy tất cả kịch bản hiện tại để xoá
        const currentScenarios = get().scenarios;

        set({
          scenarios,
          isHydrated: storage ? true : get().isHydrated,
          storageError,
        });

        if (!isTest) {
          // Xoá và chèn lại defaults trên Supabase
          currentScenarios.forEach((s) => {
            fetcher(`/api/scenarios?id=${encodeURIComponent(s.id)}`, { method: "DELETE" })
              .catch(() => {});
          });
          scenarios.forEach((s) => {
            fetcher("/api/scenarios", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(s),
            }).catch(() => {});
          });
        }

        return scenarios;
      },
    };
  });
}

export const useScenarioStore = createScenarioStore();

export { DEFAULT_SCENARIOS } from "./default-scenarios";
