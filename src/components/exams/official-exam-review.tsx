"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/ssr/Circle";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import Link from "next/link";
import { HardwareReview } from "@/components/hardware/hardware-review";
import { StepDiff } from "@/components/grading/step-diff";
import { DME_EQUIPMENT_DIAGRAMS } from "@/lib/dme-hardware-model";
import type { DmeScenario } from "@/lib/dme-types";
import { presentAdsbResult, presentPmdtResult, type PmdtResultPresentation } from "@/lib/exams/result-presentation";
import type { AdminCandidateSubjectReview, AdminExamAttemptItemDetail } from "@/lib/exams/types";
import { gradeActions, gradeCombinedAttempt } from "@/lib/grading";
import type { Scenario } from "@/lib/types";
import { VOR_EQUIPMENT_DIAGRAMS } from "@/lib/vor-hardware-model";
import type { VorScenario } from "@/lib/vor-types";
import { CandidateResultEditor } from "./candidate-result-editor";

function formatDateTime(value: string | null) {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(date);
}

function moduleLabel(moduleCode: AdminExamAttemptItemDetail["moduleCode"]) {
  return moduleCode === "ads-b" ? "ADS-B" : moduleCode.toUpperCase();
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null) return "null";
  if (value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Answer({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{value || "Không có nội dung."}</p>
    </div>
  );
}

function PmdtEvidence({
  result,
  scenario,
  moduleCode,
}: {
  result: PmdtResultPresentation;
  scenario: VorScenario | DmeScenario;
  moduleCode: "vor" | "dme";
}) {
  const visitedViews = new Set(result.events.filter((event) => event.eventType === "view").map((event) => event.viewId));
  const diagrams = moduleCode === "vor" ? VOR_EQUIPMENT_DIAGRAMS : DME_EQUIPMENT_DIAGRAMS;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <div className="grid content-start gap-5">
        <ReviewCard title="Nhật ký thao tác PMDT">
          {result.events.length ? (
            <ol className="space-y-3">
              {result.events.map((event) => (
                <li key={event.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <div className="flex gap-3">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">{String(event.sequence).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-primary)]">{event.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{event.menuPath.join(" › ") || "Không có đường dẫn menu"}</p>
                      {event.eventType === "sidebar" ? <p className="mt-2 font-mono text-xs font-semibold text-[#a16207]">Kết quả: {displayValue(event.resultValue)} · {event.resultStatus ?? "không có trạng thái"}</p> : null}
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{event.annotation || "Không có chú thích."}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-[var(--text-muted)]">Bài nộp không có nhật ký thao tác.</p>}
        </ReviewCard>

        <ReviewCard title="Câu trả lời của thí sinh">
          <Answer label="Vị trí / sự cố nghi ngờ" value={result.answer.suspectedFault} />
          <Answer label="Căn cứ chẩn đoán" value={result.answer.reasoning} />
          <Answer label="Hướng khắc phục" value={result.answer.remediation} />
        </ReviewCard>

        {scenario.hardwareTask ? (
          <ReviewCard title="Đối chiếu chẩn đoán phần cứng">
            <HardwareReview diagrams={diagrams} task={scenario.hardwareTask} answer={result.hardwareAnswer} />
          </ReviewCard>
        ) : null}
      </div>

      <div className="grid content-start gap-5">
        <ReviewCard title="Checkpoint tham khảo">
          <p className="mb-4 text-xs leading-5 text-[var(--text-muted)]">Checkpoint hỗ trợ giám khảo đối chiếu, không tự quyết định điểm chính thức.</p>
          {scenario.expectedCheckpoints.length ? (
            <ul className="space-y-3">
              {scenario.expectedCheckpoints.map((checkpoint) => {
                const visited = visitedViews.has(checkpoint.viewId);
                return (
                  <li key={checkpoint.id} className="flex gap-3 rounded-md border border-[var(--border)] p-3">
                    {visited ? <CheckCircle aria-label="Đã kiểm tra" size={19} weight="fill" className="shrink-0 text-[#16a34a]" /> : <Circle aria-label="Chưa kiểm tra" size={19} className="shrink-0 text-[var(--text-muted)]" />}
                    <div><p className="text-sm font-semibold text-[var(--text-primary)]">{checkpoint.title}</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{checkpoint.guidance}</p><p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">Trọng số tham khảo: {checkpoint.points}</p></div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-[var(--text-muted)]">Kịch bản không có checkpoint tham chiếu.</p>}
        </ReviewCard>
        <ReviewCard title="Thời gian ghi nhận">
          <dl className="grid gap-3 text-sm"><div><dt className="text-xs font-semibold text-[var(--text-muted)]">Bắt đầu</dt><dd className="mt-1 font-mono text-[var(--text-primary)]">{formatDateTime(result.startedAt)}</dd></div><div><dt className="text-xs font-semibold text-[var(--text-muted)]">Nộp kịch bản</dt><dd className="mt-1 font-mono text-[var(--text-primary)]">{formatDateTime(result.submittedAt)}</dd></div></dl>
        </ReviewCard>
      </div>
    </div>
  );
}

function componentName(scenario: Scenario, id: string) {
  return scenario.hardwareFault?.hardwareLayout.find((component) => component.id === id)?.name ?? id;
}

function AdsbEvidence({ result: rawResult, scenario }: { result: Record<string, unknown> | null; scenario: Scenario }) {
  const result = presentAdsbResult(rawResult);
  if (!result) return <p className="text-sm text-[var(--text-muted)]">Không có dữ liệu bài nộp ADS-B.</p>;
  const grading = scenario.hardwareFault
    ? gradeCombinedAttempt(scenario.expectedActions, result.selectedActions, result.authenticatedCorrectly, scenario.hardwareFault.faultyComponentIds, result.diagnosedComponentIds)
    : null;
  const terminalResult = grading?.terminalResult ?? gradeActions(scenario.expectedActions, result.selectedActions);

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-4">
        <ReviewCard title="Điểm máy tham khảo"><p className="font-mono text-3xl font-bold text-[var(--text-primary)]">{grading?.score ?? terminalResult.score}/100</p><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Điểm này chỉ hỗ trợ đối chiếu, không phải điểm chính thức.</p></ReviewCard>
        <ReviewCard title="Đăng nhập terminal"><p className={`text-sm font-semibold ${result.authenticatedCorrectly ? "text-[#166534]" : "text-[#991b1b]"}`}>{result.authenticatedCorrectly ? "Đúng tài khoản" : "Chưa xác thực đúng"}</p></ReviewCard>
        <ReviewCard title="Kiểm tra QCMS"><p className={`text-sm font-semibold ${result.qcmsMonitoringOpened ? "text-[#166534]" : "text-[#991b1b]"}`}>{result.qcmsMonitoringOpened ? "Đã mở monitoring" : "Chưa mở monitoring"}</p></ReviewCard>
        <ReviewCard title="Thời gian"><p className="font-mono text-xs text-[var(--text-primary)]">{formatDateTime(result.startedAt)}</p><p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">{formatDateTime(result.submittedAt)}</p></ReviewCard>
      </div>

      <ReviewCard title="Đối chiếu chuỗi thao tác terminal">
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]"><span>Đúng <strong>{terminalResult.correctSteps}/{terminalResult.totalExpected}</strong> bước</span><span>Đã chọn <strong>{terminalResult.totalSubmitted}</strong> bước</span><span>Tổng thao tác ghi nhận <strong>{result.allActions.length}</strong></span></div>
        <StepDiff comparisons={terminalResult.steps} />
      </ReviewCard>

      {scenario.hardwareFault ? (
        <ReviewCard title="Đối chiếu chẩn đoán phần cứng ADS-B">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-4"><h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Đáp án kịch bản</h4><ul className="mt-3 space-y-1 text-sm text-[var(--text-primary)]">{scenario.hardwareFault.faultyComponentIds.map((id) => <li key={id}>{componentName(scenario, id)}</li>)}</ul><p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{scenario.hardwareFault.faultDescription}</p></div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-4"><h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Thí sinh lựa chọn</h4>{result.diagnosedComponentIds.length ? <ul className="mt-3 space-y-1 text-sm text-[var(--text-primary)]">{result.diagnosedComponentIds.map((id) => <li key={id}>{componentName(scenario, id)}</li>)}</ul> : <p className="mt-3 text-sm text-[var(--text-muted)]">Không chọn component nghi ngờ.</p>}<p className="mt-3 text-xs text-[var(--text-muted)]">Đã xem {result.inspectedComponentIds.length} component.</p></div>
          </div>
        </ReviewCard>
      ) : null}
    </div>
  );
}

function AttemptItemReview({ item }: { item: AdminExamAttemptItemDetail }) {
  const scenario = item.scenario?.scenario;
  const title = scenario?.title ?? item.scenarioTitle;
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <header className="mb-5 flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">Kịch bản {item.position} · {moduleLabel(item.moduleCode)}</p><h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h2></div>
        <span className="w-fit rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">Đã nộp</span>
      </header>
      {!scenario || !item.result ? (
        <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#78350f]"><WarningCircle aria-hidden className="mr-2 inline" size={18} />Không thể tải đầy đủ kịch bản hoặc dữ liệu bài nộp.</div>
      ) : item.moduleCode === "vor" && item.scenario?.moduleCode === "vor" ? (
        <PmdtEvidence result={presentPmdtResult(item.result)!} scenario={item.scenario.scenario} moduleCode="vor" />
      ) : item.moduleCode === "dme" && item.scenario?.moduleCode === "dme" ? (
        <PmdtEvidence result={presentPmdtResult(item.result)!} scenario={item.scenario.scenario} moduleCode="dme" />
      ) : item.moduleCode === "ads-b" && item.scenario?.moduleCode === "ads-b" ? (
        <AdsbEvidence result={item.result} scenario={item.scenario.scenario} />
      ) : null}
    </article>
  );
}

export function OfficialExamReview({ detail }: { detail: AdminCandidateSubjectReview }) {
  const attempt = detail.attempt;
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
      <Link href={`/admin/exams/${detail.examId}`} className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"><ArrowLeft aria-hidden size={17} />Quay lại kỳ thi</Link>
      <header className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Bài thi chính thức</p><h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{detail.candidateName}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{detail.candidateWorkUnit} · {detail.candidateEmail}</p></div>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold text-[var(--text-muted)]">Kỳ thi</dt><dd className="mt-1 font-semibold text-[var(--text-primary)]">{detail.examName}</dd></div><div><dt className="text-xs font-semibold text-[var(--text-muted)]">Môn / đề</dt><dd className="mt-1 font-semibold text-[var(--text-primary)]">{detail.subjectName} · {detail.paperTitle}</dd></div><div><dt className="text-xs font-semibold text-[var(--text-muted)]">Bắt đầu môn</dt><dd className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{formatDateTime(attempt?.startedAt ?? null)}</dd></div><div><dt className="text-xs font-semibold text-[var(--text-muted)]">Nộp môn</dt><dd className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{formatDateTime(attempt?.submittedAt ?? null)}</dd></div></dl>
        </div>
      </header>

      <div className="mt-6 grid gap-5">
        {!attempt ? <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-5 text-sm text-[#78350f]">Thí sinh chưa bắt đầu môn thi này.</div> : null}
        {attempt?.items.map((item) => <AttemptItemReview key={item.id} item={item} />)}
      </div>

      <section className="mt-6 rounded-xl border border-[var(--accent-border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">Kết quả chính thức</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Nhập điểm sau khi đã đối chiếu toàn bộ bằng chứng phía trên.</p></div>
        <CandidateResultEditor candidateSubjectId={detail.id} status={detail.status} officialScore={detail.officialScore} examinerComment={detail.examinerComment ?? ""} />
      </section>
    </div>
  );
}
