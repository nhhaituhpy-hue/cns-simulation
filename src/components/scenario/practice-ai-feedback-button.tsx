"use client";

import { useState } from "react";
import type { AttemptFeedbackReport } from "@/lib/ai/feedback/attempt-feedback";
import type { AttemptStepAssessment } from "@/lib/ai/feedback/step-assessment";
import type { ManualCitation } from "@/lib/ai/scenario-blueprint/types";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { usePracticeSubmission, type PracticeSubmissionController } from "./attempt-feedback-client";
import { AttemptFeedbackResult } from "./attempt-feedback-result";
import { sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { useScenarioStore } from "@/stores/scenario-store";

export interface PracticeAiFeedbackButtonProps {
  moduleId: ScenarioParametersModuleId;
  scenarioId: string;
  scenarioName?: string;
  getPayload: () => Record<string, unknown> | null;
  buttonClassName?: string;
  attemptKey?: string | number | null;
  onRestart?: () => boolean | void;
  submission?: PracticeSubmissionController;
  hideSubmit?: boolean;
}

export function AttemptFeedbackCard({
  report,
  onInsertComment,
}: {
  report: AttemptFeedbackReport & { stepAssessment?: AttemptStepAssessment; citations?: ManualCitation[] };
  onInsertComment?: (text: string) => void;
}) {
  return (
    <div className="grid gap-4 text-left text-sm text-[var(--text-primary)]">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
        <div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
              report.solved
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {report.status === "UNVERIFIED" ? "UNVERIFIED · Chưa đủ bằng chứng kỹ thuật" : report.status === "SOLVED" ? "SOLVED · Đạt tiêu chí kỹ thuật" : "Chưa SOLVED · Chưa đạt tiêu chí kỹ thuật"}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{report.summary}</p>
        </div>
        {onInsertComment && report.suggestedExaminerComment ? (
          <button
            type="button"
            onClick={() => onInsertComment(report.suggestedExaminerComment)}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Đưa vào ô nhận xét
          </button>
        ) : null}
      </div>

      {report.stepAssessment ? <section aria-label="Đối chiếu quy trình" className="rounded-lg border border-[var(--border)] p-3.5">
        <h4 className="font-bold">{report.stepAssessment.correct}/{report.stepAssessment.totalRequiredSteps} bước đúng</h4>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Rubric v{report.stepAssessment.rubricVersion}. Kết quả quy trình tách biệt với trạng thái kỹ thuật SOLVED.</p>
        <ol className="mt-3 grid gap-3">
          {report.stepAssessment.steps.map((step) => <li key={step.id} className="rounded border border-[var(--border)] p-3">
            <div className="flex flex-wrap gap-2"><strong>{step.label}</strong><span>{({ correct: "Đúng", missing: "Thiếu", incorrect: "Sai", unverified: "Chưa đủ bằng chứng" } as const)[step.status]}</span></div>
            {step.evidenceIds.length ? <p className="mt-1 break-all text-xs text-[var(--text-secondary)]">Bằng chứng: {step.evidenceIds.join(", ")}</p> : null}
            {step.citationIds.map((id) => {
              const citation = report.citations?.find((item) => item.id === id);
              return citation ? <details key={id} className="mt-2 text-xs">
                <summary className="cursor-pointer font-semibold">Căn cứ: {citation.documentName} · {citation.segmentLabel}</summary>
                <blockquote className="my-2 border-l-2 border-[var(--border-strong)] pl-3">{citation.quote}</blockquote>
                <p className="break-all">Tài liệu {citation.documentId} · SHA-256: {citation.sha256}</p>
                {citation.sourceKind === "reference-only" ? <p className="mt-1 text-[var(--text-muted)]">Chỉ dùng tham khảo; không thay thế quy trình vận hành được phê duyệt.</p> : null}
              </details> : null;
            })}
          </li>)}
        </ol>
        {report.stepAssessment.unrelatedParameterChanges.length ? <section className="mt-4"><h5 className="font-semibold">Thay đổi tham số không liên quan</h5><ul className="mt-2 list-disc space-y-2 pl-4">{report.stepAssessment.unrelatedParameterChanges.map((change) => <li key={change.fieldId}><span>{change.label}</span><p className="text-xs">{String(change.before)} → {String(change.after)} · {change.reason}</p></li>)}</ul></section> : null}
        {report.stepAssessment.redundantActions.length ? <section className="mt-4"><h5 className="font-semibold">Thao tác thừa</h5><ul className="mt-2 list-disc pl-4">{report.stepAssessment.redundantActions.map((action, index) => <li key={`${action.controlId}-${index}`}>{action.label}</li>)}</ul></section> : null}
        <p className="mt-3 text-xs text-[var(--text-muted)]">{report.stepAssessment.notice}</p>
      </section> : <p className="text-xs text-[var(--text-secondary)]">Chưa có rubric quy trình; không suy ra số bước đúng từ nhật ký hay trạng thái alarm.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Những gì cần đạt để solve</h4>
          {report.whatToAchieve.length ? (
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-[var(--text-secondary)]">
              {report.whatToAchieve.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-muted)]">Không có tiêu chí chi tiết trong báo cáo này.</p>
          )}
        </section>

        <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
          <h4 className="text-xs font-bold text-emerald-900">Những gì đã làm đúng</h4>
          {report.correctActions.length ? (
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-emerald-950">
              {report.correctActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-emerald-800">Chưa ghi nhận thao tác hoàn tất tiêu chí nào.</p>
          )}
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
          <h4 className="text-xs font-bold text-amber-900">Làm thừa hoặc điều chỉnh sai</h4>
          {report.redundantOrWrongAdjustments.length ? (
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-amber-950">
              {report.redundantOrWrongAdjustments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-amber-800">Không phát hiện thao tác thừa hoặc điều chỉnh sai.</p>
          )}
        </section>
      </div>

      {report.nextSteps.length ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Gợi ý bước tiếp theo</h4>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--text-secondary)]">
            {report.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.references.length ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Tài liệu tham chiếu liên quan</h4>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-secondary)]">
            {report.references.map((ref) => (
              <li key={`${ref.documentName}-${ref.segmentLabel}`}>
                {ref.documentName} · {ref.segmentLabel}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.explanations?.length ? <section aria-label="Diễn giải hỗ trợ" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <h4 className="text-xs font-bold">Diễn giải hỗ trợ theo bằng chứng</h4>
        <ul className="mt-2 space-y-2 text-xs">{report.explanations.map(explanation=><li key={explanation.id}><p>{explanation.text}</p><p className="mt-1 text-[var(--text-muted)]">{report.stepAssessment?.steps.find(step=>step.id===explanation.stepId)?.label ?? "Đối chiếu quy trình"}</p></li>)}</ul>
      </section> : null}
      <p className="text-[11px] text-[var(--text-muted)]">{report.notice}</p>
    </div>
  );
}

export function PracticeAiFeedbackButton(props: PracticeAiFeedbackButtonProps) {
  const identity = useScenarioStore((state) => state.sessionIdentity);
  return props.submission
    ? <PracticeFeedbackControls key={JSON.stringify([identity, props.moduleId, props.scenarioId])} {...props} submission={props.submission} />
    : <StandalonePracticeFeedback key={JSON.stringify([identity, props.moduleId, props.scenarioId])} {...props} />;
}

function StandalonePracticeFeedback(props: PracticeAiFeedbackButtonProps) {
  const submission = usePracticeSubmission(props);
  return <PracticeFeedbackControls key={props.attemptKey ?? "current"} {...props} submission={submission} />;
}

function PracticeFeedbackControls({
  moduleId,
  scenarioId,
  scenarioName,
  getPayload,
  buttonClassName,
  onRestart,
  submission,
  hideSubmit = false,
}: PracticeAiFeedbackButtonProps & { submission: PracticeSubmissionController }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AttemptFeedbackReport | null>(null);

  async function requestFeedback() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/practice-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          scenarioId,
          payload: sanitizeScenarioExamPayload(getPayload()),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        feedback?: AttemptFeedbackReport;
        error?: string;
      } | null;
      if (!response.ok || !data?.feedback) {
        throw new Error(data?.error ?? "Không thể phân tích bài làm lúc này.");
      }
      setReport(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể phân tích bài làm lúc này.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {submission.submissionId ? <>
        <AttemptFeedbackResult target={{ practiceSubmissionId: submission.submissionId }} />
        {onRestart ? <button type="button" onClick={() => { if (onRestart() !== false) submission.reset(); }} className={buttonClassName}>Bắt đầu lượt ôn tập mới</button> : null}
      </> : !hideSubmit ? (
        <button type="button" disabled={submission.pending} onClick={() => void submission.submit()} className={buttonClassName ?? "inline-flex min-h-8 items-center justify-center rounded-md border border-[#0284c7] bg-[#e0f2fe] px-2.5 py-1 text-xs font-semibold text-[#0369a1] hover:bg-[#bae6fd] disabled:opacity-60"}>
          {submission.pending ? "Đang nộp bài…" : "Nộp bài ôn tập"}
        </button>
      ) : null}
      {submission.error ? <p role="alert">{submission.error}</p> : null}
      {!submission.submissionId ? <button
        type="button"
        onClick={() => void requestFeedback()}
        disabled={loading}
        className={
          buttonClassName ??
          "inline-flex min-h-8 items-center justify-center rounded-md border border-[#0284c7] bg-[#e0f2fe] px-2.5 py-1 text-xs font-semibold text-[#0369a1] hover:bg-[#bae6fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] disabled:opacity-60"
        }
      >
        {loading ? "AI đang nhận xét…" : "AI nhận xét bài làm"}
      </button> : null}

      {open && !submission.submissionId ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="AI nhận xét bài làm"
            className="max-h-[88dvh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text-primary)] shadow-2xl"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  AI nhận xét bài làm · {scenarioName ?? report?.scenarioName ?? scenarioId}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Phân tích điều kiện cần đạt để solve, thao tác làm đúng và các thao tác thừa hoặc điều chỉnh sai.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void requestFeedback()}
                  disabled={loading}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-60"
                >
                  {loading ? "Đang phân tích…" : "Cập nhật nhận xét"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Đóng
                </button>
              </div>
            </header>

            <div className="mt-4">
              {loading && !report ? (
                <p role="status" className="py-6 text-center text-sm text-[var(--text-secondary)]">
                  AI đang đối chiếu trạng thái thiết bị và lịch sử thao tác của bạn…
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </p>
              ) : null}
              {report ? <AttemptFeedbackCard report={report} /> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
