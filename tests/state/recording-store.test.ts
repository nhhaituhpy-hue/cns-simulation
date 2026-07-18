import { describe, expect, it } from "vitest";

import type {
  RecordableAction,
  RecordedAction,
  RecordedActionKind,
} from "@/lib/types";
import { createRecordingStore } from "@/stores/recording-store";

function recordable(
  menuId: string,
  input: string,
  kind: RecordedActionKind = "menu-selection",
): RecordableAction {
  return {
    kind,
    menuId,
    menuTitle: menuId,
    input,
    resultLabel: `${menuId}:${input}`,
  };
}

describe("recording store", () => {
  it("records only non-authentication actions and never retains a password", () => {
    const store = createRecordingStore({ now: () => 1000 });
    const password = "Never-Store-This-Password";
    store.getState().beginAttempt("scenario-a");

    const ignored = store
      .getState()
      .addAction(recordable("authentication", password, "authentication"));
    const recorded = store
      .getState()
      .addAction(recordable("sa.root", "1"));

    expect(ignored).toBeNull();
    expect(recorded).toMatchObject({ step: 1, timestamp: 1000 });
    expect(store.getState().allActions).toEqual([recorded]);
    expect(JSON.stringify(store.getState())).not.toContain(password);
  });

  it("selects, reorders, and grades the submitted sequence", () => {
    let timestamp = 100;
    const store = createRecordingStore({ now: () => timestamp++ });
    store.getState().beginAttempt("scenario-a");
    const first = store.getState().addAction(recordable("sa.root", "1"));
    const second = store.getState().addAction(recordable("sa.general", "1"));

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    store.getState().toggleSelectAction(second!.step);
    store.getState().toggleSelectAction(first!.step);
    expect(store.getState().selectedActions.map((action) => action.step)).toEqual([
      second!.step,
      first!.step,
    ]);

    expect(store.getState().reorderSelectedAction(0, 1)).toBe(true);
    const result = store
      .getState()
      .submitForGrading([first, second] as RecordedAction[]);

    expect(result).toMatchObject({ passed: true, score: 100 });
    expect(store.getState().gradingResult).toEqual(result);
    expect(store.getState().isRecording).toBe(false);
  });

  it("supports select all, removal, clearing, and a clean next attempt", () => {
    const store = createRecordingStore();
    store.getState().beginAttempt("scenario-a");
    const first = store.getState().addAction(recordable("ma.root", "6"));
    const second = store.getState().addAction(recordable("ma.gps-ntp", "2"));
    store.getState().selectAll();

    expect(store.getState().selectedActions).toHaveLength(2);
    expect(store.getState().removeAction(first!.step)).toBe(true);
    expect(store.getState().allActions).toEqual([second]);
    expect(store.getState().selectedActions).toEqual([second]);

    store.getState().clearSelection();
    expect(store.getState().selectedActions).toEqual([]);
    store.getState().selectAll();
    store.getState().submitForGrading([second] as RecordedAction[]);

    store.getState().beginAttempt("scenario-b");
    expect(store.getState()).toMatchObject({
      scenarioId: "scenario-b",
      isRecording: true,
      allActions: [],
      selectedActions: [],
      gradingResult: null,
    });

    store.getState().resetAttempt();
    expect(store.getState()).toMatchObject({
      scenarioId: null,
      isRecording: false,
      allActions: [],
      selectedActions: [],
      gradingResult: null,
    });
  });

  it("resets state when the same scenario starts under a different exam item", () => {
    const store = createRecordingStore();
    store.getState().beginAttempt("scenario-a", "attempt-item-1");
    store.getState().addAction(recordable("sa.root", "1"));
    expect(store.getState().allActions).toHaveLength(1);

    store.getState().beginAttempt("scenario-a", "attempt-item-2");
    expect(store.getState()).toMatchObject({
      scenarioId: "scenario-a",
      sessionKey: "attempt-item-2",
      allActions: [],
      selectedActions: [],
    });
  });
});
