import type { Pool } from "pg";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { isRecord, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { presentPmdtResult } from "@/lib/exams/result-presentation";
import { generateAttemptAiFeedback, type AttemptFeedbackReport } from "./attempt-feedback";
import { claimFeedbackJob, completeFeedbackJob, failFeedbackJob, heartbeatFeedbackJob, type FeedbackJob } from "./jobs";
import { sweepExpiredScenarioExamSessions } from "@/lib/scenario-exams/expiration";
import { processNextGeneration, type GenerationWorkerOutcome } from "../scenario-generation/worker";

interface FeedbackWorkerDependencies {
  claim: () => Promise<FeedbackJob | null>;
  heartbeat: (job: FeedbackJob) => Promise<boolean>;
  generate: (job: FeedbackJob, signal: AbortSignal) => Promise<AttemptFeedbackReport>;
  complete: (job: FeedbackJob, report: AttemptFeedbackReport) => Promise<boolean>;
  fail: (job: FeedbackJob) => Promise<boolean>;
  signal?: AbortSignal;
  heartbeatMs?: number;
}
/** Reuse the already fenced worker loop; no provider credentials enter web APIs. */
export async function processNextFeedback(deps: FeedbackWorkerDependencies): Promise<GenerationWorkerOutcome> {
  return processNextGeneration({
    claim: async () => { const job = await deps.claim(); return job ? { id: job.id, attemptToken: job.attemptToken, input: job, documents: null } : null; },
    heartbeat: job => deps.heartbeat(job.input),
    loadDocuments: async () => null,
    generate: (job, _documents, signal) => deps.generate(job, signal),
    complete: (job, report) => deps.complete(job.input, report),
    fail: job => deps.fail(job.input),
    signal: deps.signal, heartbeatMs: deps.heartbeatMs,
  });
}
export async function runNextFeedback(pool: Pool, workerId: string, signal?: AbortSignal) {
  if (signal?.aborted) return "stopped" as const;
  await sweepExpiredScenarioExamSessions(pool, 25, signal);
  if (signal?.aborted) return "stopped" as const;
  return processNextFeedback({
    claim: () => claimFeedbackJob(pool, workerId),
    heartbeat: job => heartbeatFeedbackJob(pool, job.id, job.attemptToken),
    generate: async (job, signal) => {
      if (job.moduleId === "vor" || job.moduleId === "dme") {
        // Legacy checkpoint visits are not a versioned recovery rubric or a
        // native technical solve. Preserve that distinction rather than adapt
        // the row onto today's default simulator configuration.
        if (!isRecord(job.definition) || typeof job.definition.id !== "string" || typeof job.definition.title !== "string") throw new Error("INVALID_LEGACY_SNAPSHOT");
        const evidence = presentPmdtResult(job.payload);
        const summary = "Bài làm legacy đã được lưu. Chưa có rubric quy trình có phiên bản hoặc đủ dữ liệu native để xác minh SOLVED.";
        return {
          moduleId: job.moduleId === "vor" ? "dvor-1150a" : "dme-1119a", scenarioId: job.definition.id,
          scenarioName: job.definition.title, status: "UNVERIFIED", solved: null, sourceMode: "deterministic-only", summary,
          whatToAchieve: typeof job.definition.prompt === "string" ? [job.definition.prompt.slice(0, 2000)] : [],
          correctActions: [],
          redundantOrWrongAdjustments: (evidence?.actionHistory ?? []).filter(action => action.actor === "student" && !action.accepted)
            .slice(0, 16).map(action => `Thao tác bị từ chối: ${action.label.slice(0, 500)}`),
          nextSteps: ["Giám khảo đối chiếu nhật ký và câu trả lời với kịch bản đã đóng băng; không suy số bước đúng từ lượt mở màn hình."],
          suggestedExaminerComment: summary, references: [],
          notice: "Phân tích tất định từ hồ sơ legacy; không tự động thay đổi điểm thi chính thức.",
        };
      }
      if (!isScenarioParametersModuleId(job.moduleId)) throw new Error("UNSUPPORTED_LEGACY_DEFINITION");
      const input = { moduleId: job.moduleId, definition: job.definition, rubric: job.rubric,
        payload: sanitizeScenarioExamPayload(job.payload) as Record<string, unknown> | null,
        mode: job.practice ? "practice" as const : "examiner-review" as const };
      // The engine returns deterministic-only feedback on provider failure.
      return generateAttemptAiFeedback(input, { signal });
    },
    complete: (job, report) => completeFeedbackJob(pool, job.id, job.attemptToken, report),
    fail: job => failFeedbackJob(pool, job.id, job.attemptToken),
    signal,
  });
}
