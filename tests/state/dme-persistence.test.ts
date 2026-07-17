import { describe, expect, it } from "vitest";
import {
  deserializeDmeScenarios,
  mapRowToDmeScenario,
  serializeDmeScenarios,
} from "@/lib/dme-scenario-storage";
import {
  deserializeDmeSubmissions,
  mapRowToDmeSubmission,
  serializeDmeSubmissions,
} from "@/lib/dme-submission-storage";
import type { DmeScenario, DmeSubmission } from "@/lib/dme-types";

const scenario: DmeScenario = {
  id: "dme-delay-alarm",
  title: "Sai lệch propagation delay",
  description: "Kiểm tra dữ liệu RTC và giới hạn monitor.",
  difficulty: "medium",
  prompt: "Xác định nguyên nhân và hướng xử lý.",
  createdAt: "2026-07-17T03:00:00.000Z",
  overrides: [{ fieldId: "delayControl.rtc1.propagationDelay", value: 10.5, status: "alarm" }],
  expectedCheckpoints: [{
    id: "checkpoint-1", order: 1, viewId: "tx-rtc-data",
    menuPath: ["Transmitters", "Data", "RTC Data"], title: "RTC Data",
    guidance: "Kiểm tra delay control.", required: true, points: 20,
  }],
  hardwareTask: {
    expectedComponentIds: ["dme-rtc-1"],
    faultType: "Sai lệch tham số",
    adminNote: "Đối chiếu delay RTC1.",
  },
};

const submission: DmeSubmission = {
  id: "submission-1",
  scenarioId: scenario.id,
  studentName: "Nguyen Van A",
  studentCode: "HV001",
  status: "submitted",
  startedAt: "2026-07-17T03:05:00.000Z",
  submittedAt: "2026-07-17T03:15:00.000Z",
  events: [{
    id: "event-1", sequence: 1, eventType: "view", screenId: "tx-data", viewId: "tx-rtc-data",
    menuPath: ["Transmitters", "Data", "RTC Data"], title: "RTC Data",
    visitedAt: "2026-07-17T03:07:00.000Z", annotation: "Delay vượt giới hạn cao.",
  }],
  answer: { suspectedFault: "RTC 1 delay", reasoning: "Propagation delay cao.", remediation: "Kiểm tra và hiệu chỉnh RTC 1." },
  hardwareAnswer: {
    selectedComponentIds: ["dme-rtc-1"],
    reasoning: "Delay sai lệch nằm trên nhánh RTC1.",
    inspectedComponentIds: ["dme-monitor-1", "dme-rtc-1"],
    completedAt: "2026-07-17T03:14:00.000Z",
  },
};

describe("DME persistence", () => {
  it("round-trips scenarios and accepts the new DME view IDs", () => {
    expect(deserializeDmeScenarios(serializeDmeScenarios([scenario]))).toEqual([scenario]);
    expect(mapRowToDmeScenario({
      id: scenario.id, title: scenario.title, description: scenario.description,
      difficulty: scenario.difficulty, prompt: scenario.prompt, overrides: scenario.overrides,
      expected_checkpoints: scenario.expectedCheckpoints, created_at: scenario.createdAt, updated_at: null,
      hardware_task: scenario.hardwareTask,
    })).toEqual(scenario);
  });

  it("round-trips submissions and maps JSONB evidence", () => {
    expect(deserializeDmeSubmissions(serializeDmeSubmissions([submission]))).toEqual([submission]);
    expect(mapRowToDmeSubmission({
      id: submission.id, scenario_id: submission.scenarioId, student_name: submission.studentName,
      student_code: submission.studentCode, status: submission.status, started_at: submission.startedAt,
      submitted_at: submission.submittedAt, reviewed_at: null, events: submission.events,
      answer: submission.answer, score: null, examiner_comment: null,
      hardware_answer: submission.hardwareAnswer,
    })).toEqual(submission);
  });

  it("normalizes legacy aggregate BCPS IDs in scenario and submission evidence", () => {
    const legacyScenario: DmeScenario = {
      ...scenario,
      hardwareTask: {
        ...scenario.hardwareTask!,
        expectedComponentIds: ["dme-bcps"],
      },
    };
    const legacySubmission: DmeSubmission = {
      ...submission,
      hardwareAnswer: {
        ...submission.hardwareAnswer!,
        selectedComponentIds: ["dme-bcps"],
        inspectedComponentIds: ["dme-bcps"],
      },
    };

    expect(deserializeDmeScenarios(serializeDmeScenarios([legacyScenario]))[0].hardwareTask)
      .toEqual(expect.objectContaining({
        expectedComponentIds: ["dme-bcps-1", "dme-bcps-2"],
      }));
    expect(deserializeDmeSubmissions(serializeDmeSubmissions([legacySubmission]))[0].hardwareAnswer)
      .toEqual(expect.objectContaining({
        selectedComponentIds: ["dme-bcps-1", "dme-bcps-2"],
        inspectedComponentIds: ["dme-bcps-1", "dme-bcps-2"],
      }));
  });
});
