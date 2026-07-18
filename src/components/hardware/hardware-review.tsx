import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/csr/Circle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import type {
  EquipmentDiagram,
  HardwareDiagnosisAnswer,
  HardwareDiagnosisTask,
} from "@/lib/equipment-diagram-types";

interface HardwareReviewProps {
  diagrams: readonly EquipmentDiagram[];
  task: HardwareDiagnosisTask;
  answer: HardwareDiagnosisAnswer | undefined;
}

export function HardwareReview({ diagrams, task, answer }: HardwareReviewProps) {
  const components = new Map(
    diagrams.flatMap((diagram) => diagram.components).map((component) => [component.id, component]),
  );
  const expected = new Set(task.expectedComponentIds);
  const selected = new Set(answer?.selectedComponentIds ?? []);
  const matched = [...selected].filter((id) => expected.has(id));
  const missing = [...expected].filter((id) => !selected.has(id));
  const extra = [...selected].filter((id) => !expected.has(id));
  const label = (id: string) => components.get(id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Đáp án kịch bản</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--text-primary)]">{task.expectedComponentIds.map((id) => <li key={id}>{label(id)}</li>)}</ul>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">Loại sự cố: {task.faultType}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Học viên lựa chọn</p>
          {answer ? <ul className="mt-2 space-y-1 text-sm text-[var(--text-primary)]">{answer.selectedComponentIds.map((id) => <li key={id}>{label(id)}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-muted)]">Không có câu trả lời bước 2.</p>}
        </div>
      </div>

      {answer ? (
        <>
          <ul className="space-y-2 text-sm">
            {matched.map((id) => <li key={id} className="flex items-center gap-2 text-[#166534]"><CheckCircle aria-hidden size={18} weight="fill" />Khớp: {label(id)}</li>)}
            {missing.map((id) => <li key={id} className="flex items-center gap-2 text-[#92400e]"><Circle aria-hidden size={18} />Bỏ sót: {label(id)}</li>)}
            {extra.map((id) => <li key={id} className="flex items-center gap-2 text-[#991b1b]"><XCircle aria-hidden size={18} />Chọn thêm: {label(id)}</li>)}
          </ul>
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Căn cứ của học viên</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{answer.reasoning}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Đã xem {answer.inspectedComponentIds.length} block trước khi kết luận.</p>
          </div>
        </>
      ) : null}

      {task.adminNote ? <p className="border-l-2 border-[var(--accent)] pl-3 text-xs leading-5 text-[var(--text-secondary)]"><strong>Ghi chú admin:</strong> {task.adminNote}</p> : null}
    </div>
  );
}
