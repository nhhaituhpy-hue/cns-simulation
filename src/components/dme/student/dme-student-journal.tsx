"use client";

import { CheckCircle, ClipboardText, X } from "@phosphor-icons/react";
import { useState } from "react";
import type { DmeScenario } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

interface DmeStudentJournalProps {
  scenario: DmeScenario;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  onContinue?: () => void;
}

export function DmeStudentJournal({ scenario, isSubmitting, onSubmit, onContinue }: DmeStudentJournalProps) {
  const events = useDmePmdtStore((state) => state.attemptEvents);
  const answer = useDmePmdtStore((state) => state.answer);
  const updateEventAnnotation = useDmePmdtStore((state) => state.updateEventAnnotation);
  const removeEvent = useDmePmdtStore((state) => state.removeEvent);
  const updateAnswer = useDmePmdtStore((state) => state.updateAnswer);
  const [error, setError] = useState("");

  async function submit() {
    if (events.length === 0) {
      setError("Hãy mở ít nhất một màn hình kiểm tra trước khi nộp bài.");
      return;
    }
    if (!answer.suspectedFault.trim() || !answer.reasoning.trim() || !answer.remediation.trim()) {
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
      <header className="border-b border-[#334155] p-4">
        <div className="flex items-center gap-2 text-[#93c5fd]">
          <ClipboardText aria-hidden size={18} />
          <h2 className="text-sm font-bold">Nhật ký học viên</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#94a3b8]">{scenario.prompt}</p>
      </header>

      <div className="flex-1 space-y-5 p-4">
        <section aria-labelledby="activity-title">
          <div className="flex items-center justify-between gap-2">
            <h3 id="activity-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">Màn hình và thao tác đã ghi nhận</h3>
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
                    className="absolute right-2 top-2 p-1 text-[#64748b] hover:text-[#ef4444] rounded hover:bg-[#1e293b] transition-colors"
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

        <section aria-labelledby="conclusion-title" className="space-y-3 border-t border-[#334155] pt-5">
          <h3 id="conclusion-title" className="text-xs font-bold uppercase tracking-wide text-[#cbd5e1]">Kết luận sự cố</h3>
          <AnswerField label="Vị trí / sự cố nghi ngờ" value={answer.suspectedFault} onChange={(value) => updateAnswer({ suspectedFault: value })} />
          <AnswerField label="Căn cứ chẩn đoán" value={answer.reasoning} onChange={(value) => updateAnswer({ reasoning: value })} />
          <AnswerField label="Hướng khắc phục" value={answer.remediation} onChange={(value) => updateAnswer({ remediation: value })} />
        </section>
      </div>

      <footer className="sticky bottom-0 border-t border-[#334155] bg-[#111827] p-4">
        {error ? <p role="alert" className="mb-3 text-xs font-medium text-[#fca5a5]">{error}</p> : null}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#2563eb] px-4 text-xs font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60"
        >
          <CheckCircle aria-hidden size={17} />
          {isSubmitting ? "Đang nộp…" : onContinue ? "Tiếp tục: Xác định phần cứng" : "Nộp bài cho giám khảo"}
        </button>
      </footer>
    </div>
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

