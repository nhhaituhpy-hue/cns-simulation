import {
  cloneDmeSubmission,
  isDmeSubmission,
  loadDmeSubmissions,
  saveDmeSubmissions,
} from "@/lib/dme-submission-storage";
import type { DmeSubmission } from "@/lib/dme-types";
import type { DmeStorageLike } from "@/lib/dme-scenario-storage";
import { create, type StoreApi, type UseBoundStore } from "zustand";

type RequestFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type DmeSubmissionInput = Omit<DmeSubmission, "id">;

interface DmeSubmissionState {
  submissions: DmeSubmission[];
  isHydrated: boolean;
  isLoading: boolean;
  syncError: string | null;
}

interface DmeSubmissionActions {
  hydrate: () => Promise<void>;
  createSubmission: (input: DmeSubmissionInput) => Promise<DmeSubmission>;
  reviewSubmission: (submissionId: string, score: number, examinerComment: string) => Promise<DmeSubmission | null>;
  getSubmissionById: (submissionId: string) => DmeSubmission | undefined;
  reset: () => void;
}

export type DmeSubmissionStore = DmeSubmissionState & DmeSubmissionActions;

interface DmeSubmissionStoreOptions {
  storage?: DmeStorageLike | null;
  request?: RequestFunction | null;
  now?: () => Date;
  generateId?: () => string;
}

const initialState: DmeSubmissionState = {
  submissions: [],
  isHydrated: false,
  isLoading: false,
  syncError: null,
};

function defaultId(): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `dme-submission-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "DME submission synchronization failed.";
}

function sortSubmissions(items: readonly DmeSubmission[]): DmeSubmission[] {
  return [...items].sort((left, right) =>
    (right.submittedAt ?? right.startedAt).localeCompare(left.submittedAt ?? left.startedAt),
  );
}

export function createDmeSubmissionStore(
  options: DmeSubmissionStoreOptions = {},
): UseBoundStore<StoreApi<DmeSubmissionStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;
  const resolveStorage = (): DmeStorageLike | null => {
    if (Object.prototype.hasOwnProperty.call(options, "storage")) return options.storage ?? null;
    return typeof window === "undefined" ? null : window.localStorage;
  };
  const resolveRequest = (): RequestFunction | null => {
    if (Object.prototype.hasOwnProperty.call(options, "request")) return options.request ?? null;
    return typeof fetch === "function" ? fetch.bind(globalThis) : null;
  };

  return create<DmeSubmissionStore>()((set, get) => {
    const persistLocal = (submissions: readonly DmeSubmission[]) => {
      const storage = resolveStorage();
      if (storage) saveDmeSubmissions(storage, submissions);
    };

    const syncSubmission = async (submission: DmeSubmission): Promise<string | null> => {
      const request = resolveRequest();
      if (!request) return null;
      try {
        const response = await request("/api/dme/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission),
        });
        if (!response.ok) throw new Error(`DME API returned ${response.status}.`);
        return null;
      } catch (error) {
        return errorMessage(error);
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
          const local = storage ? loadDmeSubmissions(storage) : [];
          if (!request) {
            set({ submissions: sortSubmissions(local), isHydrated: true, isLoading: false });
            return;
          }
          const response = await request("/api/dme/submissions");
          if (!response.ok) throw new Error(`DME API returned ${response.status}.`);
          const payload = (await response.json()) as unknown;
          if (!Array.isArray(payload) || !payload.every(isDmeSubmission)) {
            throw new Error("DME API returned invalid submission data.");
          }
          const remote = payload.map(cloneDmeSubmission);
          const submissions = remote.length > 0 ? remote : local;
          persistLocal(submissions);
          set({ submissions: sortSubmissions(submissions), isHydrated: true, isLoading: false });
          if (remote.length === 0 && local.length > 0) await Promise.all(local.map(syncSubmission));
        } catch (error) {
          let fallback: DmeSubmission[] = [];
          try { fallback = storage ? loadDmeSubmissions(storage) : []; } catch { fallback = []; }
          set({
            submissions: sortSubmissions(fallback),
            isHydrated: true,
            isLoading: false,
            syncError: errorMessage(error),
          });
        }
      },
      createSubmission: async (input) => {
        const submission: DmeSubmission = { ...structuredClone(input), id: generateId() };
        const submissions = sortSubmissions([...get().submissions, submission]);
        persistLocal(submissions);
        set({ submissions, isHydrated: true, syncError: null });
        const syncError = await syncSubmission(submission);
        if (syncError) set({ syncError });
        return submission;
      },
      reviewSubmission: async (submissionId, score, examinerComment) => {
        if (!Number.isFinite(score) || score < 0 || score > 100) {
          throw new Error("Điểm DME phải nằm trong khoảng 0 đến 100.");
        }
        const existing = get().submissions.find((item) => item.id === submissionId);
        if (!existing || !existing.submittedAt) return null;
        const reviewed: DmeSubmission = {
          ...existing,
          status: "reviewed",
          reviewedAt: now().toISOString(),
          score,
          examinerComment: examinerComment.trim(),
        };
        const submissions = sortSubmissions(
          get().submissions.map((item) => item.id === submissionId ? reviewed : item),
        );
        persistLocal(submissions);
        set({ submissions, syncError: null });
        const syncError = await syncSubmission(reviewed);
        if (syncError) set({ syncError });
        return reviewed;
      },
      getSubmissionById: (submissionId) =>
        get().submissions.find((item) => item.id === submissionId),
      reset: () => set(initialState),
    };
  });
}

export const useDmeSubmissionStore = createDmeSubmissionStore();

