"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useState } from "react";
import type { VorScenario } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

interface VorStudentJournalProps {
  scenario: VorScenario;
  showConclusion?: boolean;
}

interface VorStudentActivityProps {
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  onContinue?: () => void;
}

export function VorStudentJournal({ scenario, showConclusion = false }: VorStudentJournalProps) {
  return (
    <div className="text-[#e2e8f0]">
      <header className="border-b border-[#334155] p-4">
        <div className="flex items-center gap-2 text-[#93c5fd]">
          <ClipboardText aria-hidden size={18} />
          <h2 className="text-sm font-bold">Nhật ký học viên</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#94a3b8]">{scenario.prompt}</p>
      </header>

      {showConclusion ? (
        <div className="p-4">
          <VorStudentConclusion />
        </div>
      ) : null}
    </div>
  );
}

export function VorStudentActivity({ isSubmitting, onSubmit, onContinue }: VorStudentActivityProps) {
  const events = useVorPmdtStore((state) => state.attemptEvents);
  const answer = useVorPmdtStore((state) => state.answer);
  const updateEventAnnotation = useVorPmdtStore((state) => state.updateEventAnnotation);
  const removeEvent = useVorPmdtStore((state) => state.removeEvent);
  const [error, setError] = useState("");

  async function submit() {
    if (events.length === 0) {
      setError("Hãy mở ít nhất một màn hình kiểm tra trước khi nộp bài.");
      return;
    }
    if (!onContinue && (!answer.suspectedFault.trim() || !answer.reasoning.trim() || !answer.remediation.trim())) {
      setError("Vui lòng hoàn thành cả ba phần kết luận.");
      return;
    }
    setError("");
    if (onContinue) {
      onContinue();
      return;
    }
    await onSubmit();
  }

  return (
    <div className="flex min-h-full flex-col text-[#e2e8f0]">
      <div className="flex-1 space-y-5 p-4">
        <section aria-labelledby="activity-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="activity-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">Màn hình và thao tác đã ghi nhận</h2>
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
                    onClick={() => removeEvent(event.id)}
                    className="absolute right-2 top-2 rounded p-1 text-[#64748b] transition-colors hover:bg-[#1e293b] hover:text-[#ef4444]"
                    title="Xóa thao tác này"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex gap-2 pr-6">
                    <span className="font-mono text-[10px] text-[#60a5fa]">{String(event.sequence).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">{event.title}</p>
                      <p className="mt-1 truncate text-[10px] text-[#64748b]">{event.menuPath.join(" › ")}</p>
                      {event.eventType === "sidebar" ? (
                        <p className="mt-1 font-mono text-[10px] text-[#facc15]">
                          Kết quả: {String(event.resultValue)} · {event.resultStatus}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <label className="mt-2 grid gap-1 text-[10px] font-semibold text-[#94a3b8]">
                    Chú thích thao tác / nhận xét
                    <textarea
                      aria-label={`Chú thích ${event.title} lần ${event.sequence}`}
                      value={event.annotation}
                      onChange={(changeEvent) => updateEventAnnotation(event.id, changeEvent.target.value)}
                      rows={2}
                      className="resize-y rounded border border-[#475569] bg-[#111827] p-2 text-xs font-normal leading-5 text-white outline-none focus:border-[#60a5fa]"
                    />
                  </label>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <footer className="sticky bottom-0 border-t border-[#334155] bg-[#111827] p-4">
        {error ? <p role="alert" className="mb-3 text-xs font-medium text-[#fca5a5]">{error}</p> : null}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="pmdt-student-action-button inline-flex h-10 w-full items-center justify-center gap-1 rounded border border-[#60a5fa] bg-[#1d4ed8] px-2 text-[10px] font-semibold leading-4 text-[#f8fafc] whitespace-nowrap hover:bg-[#2563eb] disabled:cursor-wait disabled:opacity-60"
        >
          <CheckCircle aria-hidden size={17} />
          {isSubmitting ? "Đang nộp…" : onContinue ? "Bước 2 - Xác định phần cứng lỗi" : "Nộp bài cho giám khảo"}
        </button>
      </footer>
    </div>
  );
}

export function VorStudentConclusion() {
  const answer = useVorPmdtStore((state) => state.answer);
  const updateAnswer = useVorPmdtStore((state) => state.updateAnswer);

  return (
    <section aria-labelledby="conclusion-title" className="space-y-3 border-t border-[#334155] pt-5">
      <h2 id="conclusion-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">Kết luận sự cố</h2>
      <AnswerField label="Vị trí / sự cố nghi ngờ" value={answer.suspectedFault} onChange={(value) => updateAnswer({ suspectedFault: value })} />
      <AnswerField label="Căn cứ chẩn đoán" value={answer.reasoning} onChange={(value) => updateAnswer({ reasoning: value })} />
      <AnswerField label="Hướng khắc phục" value={answer.remediation} onChange={(value) => updateAnswer({ remediation: value })} />
    </section>
  );
}

function AnswerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
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
