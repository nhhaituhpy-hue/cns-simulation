import {
  VOR_SCENARIO_STORAGE_KEY,
  cloneVorScenario,
  isVorScenario,
  loadVorScenarios,
  saveVorScenarios,
  type VorStorageLike,
} from "@/lib/vor-scenario-storage";
import type { VorScenario } from "@/lib/vor-types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export type VorScenarioInput = Omit<VorScenario, "id" | "createdAt" | "updatedAt">;
export type VorScenarioUpdate = Partial<VorScenarioInput>;
type RequestFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface VorScenarioStoreState {
  scenarios: VorScenario[];
  isHydrated: boolean;
  isLoading: boolean;
  syncError: string | null;
}

export interface VorScenarioStoreActions {
  hydrate: () => Promise<void>;
  createScenario: (input: VorScenarioInput) => Promise<VorScenario>;
  updateScenario: (scenarioId: string, changes: VorScenarioUpdate) => Promise<VorScenario | null>;
  deleteScenario: (scenarioId: string) => Promise<boolean>;
  getScenarioById: (scenarioId: string) => VorScenario | undefined;
  reset: () => void;
}

export type VorScenarioStore = VorScenarioStoreState & VorScenarioStoreActions;

export interface VorScenarioStoreOptions {
  storage?: VorStorageLike | null;
  request?: RequestFunction | null;
  now?: () => Date;
  generateId?: () => string;
}

const initialState: VorScenarioStoreState = {
  scenarios: [],
  isHydrated: false,
  isLoading: false,
  syncError: null,
};

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `vor-scenario-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "VOR scenario synchronization failed.";
}

function sortScenarios(scenarios: readonly VorScenario[]): VorScenario[] {
  return [...scenarios].sort((left, right) =>
    (right.updatedAt ?? right.createdAt).localeCompare(
      left.updatedAt ?? left.createdAt,
    ),
  );
}

export function createVorScenarioStore(
  options: VorScenarioStoreOptions = {},
): UseBoundStore<StoreApi<VorScenarioStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;
  const resolveStorage = (): VorStorageLike | null => {
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

  return create<VorScenarioStore>()((set, get) => {
    const persistLocal = (scenarios: readonly VorScenario[]) => {
      const storage = resolveStorage();
      if (storage) saveVorScenarios(storage, scenarios);
    };

    const syncScenario = async (scenario: VorScenario): Promise<string | null> => {
      const request = resolveRequest();
      if (!request) return null;
      try {
        const response = await request("/api/vor/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scenario),
        });
        if (!response.ok) throw new Error(`VOR API returned ${response.status}.`);
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
          const localScenarios = storage ? loadVorScenarios(storage) : [];
          if (!request) {
            set({ scenarios: sortScenarios(localScenarios), isHydrated: true, isLoading: false });
            return;
          }

          const response = await request("/api/vor/scenarios");
          if (!response.ok) throw new Error(`VOR API returned ${response.status}.`);
          const payload = (await response.json()) as unknown;
          if (!Array.isArray(payload) || !payload.every(isVorScenario)) {
            throw new Error("VOR API returned invalid scenario data.");
          }

          const remoteScenarios = payload.map(cloneVorScenario);
          const scenarios = remoteScenarios.length > 0 ? remoteScenarios : localScenarios;
          persistLocal(scenarios);
          set({ scenarios: sortScenarios(scenarios), isHydrated: true, isLoading: false });

          if (remoteScenarios.length === 0 && localScenarios.length > 0) {
            await Promise.all(localScenarios.map(syncScenario));
          }
        } catch (error) {
          let fallback: VorScenario[] = [];
          try {
            fallback = storage ? loadVorScenarios(storage) : [];
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
        const scenario: VorScenario = {
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
        const updated: VorScenario = {
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
              `/api/vor/scenarios?id=${encodeURIComponent(scenarioId)}`,
              { method: "DELETE" },
            );
            if (!response.ok) throw new Error(`VOR API returned ${response.status}.`);
          } catch (error) {
            set({ syncError: message(error) });
          }
        }
        return true;
      },

      getScenarioById: (scenarioId) =>
        get().scenarios.find((item) => item.id === scenarioId),

      reset: () => {
        resolveStorage()?.removeItem(VOR_SCENARIO_STORAGE_KEY);
        set({ ...initialState });
      },
    };
  });
}

export const useVorScenarioStore = createVorScenarioStore();
