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

export interface ScenarioStoreState {
  scenarios: Scenario[];
  isHydrated: boolean;
  storageError: string | null;
}

export interface ScenarioStoreActions {
  hydrate: () => void;
  createScenario: (input: CreateScenarioInput) => Scenario;
  updateScenario: (
    scenarioId: string,
    updates: UpdateScenarioInput,
  ) => Scenario | null;
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
  /^adsb-(?:0[1-9]|1[0-2])-/;

function mergeMissingTrainingScenarios(
  existingScenarios: readonly Scenario[],
  defaultScenarios: readonly Scenario[],
  monitoringTimestamp: string,
): { scenarios: Scenario[]; missing: Scenario[] } {
  const existingIds = new Set(existingScenarios.map((scenario) => scenario.id));
  const missingDefaults = defaultScenarios.filter(
    (scenario) =>
      ADS_B_TRAINING_SCENARIO_ID.test(scenario.id) &&
      !existingIds.has(scenario.id),
  );
  const missing = cloneScenarios(missingDefaults, monitoringTimestamp);

  return {
    scenarios: [...cloneScenarios(existingScenarios), ...missing],
    missing,
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

    return {
      scenarios: cloneScenarios(defaults),
      isHydrated: false,
      storageError: null,

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

        // Ưu tiên dữ liệu Supabase; localStorage là lớp fallback ngoại tuyến
        fetcher("/api/scenarios")
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            throw new Error("API response not ok");
          })
          .then((data: Scenario[]) => {
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

      createScenario: (input) => {
        ensureHydrated();

        const createdAt = input.createdAt ?? now().toISOString();
        const scenario: Scenario = {
          ...input,
          id: input.id?.trim() || generateId(),
          createdAt,
        };
        const scenarios = upsertScenario(get().scenarios, scenario);

        set({ scenarios, storageError: persist(scenarios) });

        if (!isTest) {
          // Đồng bộ lên Supabase
          fetcher("/api/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scenario),
          }).catch((err) => console.error("Failed to sync scenario with Supabase:", err));
        }

        return scenario;
      },

      updateScenario: (scenarioId, updates) => {
        ensureHydrated();

        const existing = get().scenarios.find(
          (scenario) => scenario.id === scenarioId,
        );
        if (!existing) {
          return null;
        }

        const updated: Scenario = {
          ...existing,
          ...updates,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now().toISOString(),
        };
        const scenarios = upsertScenario(get().scenarios, updated);

        set({ scenarios, storageError: persist(scenarios) });

        if (!isTest) {
          // Đồng bộ lên Supabase
          fetcher("/api/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }).catch((err) => console.error("Failed to sync updated scenario with Supabase:", err));
        }

        return updated;
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
