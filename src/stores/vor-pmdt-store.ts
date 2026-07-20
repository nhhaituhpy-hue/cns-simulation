import { cloneDefaultVorPmdtData } from "@/lib/vor-pmdt-defaults";
import type {
  VorAttemptEvent,
  VorEditableValue,
  VorExpectedCheckpoint,
  VorFieldOverride,
  VorIndicatorColor,
  VorParameterStatus,
  VorPmdtData,
  VorPmdtMode,
  VorScreenId,
  VorStudentAnswer,
  VorViewId,
} from "@/lib/vor-types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

const emptyAnswer: VorStudentAnswer = {
  suspectedFault: "",
  reasoning: "",
  remediation: "",
};

const defaultViews: Record<VorScreenId, VorViewId> = {
  home: "home",
  "rms-data": "rms-maintenance-alerts",
  "rms-logs": "rms-logs-alarms",
  "rms-config": "rms-config-general",
  "monitor-data": "monitor-integral",
  "monitor-config": "monitor-alarm-limits",
  "monitor-1-offsets": "monitor-1-offsets",
  "monitor-2-offsets": "monitor-2-offsets",
  "tx-data": "tx-data-main",
  "tx-config": "tx-config-nominal",
  disabled: "disabled",
};

export interface VorSessionInitialization {
  mode: VorPmdtMode;
  scenarioId?: string;
  sessionKey?: string;
  userId?: string;
  studentName?: string;
  workUnit?: string;
  overrides?: readonly VorFieldOverride[];
  expectedCheckpoints?: readonly VorExpectedCheckpoint[];
}

export interface VorPmdtStoreState {
  mode: VorPmdtMode;
  data: VorPmdtData;
  activeScreen: VorScreenId;
  activeView: VorViewId;
  activeMenuPath: string[];
  scenarioId: string | null;
  sessionKey: string | null;
  userId: string;
  studentName: string;
  workUnit: string;
  overrides: VorFieldOverride[];
  expectedCheckpoints: VorExpectedCheckpoint[];
  studentFieldStates: VorFieldOverride[];
  attemptEvents: VorAttemptEvent[];
  answer: VorStudentAnswer;
}

export interface VorPmdtStoreActions {
  initializeSession: (initialization: VorSessionInitialization) => void;
  setMode: (mode: VorPmdtMode) => void;
  openScreen: (screenId: VorScreenId, menuPath: readonly string[], title: string) => void;
  openView: (screenId: VorScreenId, viewId: VorViewId, menuPath: readonly string[], title: string) => void;
  setOverride: (
    fieldId: string,
    value: VorEditableValue,
    status?: VorIndicatorColor | VorParameterStatus,
  ) => void;
  removeOverride: (fieldId: string) => void;
  applyOverlay: (overrides: readonly VorFieldOverride[]) => void;
  clearOverlay: () => void;
  addCurrentViewAsCheckpoint: (guidance?: string, points?: number) => void;
  removeCheckpoint: (checkpointId: string) => void;
  interactWithSidebar: (
    fieldId: string,
    title: string,
    resultValue: VorEditableValue,
    resultStatus: VorIndicatorColor | VorParameterStatus,
  ) => void;
  updateEventAnnotation: (eventId: string, annotation: string) => void;
  removeEvent: (eventId: string) => void;
  updateAnswer: (changes: Partial<VorStudentAnswer>) => void;
  reset: () => void;
}

export type VorPmdtStore = VorPmdtStoreState & VorPmdtStoreActions;

export interface VorPmdtStoreOptions {
  now?: () => Date;
  generateId?: () => string;
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `vor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initialState(): VorPmdtStoreState {
  return {
    mode: "preview",
    data: cloneDefaultVorPmdtData(),
    activeScreen: "home",
    activeView: "home",
    activeMenuPath: ["Home"],
    scenarioId: null,
    sessionKey: null,
    userId: "",
    studentName: "",
    workUnit: "",
    overrides: [],
    expectedCheckpoints: [],
    studentFieldStates: [],
    attemptEvents: [],
    answer: { ...emptyAnswer },
  };
}

export function resolveVorField<T extends VorEditableValue>(
  baseValue: T,
  fieldId: string,
  overrides: readonly VorFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  return (override ? override.value : baseValue) as T;
}

export function resolveVorStatus<T extends VorIndicatorColor | VorParameterStatus>(
  baseStatus: T,
  fieldId: string,
  overrides: readonly VorFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  return (override?.status ?? baseStatus) as T;
}

export function createVorPmdtStore(
  options: VorPmdtStoreOptions = {},
): UseBoundStore<StoreApi<VorPmdtStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;

  return create<VorPmdtStore>()((set, get) => {
    const recordVisit = (
      screenId: VorScreenId,
      viewId: VorViewId,
      menuPath: readonly string[],
      title: string,
    ): VorAttemptEvent[] => {
      const state = get();
      if (state.mode !== "student" || viewId === "disabled") {
        return state.attemptEvents;
      }
      const event: VorAttemptEvent = {
        id: generateId(),
        sequence: state.attemptEvents.length + 1,
        eventType: "view",
        screenId,
        viewId,
        menuPath: [...menuPath],
        title,
        visitedAt: now().toISOString(),
        annotation: "",
      };
      return [...state.attemptEvents, event];
    };

    return {
      ...initialState(),

      initializeSession: (initialization) => {
        set({
          ...initialState(),
          mode: initialization.mode,
          scenarioId: initialization.scenarioId ?? null,
          sessionKey: initialization.sessionKey ?? initialization.scenarioId ?? null,
          userId: initialization.userId?.trim() ?? "",
          studentName: initialization.studentName?.trim() ?? "",
          workUnit: initialization.workUnit?.trim() ?? "",
          overrides: initialization.overrides?.map((item) => ({ ...item })) ?? [],
          expectedCheckpoints:
            initialization.expectedCheckpoints?.map((item) => ({
              ...item,
              menuPath: [...item.menuPath],
            })) ?? [],
        });
      },

      setMode: (mode) => set({ mode }),

      openScreen: (screenId, menuPath, title) => {
        const viewId = defaultViews[screenId];
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
      },

      openView: (screenId, viewId, menuPath, title) => {
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
      },

      setOverride: (fieldId, value, status) => {
        const override: VorFieldOverride = { fieldId, value, ...(status ? { status } : {}) };
        set((state) => ({
          overrides: [
            ...state.overrides.filter((item) => item.fieldId !== fieldId),
            override,
          ],
        }));
      },

      removeOverride: (fieldId) =>
        set((state) => ({
          overrides: state.overrides.filter((item) => item.fieldId !== fieldId),
        })),

      applyOverlay: (overrides) =>
        set({ overrides: overrides.map((item) => ({ ...item })) }),

      clearOverlay: () => set({ overrides: [] }),

      addCurrentViewAsCheckpoint: (guidance = "", points = 10) => {
        const state = get();
        if (state.activeView === "disabled") return;
        const existing = state.expectedCheckpoints.find(
          (item) => item.viewId === state.activeView,
        );
        if (existing) return;
        const checkpoint: VorExpectedCheckpoint = {
          id: generateId(),
          order: state.expectedCheckpoints.length + 1,
          viewId: state.activeView,
          menuPath: [...state.activeMenuPath],
          title: state.activeMenuPath.at(-1) ?? state.activeView,
          guidance,
          required: true,
          points,
        };
        set({ expectedCheckpoints: [...state.expectedCheckpoints, checkpoint] });
      },

      removeCheckpoint: (checkpointId) =>
        set((state) => ({
          expectedCheckpoints: state.expectedCheckpoints
            .filter((item) => item.id !== checkpointId)
            .map((item, index) => ({ ...item, order: index + 1 })),
        })),

      interactWithSidebar: (fieldId, title, resultValue, resultStatus) => {
        const state = get();
        if (state.mode !== "student") return;
        const event: VorAttemptEvent = {
          id: generateId(),
          sequence: state.attemptEvents.length + 1,
          eventType: "sidebar",
          screenId: state.activeScreen,
          viewId: state.activeView,
          menuPath: ["Sidebar", title],
          title,
          visitedAt: now().toISOString(),
          annotation: "",
          fieldId,
          resultValue,
          resultStatus,
        };
        set({
          studentFieldStates: [
            ...state.studentFieldStates.filter((item) => item.fieldId !== fieldId),
            { fieldId, value: resultValue, status: resultStatus },
          ],
          attemptEvents: [...state.attemptEvents, event],
        });
      },

      updateEventAnnotation: (eventId, annotation) =>
        set((state) => ({
          attemptEvents: state.attemptEvents.map((event) =>
            event.id === eventId ? { ...event, annotation } : event,
          ),
        })),
      
      removeEvent: (eventId) =>
        set((state) => {
          const filtered = state.attemptEvents.filter((event) => event.id !== eventId);
          return {
            attemptEvents: filtered.map((event, index) => ({
              ...event,
              sequence: index + 1,
            })),
          };
        }),

      updateAnswer: (changes) =>
        set((state) => ({ answer: { ...state.answer, ...changes } })),

      reset: () => set(initialState()),
    };
  });
}

export const useVorPmdtStore = createVorPmdtStore();
