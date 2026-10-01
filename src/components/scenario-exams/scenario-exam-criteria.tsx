import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useId } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { presentExamCriterion } from "@/lib/scenario-exams/evidence-presentation";
import type { ScenarioExamTechnicalSummary } from "@/lib/scenario-exams/types";
import type { ExamHardwareEvidence } from "@/lib/scenario-exams/hardware-presentation";

export function ScenarioExamCriteria({ summary, moduleId, hardwareEvidence }: { summary?: ScenarioExamTechnicalSummary; moduleId: ScenarioParametersModuleId; hardwareEvidence?: ExamHardwareEvidence | null }) {
  const titleId = useId();
  const verified = summary && summary.status !== "UNVERIFIED";
  const checks = summary?.checks ?? [];
  const referenceIds = new Set(hardwareEvidence?.referenceCriterionIds ?? []);
  const requiredChecks = checks.filter((check) => !referenceIds.has(check.id));
  const hasRecordedEvidence = (check: ScenarioExamTechnicalSummary["checks"][number]) => !(hardwareEvidence && !hardwareEvidence.hasEvidence && (check.id === "hardware-selection" || check.id === "hardware"));
  const passedCount = verified ? requiredChecks.filter((check) => check.passed && hasRecordedEvidence(check)).length : 0;

  return <section aria-labelledby={titleId} className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id={titleId} className="text-base font-bold text-[var(--text-primary)]">Tiêu chí đạt <span className="ml-1 text-xs font-normal text-[var(--text-secondary)]">Success criteria</span></h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Đối chiếu Scenario đã cấp với trạng thái và minh chứng lúc nộp bài.</p>
      </div>
      <span className={`rounded border px-2.5 py-1 text-xs font-bold tabular-nums ${verified && requiredChecks.length && passedCount === requiredChecks.length && !summary.blockers.length ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"}`}>{verified && requiredChecks.length ? `${passedCount}/${requiredChecks.length} đạt` : "Chưa đủ dữ liệu"}</span>
    </header>
    {!checks.length ? <p className="mt-4 rounded border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-secondary)]">Chưa đủ dữ liệu hợp lệ để đối chiếu các tiêu chí kỹ thuật.</p> : <ol className="mt-4 grid gap-2 lg:grid-cols-2">
      {checks.map((check, index) => {
        const presentation = presentExamCriterion(check, moduleId);
        const reference = referenceIds.has(check.id);
        const missingHardware = (check.id === "hardware-selection" || check.id === "hardware") && hardwareEvidence && !hardwareEvidence.hasEvidence;
        const confirmed = verified && !missingHardware;
        const passed = confirmed && check.passed;
        const neutral = !confirmed || reference;
        const status = reference ? "Tham khảo" : missingHardware ? "Chưa có minh chứng" : !verified ? "Chưa xác nhận" : passed ? "Đạt" : "Chưa đạt";
        return <li key={check.id} className={`flex flex-wrap items-start gap-3 rounded border p-3 ${neutral ? "border-[var(--border)] bg-[var(--surface)]" : passed ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)]" : "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)]"}`}>
          {passed && !reference ? <CheckCircle aria-hidden size={20} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-success)]" /> : <WarningCircle aria-hidden size={20} weight="fill" className={`mt-0.5 shrink-0 ${neutral ? "text-[var(--text-muted)]" : "text-[var(--color-danger)]"}`} />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5 text-[var(--text-primary)] [overflow-wrap:anywhere]"><span className="mr-2 text-xs tabular-nums text-[var(--text-secondary)]">{String(index + 1).padStart(2, "0")}</span>{presentation.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{missingHardware ? "Chưa có lựa chọn khối/card hoặc xác nhận phương án phần cứng được lưu." : verified ? presentation.detail : "Chưa có dữ liệu hợp lệ để xác nhận."}{reference ? " · Trạng thái vận hành tham khảo cho bài xác định phần cứng." : ""}</p>
          </div>
          <span className={`shrink-0 text-xs font-bold ${neutral ? "text-[var(--text-secondary)]" : passed ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{status}</span>
        </li>;
      })}
    </ol>}
    {summary?.blockers.length ? <div className="mt-3 rounded border border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs leading-5 text-[var(--color-warning)]"><p className="font-semibold">Điều kiện còn cần xem xét</p><ul className="mt-1 list-inside list-disc">{summary.blockers.map((blocker, index) => <li key={`${index}-${blocker}`} className="[overflow-wrap:anywhere]">{blocker}</li>)}</ul></div> : null}
  </section>;
}
