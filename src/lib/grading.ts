import { normalizeMenuId, normalizeTerminalInput } from "./normalization";
import type {
  CombinedGradingResult,
  GradingResult,
  HardwareSelectionResult,
  RecordedAction,
  StepComparison,
} from "./types";

export function isGradableAction(action: RecordedAction): boolean {
  return action.kind !== "authentication";
}

/** Identity is deliberately limited to menu context and normalized input. */
export function getActionIdentity(action: RecordedAction): string {
  return JSON.stringify([
    normalizeMenuId(action.menuId),
    normalizeTerminalInput(action.input),
  ]);
}

interface LcsMatch {
  expectedIndex: number;
  submittedIndex: number;
}

function findLcsMatches(
  expected: readonly RecordedAction[],
  submitted: readonly RecordedAction[],
): LcsMatch[] {
  const expectedIdentities = expected.map(getActionIdentity);
  const submittedIdentities = submitted.map(getActionIdentity);
  const table = Array.from({ length: expected.length + 1 }, () =>
    Array<number>(submitted.length + 1).fill(0),
  );

  for (let expectedIndex = expected.length - 1; expectedIndex >= 0; expectedIndex -= 1) {
    for (
      let submittedIndex = submitted.length - 1;
      submittedIndex >= 0;
      submittedIndex -= 1
    ) {
      if (expectedIdentities[expectedIndex] === submittedIdentities[submittedIndex]) {
        table[expectedIndex][submittedIndex] =
          table[expectedIndex + 1][submittedIndex + 1] + 1;
      } else {
        table[expectedIndex][submittedIndex] = Math.max(
          table[expectedIndex + 1][submittedIndex],
          table[expectedIndex][submittedIndex + 1],
        );
      }
    }
  }

  const matches: LcsMatch[] = [];
  let expectedIndex = 0;
  let submittedIndex = 0;

  while (expectedIndex < expected.length && submittedIndex < submitted.length) {
    if (expectedIdentities[expectedIndex] === submittedIdentities[submittedIndex]) {
      matches.push({ expectedIndex, submittedIndex });
      expectedIndex += 1;
      submittedIndex += 1;
      continue;
    }

    if (
      table[expectedIndex + 1][submittedIndex] >=
      table[expectedIndex][submittedIndex + 1]
    ) {
      expectedIndex += 1;
    } else {
      submittedIndex += 1;
    }
  }

  return matches;
}

function appendGapComparisons(
  comparisons: StepComparison[],
  expected: readonly RecordedAction[],
  submitted: readonly RecordedAction[],
  expectedStart: number,
  expectedEnd: number,
  submittedStart: number,
  submittedEnd: number,
): void {
  const expectedCount = expectedEnd - expectedStart;
  const submittedCount = submittedEnd - submittedStart;
  const pairedCount = Math.min(expectedCount, submittedCount);

  for (let offset = 0; offset < pairedCount; offset += 1) {
    comparisons.push({
      stepNumber: comparisons.length + 1,
      expected: expected[expectedStart + offset],
      submitted: submitted[submittedStart + offset],
      status: "incorrect",
    });
  }

  for (let offset = pairedCount; offset < expectedCount; offset += 1) {
    comparisons.push({
      stepNumber: comparisons.length + 1,
      expected: expected[expectedStart + offset],
      submitted: null,
      status: "missing",
    });
  }

  for (let offset = pairedCount; offset < submittedCount; offset += 1) {
    comparisons.push({
      stepNumber: comparisons.length + 1,
      expected: null,
      submitted: submitted[submittedStart + offset],
      status: "redundant",
    });
  }
}

export function gradeActions(
  expectedActions: readonly RecordedAction[],
  submittedActions: readonly RecordedAction[],
): GradingResult {
  const expected = expectedActions.filter(isGradableAction);
  const submitted = submittedActions.filter(isGradableAction);
  const matches = findLcsMatches(expected, submitted);
  const comparisons: StepComparison[] = [];

  let expectedCursor = 0;
  let submittedCursor = 0;

  for (const match of matches) {
    appendGapComparisons(
      comparisons,
      expected,
      submitted,
      expectedCursor,
      match.expectedIndex,
      submittedCursor,
      match.submittedIndex,
    );

    comparisons.push({
      stepNumber: comparisons.length + 1,
      expected: expected[match.expectedIndex],
      submitted: submitted[match.submittedIndex],
      status: "correct",
    });

    expectedCursor = match.expectedIndex + 1;
    submittedCursor = match.submittedIndex + 1;
  }

  appendGapComparisons(
    comparisons,
    expected,
    submitted,
    expectedCursor,
    expected.length,
    submittedCursor,
    submitted.length,
  );

  const correctSteps = comparisons.filter(
    (comparison) => comparison.status === "correct",
  ).length;
  const score =
    expected.length === 0
      ? submitted.length === 0
        ? 100
        : 0

      : Math.round((correctSteps / expected.length) * 10_000) / 100;
  const passed = comparisons.every(
    (comparison) => comparison.status === "correct",
  );

  return {
    passed,
    score,
    correctSteps,
    totalExpected: expected.length,
    totalSubmitted: submitted.length,
    steps: comparisons,
  };
}


export interface HardwareGradingResult {
  correctComponent: boolean;
  terminalInspected: boolean;
  monitoringInspected: boolean;
  inspectedComponentCount: number;
  componentInspectionScore: number;
  score: number;
}

export interface HardwareStudentActions {
  openedTerminal: boolean;
  openedMonitoring: boolean;
  inspectedComponents: string[];
}

export function gradeHardwareDiagnosis(
  expected: { componentId: string },
  submitted: { componentId: string },
  studentActions: HardwareStudentActions,
): HardwareGradingResult {
  const correctComponent = expected.componentId === submitted.componentId;
  const inspectedComponentCount = new Set(
    studentActions.inspectedComponents,
  ).size;
  const componentInspectionScore =
    inspectedComponentCount >= 3 ? 20 : inspectedComponentCount >= 1 ? 10 : 0;
  const score =
    (correctComponent ? 40 : 0) +
    (studentActions.openedTerminal ? 20 : 0) +
    (studentActions.openedMonitoring ? 20 : 0) +
    componentInspectionScore;

  return {
    correctComponent,
    terminalInspected: studentActions.openedTerminal,
    monitoringInspected: studentActions.openedMonitoring,
    inspectedComponentCount,
    componentInspectionScore,
    score,
  };
}
function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Uses Jaccard similarity so selecting every component cannot receive full
 * hardware credit. The hardware section contributes at most 30 points.
 */
export function gradeHardwareSelection(
  expectedComponentIds: readonly string[],
  submittedComponentIds: readonly string[],
): HardwareSelectionResult {
  const expected = new Set(expectedComponentIds);
  const submitted = new Set(submittedComponentIds);
  const correctComponentIds = [...expected].filter((id) => submitted.has(id));
  const missedComponentIds = [...expected].filter((id) => !submitted.has(id));
  const extraComponentIds = [...submitted].filter((id) => !expected.has(id));
  const unionSize = new Set([...expected, ...submitted]).size;
  const similarity = unionSize === 0 ? 1 : correctComponentIds.length / unionSize;

  return {
    exactMatch: missedComponentIds.length === 0 && extraComponentIds.length === 0,
    expectedComponentIds: [...expected],
    submittedComponentIds: [...submitted],
    correctComponentIds,
    missedComponentIds,
    extraComponentIds,
    score: roundScore(similarity * 30),
  };
}

export function gradeCombinedAttempt(
  expectedActions: readonly RecordedAction[],
  submittedActions: readonly RecordedAction[],
  authenticatedCorrectly: boolean,
  expectedComponentIds: readonly string[],
  submittedComponentIds: readonly string[],
): CombinedGradingResult {
  const terminalResult = gradeActions(expectedActions, submittedActions);
  const terminalScore = authenticatedCorrectly
    ? roundScore(terminalResult.score * 0.7)
    : 0;
  const hardwareResult = gradeHardwareSelection(
    expectedComponentIds,
    submittedComponentIds,
  );

  return {
    passed:
      authenticatedCorrectly &&
      terminalResult.passed &&
      hardwareResult.exactMatch,
    score: roundScore(terminalScore + hardwareResult.score),
    authenticatedCorrectly,
    terminalScore,
    terminalResult,
    hardwareResult,
  };
}
