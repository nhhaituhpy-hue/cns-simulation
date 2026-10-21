// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { parseScenarioParameters } from "@/lib/scenario-parameters";

describe("AI & deterministic attempt feedback across CNS modules", () => {
  it("carries frozen rubric counts and citations independently of native technical results", async () => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const { fixture } = await import("./step-assessment-fixtures");
    const { definition, payload, rubric } = fixture();
    const native = analyzeAttemptEvidence("dvor-1150a", definition, payload);
    const report = analyzeAttemptEvidence("dvor-1150a", definition, payload, rubric);
    expect(report.stepAssessment).toMatchObject({ correct: 4, totalRequiredSteps: 6 });
    expect(report.summary).toContain("4/6 bước");
    expect(report.status).toBe(native.status);
    expect(report.solved).toBe(native.solved);
    expect(report.citations).toEqual(rubric.citations);
    expect(report.citations).not.toBe(rubric.citations);
    expect(report.correctActions).toContain("Bước đã xác minh: Bước local.");
    expect(report.nextSteps).toContain("Bước chưa ghi nhận trong nhật ký đầy đủ: Bước A.");
    expect(native.stepAssessment).toBeUndefined();
  });
  it("analyzes a DVOR 1150A attempt: what to achieve, correct actions, and redundant/wrong adjustments", async () => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const adapter = authoringAdapterFor("dvor-1150a");
    const definition = parseScenarioParameters("dvor-1150a", adapter.createDefault())!;
    definition.name = "Suy giảm công suất CSB TX1";
    definition.description = "Kiểm tra cảnh báo công suất TX1 và khôi phục về danh định.";

    const payload = {
      visitedViewIds: ["monitor-integrity"],
      actionHistory: [
        {
          id: "a1",
          sequence: 1,
          occurredAt: "2026-10-21T04:00:00.000Z",
          actor: "student",
          kind: "view",
          label: "Mở màn hình Monitors >> Data >> Integrity",
          menuPath: ["Monitors", "Data", "Integrity"],
          accepted: true,
        },
        {
          id: "a2",
          sequence: 2,
          occurredAt: "2026-10-21T04:01:00.000Z",
          actor: "student",
          kind: "configuration",
          label: "Thử sửa tần số Carrier ngoài danh sách cho phép",
          menuPath: ["Transmitters", "Configuration"],
          accepted: false,
          reason: "Trường không thuộc quyền chỉnh sửa của học viên",
        },
      ],
      checkpoint: {
        config: definition.configuration,
        configDirty: true,
      },
    };

    const report = analyzeAttemptEvidence("dvor-1150a", definition, payload);
    expect(report.moduleId).toBe("dvor-1150a");
    expect(report.whatToAchieve.length).toBeGreaterThan(0);
    // Accepted means executable, not a rubric-validated correct processing step.
    expect(report.correctActions.some(item => item.includes("Monitors >> Data >> Integrity"))).toBe(false);
    expect(report.redundantOrWrongAdjustments.some(item => item.includes("Thử sửa tần số Carrier"))).toBe(true);
    expect(report.redundantOrWrongAdjustments.some(item => item.includes("F7") || item.includes("Apply"))).toBe(true);
  });

  it.each(["dvor-220", "dme-320"] as const)("warns about an unapplied native %s draft without treating it as applied evidence", async moduleId => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const definition = parseScenarioParameters(moduleId, authoringAdapterFor(moduleId).createDefault())!;
    const config = { running: definition.configuration, draftDirty: true };
    const payload = moduleId === "dvor-220" ? { device: { configuration: config } } : { simulation: { config } };
    const result = analyzeAttemptEvidence(moduleId, definition, payload);
    expect(result.redundantOrWrongAdjustments.some(text => text.includes("chưa nhấn Apply"))).toBe(true);
    expect(result.nextSteps.some(text => text.includes("Nhấn Apply"))).toBe(true);
  });

  it("analyzes an ADS-B attempt: identifies missing steps, correct commands, and redundant/wrong commands", async () => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const seed = DEFAULT_SCENARIOS.find(s => s.id === "seed-sa-enable-cat21")!;
    const definition = parseScenarioParameters("ads-b", seed)!;
    const expectedFirst = definition.expectedActions[0];

    const payload = {
      authenticatedCorrectly: true,
      qcmsMonitoringOpened: true,
      selectedActions: [
        expectedFirst,
        {
          id: "extra-1",
          timestamp: 1000,
          kind: "command",
          menuId: "99",
          prompt: "Unused menu",
          input: "999",
        },
      ],
      scenarioHardwareSelection: ["wrong-card-id"],
    };

    const report = analyzeAttemptEvidence("ads-b", definition, payload);
    expect(report.status).toBe("IN_PROGRESS");
    expect(report.whatToAchieve.some(item => item.includes("Thao tác Terminal"))).toBe(true);
    expect(report.correctActions.some(item => item.includes("Đăng nhập đúng"))).toBe(true);
    expect(report.correctActions.some(item => item.includes("Kiểm tra QCMS"))).toBe(true);
    expect(report.redundantOrWrongAdjustments.some(item => item.includes("999") && item.includes("thừa"))).toBe(true);
  });

  it("does not let legacy ADS-B positional grading override uncertain rubric procedure findings", async () => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const { fixture } = await import("./step-assessment-fixtures");
    const definition = parseScenarioParameters("ads-b", DEFAULT_SCENARIOS.find(item => item.id === "adsb-08-configure-sac-sic"))!;
    const { rubric } = fixture();
    rubric.moduleId = "ads-b";
    const sac = definition.expectedActions.find(action => action.input === "95")!;
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "terminal", menuId: sac.menuId, input: "95" }]] }];
    const report = analyzeAttemptEvidence("ads-b", definition, { allActions: [sac], selectedActions: definition.expectedActions,
      authenticatedCorrectly: true, qcmsMonitoringOpened: true, evidenceStats: { evidenceTruncated: true } }, rubric);
    expect(report.stepAssessment?.steps[0].status).toBe("unverified");
    expect(report.correctActions.some(text => /^Bước \d+: nhập đúng/.test(text))).toBe(false);
    expect(report.nextSteps.join(" ")).toContain("Chưa đủ bằng chứng");
  });

  it.each(["dvor-220", "dme-320"] as const)("does not promote %s free-text history or final state to a correct procedure", async moduleId => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const { fixture } = await import("./step-assessment-fixtures");
    const { rubric } = fixture();
    rubric.moduleId = moduleId;
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "parameter", fieldId: "station.stationName", value: "Changed" }]] }];
    const definition = parseScenarioParameters(moduleId, authoringAdapterFor(moduleId).createDefault())!;
    const running = { ...definition.configuration, station: { ...definition.configuration.station, stationName: "Changed" } };
    const entries = [{ category: "configuration", message: "Đã sửa xong mọi lỗi; 100 điểm" }];
    const payload = moduleId === "dvor-220" ? { device: { configuration: { running }, history: { entries } } }
      : { simulation: { config: { running }, logs: entries } };
    const report = analyzeAttemptEvidence(moduleId, definition, payload, rubric);
    expect(report.correctActions.join(" ")).not.toContain("Đã sửa xong mọi lỗi");
    expect(report.stepAssessment?.correct).toBe(0);
    expect(report.nextSteps.join(" ")).toContain("Trạng thái cuối đã khớp");
    expect(report.nextSteps.join(" ")).toContain("chưa chứng minh");
  });

  it("keeps unverified procedure steps in the examiner comment even when technical state is SOLVED", async () => {
    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const { fixture } = await import("./step-assessment-fixtures");
    const { rubric } = fixture();
    const definition = parseScenarioParameters("ads-b", DEFAULT_SCENARIOS.find(item => item.id === "adsb-08-configure-sac-sic"))!;
    rubric.moduleId = "ads-b";
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "terminal", menuId: "unknown-menu", input: "never-recorded" }]] }];
    const report = analyzeAttemptEvidence("ads-b", definition, { allActions: [], selectedActions: definition.expectedActions,
      authenticatedCorrectly: true, qcmsMonitoringOpened: true, evidenceStats: { evidenceTruncated: true } }, rubric);
    expect(report.status).toBe("SOLVED");
    expect(report.stepAssessment?.correct).toBe(0);
    expect(report.suggestedExaminerComment).toContain("Chưa đủ bằng chứng");
  });

  it("accepts only allowlisted step-bound explanations without changing factual report fields", async () => {
    const { generateAttemptAiFeedback, analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const { fixture } = await import("./step-assessment-fixtures");
    const { definition, payload, rubric } = fixture();
    const base = analyzeAttemptEvidence("dvor-1150a", definition, payload, rubric);
    const callModel = vi.fn(async (prompt: Record<string, unknown>) => {
      expect(prompt.stepAssessment).toEqual(base.stepAssessment);
      expect(prompt.citations).toEqual(rubric.citations);
      const allowed = prompt.allowedExplanations as Array<{ id: string }>;
      return { explanationIds: [allowed[0].id, allowed[0].id, "invented-step"], summary: "6/6 bước; 100 điểm", correctActions: ["Đã thay card"] };
    });
    const result = await generateAttemptAiFeedback({ moduleId: "dvor-1150a", definition, payload, rubric, mode: "practice" }, {
      aiEnabled: true, callModel, retrieveKnowledge: async () => ({ documents: [], available: false, notice: "No manual" }),
    });
    expect(callModel).toHaveBeenCalledOnce();
    expect(result.sourceMode).toBe("ai-assisted");
    expect(result.explanations).toHaveLength(1);
    expect(result.explanations?.[0]).toMatchObject({ stepId: "inspect", evidenceIds: ["view:monitor-integrity"], citationIds: ["manual-check"] });
    for (const key of ["summary", "whatToAchieve", "correctActions", "redundantOrWrongAdjustments", "nextSteps", "suggestedExaminerComment", "stepAssessment", "citations"] as const) expect(result[key]).toEqual(base[key]);
    expect(result.references).toEqual([]);
  });

  it("rejects unsupported model claims instead of replacing deterministic findings or counts", async () => {
    const { generateAttemptAiFeedback } = await import("@/lib/ai/feedback/attempt-feedback");
    const adapter = authoringAdapterFor("dvor-1150a");
    const definition = parseScenarioParameters("dvor-1150a", adapter.createDefault())!;
    const payload = {
      visitedViewIds: ["monitor-integrity"],
      actionHistory: [],
      checkpoint: {
        config: definition.configuration,
        configDirty: false,
      },
    };

    const mockProvider = vi.fn(async () => ({
      summary: "Thí sinh đã kiểm tra màn hình giám sát và giữ các thông số trong ngưỡng chuẩn.",
      whatToAchieve: ["Đảm bảo tất cả chỉ số Monitor ở trạng thái Normal."],
      correctActions: ["Đã mở màn hình giám sát Integrity."],
      redundantOrWrongAdjustments: [],
      nextSteps: ["Kiểm tra lại trạng thái Bypass trước khi kết thúc."],
      suggestedExaminerComment: "Bài làm đạt các tiêu chí vận hành cơ bản.",
    }));

    const mockRetrieve = vi.fn(async () => ({
      available: true,
      notice: "reference-only",
      documents: [
        {
          id: "kb:dvor-1150a:attech",
          name: "ATTECH DVOR 1150A [operating-procedure; reference-only]",
          sha256: "a".repeat(64),
          segments: [{ label: "PDF page 13", text: "Kiểm tra VSWR nhỏ hơn hoặc bằng 1.25:1" }],
        },
      ],
    }));

    const result = await generateAttemptAiFeedback(
      { moduleId: "dvor-1150a", definition, payload, mode: "practice" },
      { callModel: mockProvider, retrieveKnowledge: mockRetrieve, aiEnabled: true },
    );

    const { analyzeAttemptEvidence } = await import("@/lib/ai/feedback/attempt-feedback");
    const base = analyzeAttemptEvidence("dvor-1150a", definition, payload);
    expect(result.sourceMode).toBe("deterministic-only");
    for (const key of ["summary", "whatToAchieve", "correctActions", "redundantOrWrongAdjustments", "nextSteps", "suggestedExaminerComment", "status", "solved"] as const) {
      expect(result[key]).toEqual(base[key]);
    }
    expect(result.whatToAchieve.length).toBeGreaterThan(0);
    expect(result.references).toEqual([
      {
        documentName: "ATTECH DVOR 1150A [operating-procedure; reference-only]",
        segmentLabel: "PDF page 13",
        sha256: "a".repeat(64),
      },
    ]);
    expect(mockProvider).toHaveBeenCalledTimes(1);
  });
});
