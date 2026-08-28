"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Link from "next/link";
import type {
  Dvor1150ScenarioDefinition,
  Dvor1150ScenarioEvaluation,
} from "@/lib/dvor1150";

export interface Dvor1150StudentAnswer {
  suspectedFault: string;
  reasoning: string;
  remediation: string;
}

export interface Dvor1150StudentEvent {
  id: string;
  sequence: number;
  title: string;
  menuPath: string[];
  detail?: string;
  annotation: string;
}

export function Dvor1150StudentJournal({
  scenario,
  answer,
  onAnswerChange,
}: {
  scenario: Dvor1150ScenarioDefinition;
  answer: Dvor1150StudentAnswer;
  onAnswerChange: (changes: Partial<Dvor1150StudentAnswer>) => void;
}) {
  return (
    <div className="text-[#e2e8f0]">
      <header className="border-b border-[#334155] p-4">
        <div className="flex items-center gap-2 text-[#93c5fd]">
          <ClipboardText aria-hidden size={18} />
          <h2 className="text-sm font-bold">Nhật ký học viên</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#94a3b8]">{scenario.description}</p>
      </header>

      <section aria-labelledby="dvor1150-conclusion-title" className="space-y-3 p-4">
        <h2 id="dvor1150-conclusion-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">
          Kết luận sự cố
        </h2>
        <AnswerField label="Vị trí / sự cố nghi ngờ" value={answer.suspectedFault} onChange={(value) => onAnswerChange({ suspectedFault: value })} />
        <AnswerField label="Căn cứ chẩn đoán" value={answer.reasoning} onChange={(value) => onAnswerChange({ reasoning: value })} />
        <AnswerField label="Hướng khắc phục" value={answer.remediation} onChange={(value) => onAnswerChange({ remediation: value })} />
      </section>
    </div>
  );
}

export function Dvor1150StudentActivity({
  events,
  evaluation,
  onUpdateEvent,
  onRemoveEvent,
}: {
  events: Dvor1150StudentEvent[];
  evaluation: Dvor1150ScenarioEvaluation;
  onUpdateEvent: (eventId: string, annotation: string) => void;
  onRemoveEvent: (eventId: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col text-[#e2e8f0]">
      <div className="flex-1 space-y-5 p-4">
        <section aria-labelledby="dvor1150-activity-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="dvor1150-activity-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">
              Màn hình và thao tác đã ghi nhận
            </h2>
            <span className="rounded bg-[#1e293b] px-2 py-0.5 font-mono text-[10px] text-[#93c5fd]">{events.length}</span>
          </div>

          {events.length === 0 ? (
            <p className="mt-3 rounded border border-dashed border-[#475569] p-3 text-xs leading-5 text-[#94a3b8]">
              Chọn menu và tab trên PMDT. Mỗi màn hình đã mở sẽ xuất hiện tại đây.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="relative rounded border border-[#334155] bg-[#0f172a] p-3">
                  <button
                    type="button"
                    onClick={() => onRemoveEvent(event.id)}
                    className="absolute right-2 top-2 rounded p-1 text-[#64748b] transition-colors hover:bg-[#1e293b] hover:text-[#ef4444]"
                    title="Xóa thao tác này"
                    aria-label={`Xóa thao tác ${event.sequence}`}
                  >
                    <X aria-hidden size={14} />
                  </button>
                  <div className="flex gap-2 pr-6">
                    <span className="font-mono text-[10px] text-[#60a5fa]">{String(event.sequence).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">{event.title}</p>
                      <p className="mt-1 truncate text-[10px] text-[#64748b]">{event.menuPath.join(" › ")}</p>
                      {event.detail ? <p className="mt-1 text-[10px] text-[#facc15]">{event.detail}</p> : null}
                    </div>
                  </div>
                  <label className="mt-2 grid gap-1 text-[10px] font-semibold text-[#94a3b8]">
                    Chú thích thao tác / nhận xét
                    <textarea
                      aria-label={`Chú thích ${event.title} lần ${event.sequence}`}
                      value={event.annotation}
                      onChange={(changeEvent) => onUpdateEvent(event.id, changeEvent.target.value)}
                      rows={2}
                      className="resize-y rounded border border-[#475569] bg-[#111827] p-2 text-xs font-normal leading-5 text-white outline-none focus:border-[#60a5fa]"
                    />
                  </label>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="dvor1150-progress-title" className="border-t border-[#334155] pt-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="dvor1150-progress-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">
              Tiến độ kịch bản
            </h2>
            <span className={evaluation.solved ? "rounded bg-[#166534] px-2 py-0.5 font-mono text-[10px] text-[#dcfce7]" : "rounded bg-[#854d0e] px-2 py-0.5 font-mono text-[10px] text-[#fef9c3]"}>
              {evaluation.solved ? "SOLVED" : "IN PROGRESS"}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-[10px] leading-4 text-[#94a3b8]">
            {evaluation.checks.map((check) => (
              <li key={check.id} className="flex gap-2">
                <CheckCircle aria-hidden size={13} className={check.passed ? "shrink-0 text-[#4ade80]" : "shrink-0 text-[#fbbf24]"} />
                <span>{check.label}: {check.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="sticky bottom-0 border-t border-[#334155] bg-[#111827] p-4">
        <Link
          href="/student/dvor-1150"
          className="pmdt-student-action-button inline-flex h-10 w-full items-center justify-center gap-1 rounded border border-[#60a5fa] bg-[#1d4ed8] px-2 text-[10px] font-semibold leading-4 text-[#f8fafc] whitespace-nowrap hover:bg-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] disabled:cursor-wait disabled:opacity-60"
        >
          Quay lại danh sách kịch bản
        </Link>
      </footer>
    </div>
  );
}

function AnswerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold text-[#94a3b8]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="resize-y rounded border border-[#475569] bg-[#0f172a] p-2 text-xs font-normal leading-5 text-white outline-none focus:border-[#60a5fa]"
      />
    </label>
  );
}
