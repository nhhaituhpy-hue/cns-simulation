"use client";

import Link from "next/link";
import { ExamPageHeader, secondaryButtonClassName } from "@/components/exams/shared";
import { ScenarioActionTimeline } from "@/components/scenario/scenario-action-timeline";
import { presentPmdtResult } from "@/lib/exams/result-presentation";
import { getScenarioParametersModule } from "@/lib/scenario-parameters";
import { isRecord, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { formatScenarioExamDate } from "@/lib/scenario-exams/presentation";
import type { ScenarioExamReviewSubject, ScenarioExamSubmissionReview } from "@/lib/scenario-exams/types";
import { ScenarioExamScoreEditor } from "./scenario-exam-score-editor";

const labels: Record<string, string> = {
  answer: "Câu trả lời", suspectedFault: "Vị trí / sự cố nghi ngờ", reasoning: "Căn cứ chẩn đoán", remediation: "Hướng khắc phục",
  checkpoint: "Cấu hình và trạng thái lúc lưu", config: "Cấu hình áp dụng", configDraft: "Cấu hình đang chỉnh", configurationBackup: "Cấu hình đã backup",
  data: "Tham số thiết bị", device: "Trạng thái DVOR 220", simulation: "Trạng thái DME 320", terminal: "Phiên Terminal",
  actionHistory: "Nhật ký thao tác", attemptEvents: "Các màn hình đã kiểm tra", visitedViewIds: "Màn hình đã kiểm tra", acceptedActionControlIds: "Thao tác được chấp nhận",
  scenarioHardwareSelection: "Khối/card được chọn", scenarioHardwareInspected: "Khối/card đã kiểm tra", scenarioHardwareReasoning: "Lý do xử lý phần cứng",
  scenarioHardwareDispositionConfirmed: "Đã xác nhận phương án xử lý", scenarioStage: "Bước làm bài", diagnosticState: "Kết quả Diagnostics", scenarioDiagnosticState: "Kết quả Diagnostics",
  allActions: "Toàn bộ thao tác Terminal", selectedActions: "Thao tác thí sinh lựa chọn", authenticatedCorrectly: "Đăng nhập đúng", qcmsMonitoringOpened: "Đã kiểm tra QCMS",
  evidenceStats: "Thống kê nhật ký", evidenceTruncated: "Nhật ký đã bị giới hạn", totalEventCount: "Tổng sự kiện", storedEventCount: "Sự kiện được lưu", droppedCount: "Sự kiện vượt giới hạn",
  diagnosis: "Đáp án chẩn đoán tham chiếu", successCriteria: "Tiêu chí kỹ thuật", expectedActions: "Thao tác tham chiếu", faultInjections: "Sự cố đã cấp",
  faultSummary: "Mô tả sự cố", disposition: "Phương án xử lý", expectedHardwareOccurrenceKeys: "Khối/card tham chiếu", manualReferences: "Tài liệu tham chiếu",
};

/** Render any supported module's evidence without falling back to its live source. */
function EvidenceData({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === "") return <span className="text-[var(--text-muted)]">—</span>;
  if (typeof value === "boolean") return <span>{value ? "Có" : "Không"}</span>;
  if (typeof value !== "object") return <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{String(value)}</span>;
  const entries = Array.isArray(value) ? value.map((entry, index) => [String(index + 1), entry] as const) : Object.entries(value);
  if (!entries.length) return <span className="text-[var(--text-muted)]">Không ghi nhận</span>;
  if (depth >= 8) return <pre className="whitespace-pre-wrap [overflow-wrap:anywhere]">{JSON.stringify(value, null, 2)}</pre>;
  return <dl className="divide-y divide-[var(--border)]">{entries.map(([key, entry]) => <div key={key} className="grid gap-1 py-2 first:pt-0 sm:grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)]">
    <dt className="text-xs font-semibold text-[var(--text-secondary)] [overflow-wrap:anywhere]">{labels[key] ?? key}</dt>
    <dd className="min-w-0 text-sm text-[var(--text-primary)]">{entry !== null && typeof entry === "object"
      ? <details open={depth === 0} className="min-w-0"><summary className="cursor-pointer rounded text-xs text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{Array.isArray(entry) ? `${entry.length} mục` : "Chi tiết"}</summary><div className="mt-2 border-l border-[var(--border)] pl-3"><EvidenceData value={entry} depth={depth + 1} /></div></details>
      : <EvidenceData value={entry} depth={depth + 1} />}</dd>
  </div>)}</dl>;
}

function SubmittedEvidence({ subject }: { subject: ScenarioExamReviewSubject }) {
  if (!subject.result) return <p role={subject.resultInvalid ? "alert" : "status"} className="text-sm text-[var(--text-secondary)]">{subject.resultInvalid ? "Dữ liệu bài làm không hợp lệ hoặc không khớp với Scenario đã cấp." : "Môn này chưa có dữ liệu bài làm được lưu."}</p>;
  const payload = subject.result.payload;
  const pmdt = presentPmdtResult({ ...payload, events: payload.attemptEvents ?? payload.events });
  return <div className="grid gap-5">
    <section><h4 className="mb-3 text-sm font-bold text-[var(--text-primary)]">Câu trả lời của thí sinh</h4><EvidenceData value={isRecord(payload.answer) ? payload.answer : { scenarioHardwareReasoning: payload.scenarioHardwareReasoning ?? "" }} /></section>
    {pmdt?.actionHistory.length ? <ScenarioActionTimeline events={pmdt.actionHistory} title="Nhật ký kỹ thuật đã nộp" /> : null}
    <section><h4 className="mb-3 text-sm font-bold text-[var(--text-primary)]">Dữ liệu bài làm đã nộp</h4><p className="mb-3 text-xs text-[var(--text-secondary)]">Bản lưu: {formatScenarioExamDate(subject.result.capturedAt)}. Mở từng mục để xem cấu hình, thao tác, chẩn đoán và phần cứng.</p><EvidenceData value={payload} /></section>
  </div>;
}

function ScenarioReference({ subject }: { subject: ScenarioExamReviewSubject }) {
  if (!subject.definition) return null;
  const definition = subject.definition as unknown as Record<string, unknown>;
  const reference = Object.fromEntries(["diagnosis", "successCriteria", "expectedActions", "faultInjections"].filter((key) => definition[key] !== undefined).map((key) => [key, definition[key]]));
  return <details className="rounded border border-[var(--border)] p-3"><summary className="cursor-pointer rounded text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Scenario và đáp án tham chiếu đã cấp · revision {subject.revision ?? "—"}</summary>
    <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{subject.definition.description}</p><div className="mt-3"><EvidenceData value={sanitizeScenarioExamPayload(reference)} /></div>
  </details>;
}

export function ScenarioExamSubmissionReviewView({ review }: { review: ScenarioExamSubmissionReview }) {
  return <div className="grid gap-5">
    <Link href={`/admin/scenario-exams/${review.examId}`} className={`${secondaryButtonClassName} w-fit`}>Quay lại kỳ thi</Link>
    <ExamPageHeader title={`Bài làm · ${review.candidateName}`} description={`${review.examName} · ${review.candidateUnit} · Mã ••••${review.codeHint}`} />
    <section className="grid gap-3 border-b border-[var(--border)] pb-5 text-sm sm:grid-cols-3">
      <p className="text-[var(--text-secondary)]">Trạng thái: <strong className={review.codeStatus === "submitted" ? "text-[var(--color-success)]" : "text-[var(--text-primary)]"}>{review.codeStatus}</strong></p>
      <p className="text-[var(--text-secondary)]">Bắt đầu: {formatScenarioExamDate(review.startedAt, "Chưa bắt đầu")}</p>
      <p className="text-[var(--text-secondary)]">Nộp phiên: {formatScenarioExamDate(review.submittedAt, "Chưa nộp")}</p>
    </section>
    <nav aria-label="Môn cần chấm" className="flex flex-wrap gap-2">{review.subjects.map((subject) => <a key={subject.subjectId} href={`#subject-${subject.subjectId}`} className={secondaryButtonClassName}>{getScenarioParametersModule(subject.moduleId)?.label ?? subject.moduleId}</a>)}</nav>
    {review.subjects.map((subject) => <section key={subject.subjectId} id={`subject-${subject.subjectId}`} aria-label={`Bài làm ${getScenarioParametersModule(subject.moduleId)?.label ?? subject.moduleId}`} className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div><h2 className="text-lg font-bold text-[var(--text-primary)]">{getScenarioParametersModule(subject.moduleId)?.label ?? subject.moduleId}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{subject.scenarioName ?? "Chưa cấp Scenario"}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">Bắt đầu: {formatScenarioExamDate(subject.startedAt, "Chưa bắt đầu")} · Nộp môn: {formatScenarioExamDate(subject.submittedAt, "Chưa nộp")}</p></div>
        <div className="text-right"><p className={`text-sm font-semibold ${subject.status === "submitted" ? "text-[var(--color-success)]" : "text-[var(--text-secondary)]"}`}>{subject.status}</p><p className="mt-1 text-sm text-[var(--text-primary)]">{subject.examinerScore == null ? "Chưa chấm điểm" : `Điểm: ${subject.examinerScore}/100`}</p></div>
      </header>
      <div className="grid gap-5"><SubmittedEvidence subject={subject} /><ScenarioReference subject={subject} /><ScenarioExamScoreEditor key={`${subject.itemId}:${subject.reviewedAt}`} examId={review.examId} codeId={review.codeId} subject={subject} /></div>
    </section>)}
    {!review.subjects.length ? <p className="text-sm text-[var(--text-secondary)]">Mã thí sinh chưa được cấp môn thi.</p> : null}
  </div>;
}
