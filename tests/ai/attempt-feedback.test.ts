// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { parseScenarioParameters } from "@/lib/scenario-parameters";

describe("AI & deterministic attempt feedback across CNS modules", () => {
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
    expect(report.correctActions.some(item => item.includes("Monitors >> Data >> Integrity"))).toBe(true);
    expect(report.redundantOrWrongAdjustments.some(item => item.includes("Thử sửa tần số Carrier"))).toBe(true);
    expect(report.redundantOrWrongAdjustments.some(item => item.includes("F7") || item.includes("Apply"))).toBe(true);
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

  it("enriches feedback with AI explanation and knowledge references while preserving deterministic truths", async () => {
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

    expect(result.sourceMode).toBe("ai-assisted");
    expect(result.summary).toContain("Thí sinh đã kiểm tra màn hình giám sát");
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
