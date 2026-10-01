import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useId } from "react";
import type { ScenarioActionEvent } from "@/lib/scenario-evidence";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { formatExamEvidenceTime, presentExamEvidenceAction, type EvidenceDisplayValue, type EvidenceTone } from "@/lib/scenario-exams/evidence-presentation";

const valueStyles: Record<EvidenceTone, string> = {
  success: "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]",
  danger: "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]",
  warning: "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  neutral: "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]",
};

function StateValue({ value, neutral = false }: { value: EvidenceDisplayValue; neutral?: boolean }) {
  return <span className={`inline-flex max-w-full rounded border px-2 py-1 text-xs font-semibold [overflow-wrap:anywhere] ${valueStyles[neutral ? "neutral" : value.tone]}`}>{value.text}</span>;
}

export function ScenarioExamActionJournal({ events, moduleId, truncated = false }: {
  events: readonly ScenarioActionEvent[];
  moduleId: ScenarioParametersModuleId;
  truncated?: boolean;
}) {
  const titleId = useId();
  const actions = events.filter((event) => event.kind !== "view");
  const acceptedCount = actions.filter((event) => event.accepted).length;

  return <section aria-labelledby={titleId} className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id={titleId} className="text-base font-bold text-[var(--text-primary)]">Nhật ký kỹ thuật đã nộp</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Chức năng đã dùng và thay đổi trên phần mềm. Thao tác được chấp nhận chưa đồng nghĩa với đạt tiêu chí.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded border px-2 py-1 ${acceptedCount ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"}`}>{acceptedCount} được chấp nhận</span>
        {acceptedCount < actions.length ? <span className="rounded border border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] px-2 py-1 text-[var(--color-danger)]">{actions.length - acceptedCount} bị từ chối</span> : null}
      </div>
    </header>
    {truncated ? <p className="mt-3 rounded border border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs leading-5 text-[var(--color-warning)]">Nhật ký đã đạt giới hạn lưu. Các bước dưới đây chỉ phản ánh phần thao tác được lưu trong bài nộp.</p> : null}
    {!actions.length ? <p className="mt-4 rounded border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-secondary)]">Chưa có thao tác kỹ thuật được ghi nhận trong bài nộp.</p> : <ol className="mt-4 space-y-3">
      {actions.map((event) => {
        const action = presentExamEvidenceAction(event, moduleId);
        const status = event.accepted ? event.actor === "system" ? "Đã ghi nhận" : "Đã thực hiện" : "Bị từ chối";
        return <li key={event.id} className={`rounded border p-3 sm:p-4 ${event.accepted ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)]" : "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)]"}`}>
          <div className="flex items-start gap-3">
            {event.accepted ? <CheckCircle aria-hidden size={21} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-success)]" /> : <WarningCircle aria-hidden size={21} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-danger)]" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-6 text-[var(--text-primary)] [overflow-wrap:anywhere]"><span className="mr-2 text-xs font-medium tabular-nums text-[var(--text-secondary)]">#{String(event.sequence).padStart(2, "0")}</span>{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{action.actor} · {action.category} · <time dateTime={Number.isNaN(Date.parse(event.occurredAt)) ? undefined : event.occurredAt}>{formatExamEvidenceTime(event.occurredAt)}</time></p>
                </div>
                <span className={`shrink-0 text-xs font-bold ${event.accepted ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{status}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                {action.button ? <span className="inline-flex items-center gap-2"><span className="text-[var(--text-secondary)]">Chức năng</span><span className="rounded border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 font-semibold text-[var(--text-primary)]">{action.button}</span></span> : null}
                <span className="min-w-0 leading-5 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{event.menuPath.join(" › ") || "PMDT"}</span>
              </div>
              {action.facts.length ? <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">{action.facts.map((fact) => <div key={fact.label} className="flex min-w-0 flex-wrap gap-1.5"><dt className="text-[var(--text-secondary)]">{fact.label}:</dt><dd className="font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{fact.value}</dd></div>)}</dl> : null}
              {action.changes.length ? <dl className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2">{action.changes.map((change, index) => <div key={`${change.label}-${index}`} className="min-w-0">
                <dt className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">{change.label}{change.phase ? <span className="ml-2 text-[var(--text-muted)]">· {change.phase}</span> : null}{!change.accepted ? " · Không được chấp nhận" : ""}</dt>
                <dd className="flex flex-wrap items-center gap-2"><span className="sr-only">Trước: </span><StateValue value={change.before} neutral /><ArrowRight aria-hidden size={14} className="shrink-0 text-[var(--text-secondary)]" /><span className="sr-only">Sau: </span><StateValue value={change.after} neutral={!change.accepted || change.phase === "Bản nháp"} /></dd>
              </div>)}</dl> : null}
              {action.reason ? <p className={`mt-3 text-xs leading-5 ${event.accepted ? "text-[var(--text-secondary)]" : "font-medium text-[var(--color-danger)]"}`}>{action.reason}</p> : null}
              <details className="mt-3 border-t border-[var(--border)] pt-1">
                <summary className="min-h-11 cursor-pointer content-center rounded text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]">Chi tiết kỹ thuật</summary>
                <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-secondary)] [overflow-wrap:anywhere]">{JSON.stringify(event, null, 2)}</pre>
              </details>
            </div>
          </div>
        </li>;
      })}
    </ol>}
  </section>;
}
