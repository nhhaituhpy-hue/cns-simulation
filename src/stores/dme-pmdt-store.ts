import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import type {
  DmeAttemptEvent,
  DmeEditableValue,
  DmeExpectedCheckpoint,
  DmeFieldOverride,
  DmeIndicatorColor,
  DmeParameterStatus,
  DmePmdtData,
  DmePmdtMode,
  DmeScreenId,
  DmeStudentAnswer,
  DmeViewId,
} from "@/lib/dme-types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

const emptyAnswer: DmeStudentAnswer = {
  suspectedFault: "",
  reasoning: "",
  remediation: "",
};

const defaultViews: Record<DmeScreenId, DmeViewId> = {
  home: "home",
  "rms-status": "rms-status-main",
  "rms-logs": "rms-logs-alarms",
  "monitor-data": "monitor-integral",
  "monitor-config": "monitor-alarm-limits",
  "monitor-1-test-results": "monitor-1-decoder-results",
  "monitor-2-test-results": "monitor-2-decoder-results",
  "monitor-1-offsets": "monitor-1-offsets",
  "monitor-2-offsets": "monitor-2-offsets",
  "tx-data": "tx-data-main",
  "tx-config": "tx-config-nominal",
  disabled: "disabled",
};

export interface DmeSessionInitialization {
  mode: DmePmdtMode;
  scenarioId?: string;
  userId?: string;
  studentName?: string;
  workUnit?: string;
  overrides?: readonly DmeFieldOverride[];
  expectedCheckpoints?: readonly DmeExpectedCheckpoint[];
}

export interface DmePmdtStoreState {
  mode: DmePmdtMode;
  data: DmePmdtData;
  activeScreen: DmeScreenId;
  activeView: DmeViewId;
  activeMenuPath: string[];
  scenarioId: string | null;
  userId: string;
  studentName: string;
  workUnit: string;
  overrides: DmeFieldOverride[];
  expectedCheckpoints: DmeExpectedCheckpoint[];
  studentFieldStates: DmeFieldOverride[];
  attemptEvents: DmeAttemptEvent[];
  answer: DmeStudentAnswer;
}

export interface DmePmdtStoreActions {
  initializeSession: (initialization: DmeSessionInitialization) => void;
  setMode: (mode: DmePmdtMode) => void;
  openScreen: (screenId: DmeScreenId, menuPath: readonly string[], title: string) => void;
  openView: (screenId: DmeScreenId, viewId: DmeViewId, menuPath: readonly string[], title: string) => void;
  setOverride: (
    fieldId: string,
    value: DmeEditableValue,
    status?: DmeIndicatorColor | DmeParameterStatus,
  ) => void;
  removeOverride: (fieldId: string) => void;
  applyOverlay: (overrides: readonly DmeFieldOverride[]) => void;
  clearOverlay: () => void;
  addCurrentViewAsCheckpoint: (guidance?: string, points?: number) => void;
  removeCheckpoint: (checkpointId: string) => void;
  interactWithSidebar: (
    fieldId: string,
    title: string,
    resultValue: DmeEditableValue,
    resultStatus: DmeIndicatorColor | DmeParameterStatus,
  ) => void;
  updateEventAnnotation: (eventId: string, annotation: string) => void;
  removeEvent: (eventId: string) => void;
  updateAnswer: (changes: Partial<DmeStudentAnswer>) => void;
  reset: () => void;
}

export type DmePmdtStore = DmePmdtStoreState & DmePmdtStoreActions;

export interface DmePmdtStoreOptions {
  now?: () => Date;
  generateId?: () => string;
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `dme-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initialState(): DmePmdtStoreState {
  return {
    mode: "preview",
    data: cloneDefaultDmePmdtData(),
    activeScreen: "home",
    activeView: "home",
    activeMenuPath: ["Home"],
    scenarioId: null,
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

export function resolveDmeField<T extends DmeEditableValue>(
  baseValue: T,
  fieldId: string,
  overrides: readonly DmeFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  return (override ? override.value : baseValue) as T;
}

export function resolveDmeStatus<T extends DmeIndicatorColor | DmeParameterStatus>(
  baseStatus: T,
  fieldId: string,
  overrides: readonly DmeFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  return (override?.status ?? baseStatus) as T;
}

export function createDmePmdtStore(
  options: DmePmdtStoreOptions = {},
): UseBoundStore<StoreApi<DmePmdtStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;

  return create<DmePmdtStore>()((set, get) => {
    const recordVisit = (
      screenId: DmeScreenId,
      viewId: DmeViewId,
      menuPath: readonly string[],
      title: string,
    ): DmeAttemptEvent[] => {
      const state = get();
      if (state.mode !== "student" || viewId === "disabled") {
        return state.attemptEvents;
      }
      const event: DmeAttemptEvent = {
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
        const override: DmeFieldOverride = { fieldId, value, ...(status ? { status } : {}) };
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
        const checkpoint: DmeExpectedCheckpoint = {
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
        const event: DmeAttemptEvent = {
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

export const useDmePmdtStore = createDmePmdtStore();

