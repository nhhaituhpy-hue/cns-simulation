import { gradeActions, gradeCombinedAttempt } from "@/lib/grading";
import type {
  CombinedGradingResult,
  GradingResult,
  RecordableAction,
  RecordedAction,
} from "@/lib/types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export type AttemptPhase =
  | "qcms"
  | "terminal"
  | "hardware"
  | "completed";

export interface RecordingStoreState {
  scenarioId: string | null;
  sessionKey: string | null;
  phase: AttemptPhase;
  isRecording: boolean;
  authenticatedCorrectly: boolean;
  qcmsMonitoringOpened: boolean;
  allActions: RecordedAction[];
  selectedActions: RecordedAction[];
  inspectedComponentIds: string[];
  diagnosedComponentIds: string[];
  gradingResult: GradingResult | null;
  combinedGradingResult: CombinedGradingResult | null;
}

export interface RecordingStoreActions {
  beginAttempt: (scenarioId: string, sessionKey?: string) => void;
  startTerminal: () => void;
  markAuthenticatedCorrectly: () => void;
  markQcmsMonitoringOpened: () => void;
  completeTerminal: () => void;
  toggleRecording: () => void;
  addAction: (
    action: RecordableAction | RecordedAction,
  ) => RecordedAction | null;
  toggleSelectAction: (step: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  reorderSelectedAction: (fromIndex: number, toIndex: number) => boolean;
  removeAction: (step: number) => boolean;
  clearActions: () => void;
  submitForGrading: (
    expectedActions: readonly RecordedAction[],
  ) => GradingResult;
  submitCombinedAttempt: (
    expectedActions: readonly RecordedAction[],
    expectedComponentIds: readonly string[],
    submittedComponentIds: readonly string[],
    inspectedComponentIds: readonly string[],
  ) => CombinedGradingResult;
  resetAttempt: () => void;
}

export type RecordingStore = RecordingStoreState & RecordingStoreActions;

export interface RecordingStoreOptions {
  now?: () => number;
}

const INITIAL_STATE: RecordingStoreState = {
  scenarioId: null,
  sessionKey: null,
  phase: "qcms",
  isRecording: false,
  authenticatedCorrectly: false,
  qcmsMonitoringOpened: false,
  allActions: [],
  selectedActions: [],
  inspectedComponentIds: [],
  diagnosedComponentIds: [],
  gradingResult: null,
  combinedGradingResult: null,
};

export function createRecordingStore(
  options: RecordingStoreOptions = {},
): UseBoundStore<StoreApi<RecordingStore>> {
  const now = options.now ?? Date.now;

  return create<RecordingStore>()((set, get) => ({
    ...INITIAL_STATE,

    beginAttempt: (scenarioId, sessionKey = scenarioId) => {
      if (get().scenarioId === scenarioId && get().sessionKey === sessionKey) {
        return;
      }

      set({
        ...INITIAL_STATE,
        scenarioId,
        sessionKey,
        phase: "qcms",
        isRecording: true,
      });
    },

    startTerminal: () => {
      set({ phase: "terminal", isRecording: true });
    },

    markAuthenticatedCorrectly: () => {
      set({ authenticatedCorrectly: true });
    },

    markQcmsMonitoringOpened: () => {
      set({ qcmsMonitoringOpened: true });
    },

    completeTerminal: () => {
      set({ phase: "hardware", isRecording: false });
    },

    toggleRecording: () => {
      set((state) => ({ isRecording: !state.isRecording }));
    },

    addAction: (inputAction) => {
      const state = get();

      // Authentication values, including passwords, never enter recording state.
      if (!state.isRecording || inputAction.kind === "authentication") {
        return null;
      }

      const nextStep =
        state.allActions.reduce(
          (highestStep, action) => Math.max(highestStep, action.step),
          0,
        ) + 1;
      const action: RecordedAction = {
        kind: inputAction.kind,
        menuId: inputAction.menuId,
        menuTitle: inputAction.menuTitle,
        input: inputAction.input,
        resultLabel: inputAction.resultLabel,
        step: nextStep,
        timestamp: now(),
      };

      set({
        allActions: [...state.allActions, action],
        gradingResult: null,
        combinedGradingResult: null,
      });
      return action;
    },

    toggleSelectAction: (step) => {
      const state = get();
      const isSelected = state.selectedActions.some(
        (action) => action.step === step,
      );

      if (isSelected) {
        set({
          selectedActions: state.selectedActions.filter(
            (action) => action.step !== step,
          ),
          gradingResult: null,
          combinedGradingResult: null,
        });
        return;
      }

      const action = state.allActions.find((item) => item.step === step);
      if (action) {
        set({
          selectedActions: [...state.selectedActions, action],
          gradingResult: null,
          combinedGradingResult: null,
        });
      }
    },

    selectAll: () => {
      set((state) => ({
        selectedActions: [...state.allActions],
        gradingResult: null,
        combinedGradingResult: null,
      }));
    },

    clearSelection: () => {
      set({
        selectedActions: [],
        gradingResult: null,
        combinedGradingResult: null,
      });
    },

    reorderSelectedAction: (fromIndex, toIndex) => {
      const selectedActions = [...get().selectedActions];

      if (
        fromIndex < 0 ||
        fromIndex >= selectedActions.length ||
        toIndex < 0 ||
        toIndex >= selectedActions.length ||
        fromIndex === toIndex
      ) {
        return false;
      }

      const [movedAction] = selectedActions.splice(fromIndex, 1);
      selectedActions.splice(toIndex, 0, movedAction);
      set({
        selectedActions,
        gradingResult: null,
        combinedGradingResult: null,
      });
      return true;
    },

    removeAction: (step) => {
      const state = get();
      if (!state.allActions.some((action) => action.step === step)) {
        return false;
      }

      set({
        allActions: state.allActions.filter((action) => action.step !== step),
        selectedActions: state.selectedActions.filter(
          (action) => action.step !== step,
        ),
        gradingResult: null,
        combinedGradingResult: null,
      });
      return true;
    },

    clearActions: () => {
      set({
        allActions: [],
        selectedActions: [],
        gradingResult: null,
        combinedGradingResult: null,
      });
    },

    submitForGrading: (expectedActions) => {
      const result = gradeActions(expectedActions, get().selectedActions);
      set({
        gradingResult: result,
        combinedGradingResult: null,
        phase: "completed",
        isRecording: false,
      });
      return result;
    },

    submitCombinedAttempt: (
      expectedActions,
      expectedComponentIds,
      submittedComponentIds,
      inspectedComponentIds,
    ) => {
      const state = get();
      const result = gradeCombinedAttempt(
        expectedActions,
        state.selectedActions,
        state.authenticatedCorrectly,
        expectedComponentIds,
        submittedComponentIds,
      );

      set({
        combinedGradingResult: result,
        gradingResult: null,
        diagnosedComponentIds: [...new Set(submittedComponentIds)],
        inspectedComponentIds: [...new Set(inspectedComponentIds)],
        phase: "completed",
        isRecording: false,
      });
      return result;
    },

    resetAttempt: () => {
      set({ ...INITIAL_STATE });
    },
  }));
}

export const useRecordingStore = createRecordingStore();
