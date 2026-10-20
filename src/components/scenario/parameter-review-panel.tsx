import { useId } from "react";
import type { ParameterReview, ParameterReviewRow } from "@/lib/ai/scenario-generation/parameter-review";

const modeLabels: Record<ParameterReview["verification"]["mode"], string> = {
  "engine-recovery": "Khôi phục bằng engine mô phỏng",
  "native-diagnosis": "Kiểm tra chẩn đoán native",
  "native-action-replay": "Phát lại thao tác native",
};

function Settings({ rows }: { rows: ParameterReviewRow[] }) {
  if (!rows.length) return <p>Không có thiết lập được ghi nhận.</p>;
  return <dl className="mt-2 grid gap-2">
    {rows.map((row, index) => <div key={`${row.fieldId}-${index}`} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-[var(--cns-border-subtle)] pb-1">
      <dt className="break-words">{row.label || row.fieldId}</dt>
      <dd className="break-all font-mono">{String(row.value)}{row.unit ? ` ${row.unit}` : ""}</dd>
    </div>)}
  </dl>;
}

function Checks({ title, checks }: { title: string; checks: ParameterReview["verification"]["initial"] }) {
  return <div className="mt-3">
    <h5 className="font-medium">{title} · {checks.filter((check) => check.passed).length}/{checks.length} đạt</h5>
    <ul className="mt-1 grid gap-1">{checks.map((check, index) => <li key={`${check.id}-${index}`} className="break-words">
      <span>{check.passed ? "Đạt" : "Chưa đạt"} · {check.id}: </span><span>{check.detail}</span>
    </li>)}</ul>
  </div>;
}

/** Examiner-only persisted summary; this does not perform or invent verification. */
export function ParameterReviewPanel({ review }: { review: ParameterReview }) {
  const titleId = useId();
  const { verification } = review;
  return <section aria-labelledby={titleId} className="mt-4 border border-[var(--cns-border-subtle)] p-3 text-[12px] leading-relaxed text-[var(--cns-text-primary)]">
    <h4 id={titleId} className="text-[13px] font-medium">Cấu hình Scenario Parameters</h4>
    <p className="mt-1 text-[var(--cns-text-secondary)]">{review.initial.length} thiết lập ban đầu · {review.recovery.length} thiết lập khôi phục</p>
    <h5 className="mt-3 font-medium">Thiết lập ban đầu</h5>
    <Settings rows={review.initial} />
    <details className="mt-3 border-t border-[var(--cns-border-subtle)] pt-2">
      <summary className="cursor-pointer font-medium">Kế hoạch khôi phục và kiểm tra</summary>
      <h5 className="mt-3 font-medium">Thiết lập khôi phục</h5>
      <Settings rows={review.recovery} />
      <p className="mt-3 font-medium">{modeLabels[verification.mode]}</p>
      <p>{verification.mode === "engine-recovery"
        ? verification.recoveryVerified ? "Đã xác minh khôi phục trong mô phỏng." : "Chưa xác minh khôi phục trong mô phỏng."
        : verification.recoveryVerified ? "Đã đạt kiểm tra native trong mô phỏng." : "Chưa đạt kiểm tra native trong mô phỏng."}</p>
      {verification.mode === "native-diagnosis" ? <p>Kiểm tra chẩn đoán không đồng nghĩa mọi cảnh báo đã hết.</p> : null}
      {verification.mode === "native-action-replay" ? <p>Phát lại thao tác không chứng minh cảm biến đã xanh trong thực tế.</p> : null}
      <Checks title="Kiểm tra ban đầu" checks={verification.initial} />
      <Checks title="Kiểm tra sau kế hoạch khôi phục" checks={verification.recovered} />
      {verification.notes.length ? <ul aria-label="Ghi chú kiểm tra" className="mt-3 list-inside list-disc">{verification.notes.map((note, index) => <li key={index} className="break-words">{note}</li>)}</ul> : null}
      <p className="mt-3 text-[var(--cns-text-secondary)]">Kết quả chỉ áp dụng trong simulator, không phải chứng nhận an toàn cho thiết bị hàng không thật. Giám khảo phải mở và kiểm tra kịch bản trước khi xuất bản.</p>
    </details>
  </section>;
}
