import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circuitry } from "@phosphor-icons/react/dist/csr/Circuitry";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useId } from "react";
import type { ExamHardwareEvidence, ExamHardwareItem } from "@/lib/scenario-exams/hardware-presentation";

function HardwareItems({ items, showMatch = false }: { items: readonly ExamHardwareItem[]; showMatch?: boolean }) {
  return <ul className="mt-2 space-y-2">{items.map((item) => <li key={item.key} className={`rounded border p-3 ${showMatch && item.matchesReference === true ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)]" : showMatch && item.matchesReference === false ? "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[var(--text-primary)] [overflow-wrap:anywhere]">{item.label}</p>{showMatch && item.matchesReference !== undefined ? <span className={`text-xs font-semibold ${item.matchesReference ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{item.matchesReference ? "Khớp đáp án" : "Chưa khớp đáp án"}</span> : null}</div>
    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Vị trí: {item.position}</p>
    {!item.known ? <details className="mt-1"><summary className="min-h-9 cursor-pointer content-center rounded text-xs text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]">Mã phần cứng đã lưu</summary><p className="break-all text-xs text-[var(--text-secondary)]">{item.key}</p></details> : null}
  </li>)}</ul>;
}

export function ScenarioExamHardwareEvidence({ evidence }: { evidence: ExamHardwareEvidence }) {
  const titleId = useId();
  const knownStatus = evidence.verified && evidence.hasReference && evidence.hasEvidence;
  return <section aria-labelledby={titleId} className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2"><Circuitry aria-hidden size={21} className="mt-0.5 shrink-0 text-[var(--text-secondary)]" /><div><h3 id={titleId} className="text-base font-bold text-[var(--text-primary)]">Lựa chọn khối/card trong bài nộp</h3><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Tên khối/card, vị trí và lý do xử lý được ghi nhận từ bài làm của thí sinh.</p></div></div>
      <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-bold ${!knownStatus ? "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]" : evidence.passed ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]"}`}>{knownStatus ? evidence.passed ? <CheckCircle aria-hidden weight="fill" size={16} /> : <WarningCircle aria-hidden weight="fill" size={16} /> : null}{!evidence.hasEvidence ? "Chưa có minh chứng" : !evidence.hasReference ? "Giám khảo đối chiếu" : !evidence.verified ? "Chưa đủ dữ liệu" : evidence.passed ? "Đạt" : "Chưa đạt"}</span>
    </header>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div><h4 className="text-xs font-bold text-[var(--text-secondary)]">Thí sinh lựa chọn</h4>{evidence.selected.length ? <HardwareItems items={evidence.selected} showMatch /> : <p className="mt-2 rounded border border-dashed border-[var(--border-strong)] p-3 text-sm text-[var(--text-secondary)]">{evidence.softwareOnly && evidence.dispositionConfirmed ? "Đã xác nhận không thay phần cứng." : "Chưa có lựa chọn khối/card được lưu trong bài nộp."}</p>}</div>
      <div><h4 className="text-xs font-bold text-[var(--text-secondary)]">Đáp án của Scenario đã cấp</h4>{evidence.expected.length ? <HardwareItems items={evidence.expected} /> : <p className="mt-2 rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-secondary)]">{evidence.softwareOnly ? "Hiệu chỉnh phần mềm; xác nhận không thay phần cứng." : "Scenario đã cấp chưa có đáp án khối/card để đối chiếu tự động."}</p>}</div>
    </div>
    <div className="mt-4 border-t border-[var(--border)] pt-3"><h4 className="text-xs font-bold text-[var(--text-secondary)]">Lý do xử lý phần cứng</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)] [overflow-wrap:anywhere]">{evidence.reasoning || "Chưa có lý do xử lý phần cứng được lưu."}</p></div>
    <details className="mt-3"><summary className="min-h-11 cursor-pointer content-center rounded text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]">Khối/card đã kiểm tra · {evidence.inspected.length}</summary>{evidence.inspected.length ? <HardwareItems items={evidence.inspected} /> : <p className="text-xs text-[var(--text-secondary)]">Chưa có khối/card đã kiểm tra được ghi nhận.</p>}</details>
  </section>;
}
