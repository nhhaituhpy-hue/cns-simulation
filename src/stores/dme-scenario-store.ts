import {
  DME_SCENARIO_STORAGE_KEY,
  cloneDmeScenario,
  isDmeScenario,
  loadDmeScenarios,
  saveDmeScenarios,
  type DmeStorageLike,
} from "@/lib/dme-scenario-storage";
import type { DmeScenario } from "@/lib/dme-types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export type DmeScenarioInput = Omit<DmeScenario, "id" | "createdAt" | "updatedAt">;
export type DmeScenarioUpdate = Partial<DmeScenarioInput>;
type RequestFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface DmeScenarioStoreState {
  scenarios: DmeScenario[];
  isHydrated: boolean;
  isLoading: boolean;
  syncError: string | null;
}

export interface DmeScenarioStoreActions {
  hydrate: () => Promise<void>;
  createScenario: (input: DmeScenarioInput) => Promise<DmeScenario>;
  updateScenario: (scenarioId: string, changes: DmeScenarioUpdate) => Promise<DmeScenario | null>;
  deleteScenario: (scenarioId: string) => Promise<boolean>;
  getScenarioById: (scenarioId: string) => DmeScenario | undefined;
  reset: () => void;
}

export type DmeScenarioStore = DmeScenarioStoreState & DmeScenarioStoreActions;

export interface DmeScenarioStoreOptions {
  storage?: DmeStorageLike | null;
  request?: RequestFunction | null;
  now?: () => Date;
  generateId?: () => string;
}

const initialState: DmeScenarioStoreState = {
  scenarios: [],
  isHydrated: false,
  isLoading: false,
  syncError: null,
};

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `dme-scenario-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "DME scenario synchronization failed.";
}

function sortScenarios(scenarios: readonly DmeScenario[]): DmeScenario[] {
  return [...scenarios].sort((left, right) =>
    (right.updatedAt ?? right.createdAt).localeCompare(
      left.updatedAt ?? left.createdAt,
    ),
  );
}

export function createDmeScenarioStore(
  options: DmeScenarioStoreOptions = {},
): UseBoundStore<StoreApi<DmeScenarioStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;
  const resolveStorage = (): DmeStorageLike | null => {
    if (Object.prototype.hasOwnProperty.call(options, "storage")) {
      return options.storage ?? null;
    }
    return typeof window === "undefined" ? null : window.localStorage;
  };
  const resolveRequest = (): RequestFunction | null => {
    if (Object.prototype.hasOwnProperty.call(options, "request")) {
      return options.request ?? null;
    }
    return typeof fetch === "function" ? fetch.bind(globalThis) : null;
  };

  return create<DmeScenarioStore>()((set, get) => {
    const persistLocal = (scenarios: readonly DmeScenario[]) => {
      const storage = resolveStorage();
      if (storage) saveDmeScenarios(storage, scenarios);
    };

    const syncScenario = async (scenario: DmeScenario): Promise<string | null> => {
      const request = resolveRequest();
      if (!request) return null;
      try {
        const response = await request("/api/dme/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scenario),
        });
        if (!response.ok) throw new Error(`DME API returned ${response.status}.`);
        return null;
      } catch (error) {
        return message(error);
      }
    };

    return {
      ...initialState,

      hydrate: async () => {
        if (get().isHydrated || get().isLoading) return;
        set({ isLoading: true, syncError: null });
        const storage = resolveStorage();
        const request = resolveRequest();

        try {
          const localScenarios = storage ? loadDmeScenarios(storage) : [];
          if (!request) {
            set({ scenarios: sortScenarios(localScenarios), isHydrated: true, isLoading: false });
            return;
          }

          const response = await request("/api/dme/scenarios");
          if (!response.ok) throw new Error(`DME API returned ${response.status}.`);
          const payload = (await response.json()) as unknown;
          if (!Array.isArray(payload) || !payload.every(isDmeScenario)) {
            throw new Error("DME API returned invalid scenario data.");
          }

          const remoteScenarios = payload.map(cloneDmeScenario);
          const scenarios = remoteScenarios.length > 0 ? remoteScenarios : localScenarios;
          persistLocal(scenarios);
          set({ scenarios: sortScenarios(scenarios), isHydrated: true, isLoading: false });

          if (remoteScenarios.length === 0 && localScenarios.length > 0) {
            await Promise.all(localScenarios.map(syncScenario));
          }
        } catch (error) {
          let fallback: DmeScenario[] = [];
          try {
            fallback = storage ? loadDmeScenarios(storage) : [];
          } catch {
            fallback = [];
          }
          set({
            scenarios: sortScenarios(fallback),
            isHydrated: true,
            isLoading: false,
            syncError: message(error),
          });
        }
      },

      createScenario: async (input) => {
        const scenario: DmeScenario = {
          ...structuredClone(input),
          id: generateId(),
          createdAt: now().toISOString(),
        };
        const scenarios = sortScenarios([...get().scenarios, scenario]);
        persistLocal(scenarios);
        set({ scenarios, isHydrated: true, syncError: null });
        const syncError = await syncScenario(scenario);
        if (syncError) set({ syncError });
        return scenario;
      },

      updateScenario: async (scenarioId, changes) => {
        const existing = get().scenarios.find((item) => item.id === scenarioId);
        if (!existing) return null;
        const updated: DmeScenario = {
          ...existing,
          ...structuredClone(changes),
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now().toISOString(),
        };
        const scenarios = sortScenarios(
          get().scenarios.map((item) => (item.id === scenarioId ? updated : item)),
        );
        persistLocal(scenarios);
        set({ scenarios, syncError: null });
        const syncError = await syncScenario(updated);
        if (syncError) set({ syncError });
        return updated;
      },

      deleteScenario: async (scenarioId) => {
        if (!get().scenarios.some((item) => item.id === scenarioId)) return false;
        const scenarios = get().scenarios.filter((item) => item.id !== scenarioId);
        persistLocal(scenarios);
        set({ scenarios, syncError: null });
        const request = resolveRequest();
        if (request) {
          try {
            const response = await request(
              `/api/dme/scenarios?id=${encodeURIComponent(scenarioId)}`,
              { method: "DELETE" },
            );
            if (!response.ok) throw new Error(`DME API returned ${response.status}.`);
          } catch (error) {
            set({ syncError: message(error) });
          }
        }
        return true;
      },

      getScenarioById: (scenarioId) =>
        get().scenarios.find((item) => item.id === scenarioId),

      reset: () => {
        resolveStorage()?.removeItem(DME_SCENARIO_STORAGE_KEY);
        set({ ...initialState });
      },
    };
  });
}

export const useDmeScenarioStore = createDmeScenarioStore();

