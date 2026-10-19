"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createScenarioExamAction } from "@/lib/scenario-exams/actions";
import { inputClassName, primaryButtonClassName, secondaryButtonClassName, textareaClassName, Field } from "@/components/exams/shared";

function parseDateTimeVn(value: string): string | null {
  if (!value.trim()) return null;
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), hh ? Number(hh) : 0, mi ? Number(mi) : 0);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const fieldClassName = "grid gap-2 text-sm font-semibold text-slate-800";
const inputWithText = `${inputClassName} !bg-white !text-slate-900`;
const textareaWithText = `${textareaClassName} !bg-white !text-slate-900`;

export function ScenarioExamEditor() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const result = await createScenarioExamAction({
        name,
        description,
        opensAt: parseDateTimeVn(opensAt),
        closesAt: parseDateTimeVn(closesAt),
        durationMinutes: Number(durationMinutes),
      });
      if (!result.ok || !result.data?.id) {
        setFeedback(result.message);
        return;
      }
      router.push(`/admin/scenario-exams/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-[var(--border)] bg-[#e5e7eb] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Field label="Tên kỳ thi" htmlFor="scenario-exam-name" required hint="Tên hiển thị trong danh sách kỳ thi." className={fieldClassName}>
          <input id="scenario-exam-name" value={name} onChange={(event) => setName(event.currentTarget.value)} className={inputWithText} placeholder="Năng định đợt 2 năm 2026" disabled={pending} />
        </Field>
        <Field label="Thời lượng (phút)" htmlFor="scenario-exam-duration" required hint="Tính từ lúc mã được chấp nhận và phiên thi được tạo." className={fieldClassName}>
          <input id="scenario-exam-duration" type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(event.currentTarget.value)} className={inputWithText} disabled={pending} />
        </Field>
        <Field label="Mở kỳ thi" htmlFor="scenario-exam-opens-at" hint="Để trống nếu mở ngay sau khi chuyển trạng thái." className={fieldClassName}>
          <input id="scenario-exam-opens-at" type="text" value={opensAt} onChange={(event) => setOpensAt(event.currentTarget.value)} className={inputWithText} placeholder="dd/mm/yyyy" disabled={pending} />
        </Field>
        <Field label="Đóng kỳ thi" htmlFor="scenario-exam-closes-at" hint="Để trống nếu không giới hạn thời điểm đóng." className={fieldClassName}>
          <input id="scenario-exam-closes-at" type="text" value={closesAt} onChange={(event) => setClosesAt(event.currentTarget.value)} className={inputWithText} placeholder="dd/mm/yyyy" disabled={pending} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Mô tả" htmlFor="scenario-exam-description" className={fieldClassName}>
            <textarea id="scenario-exam-description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} className={textareaWithText} rows={4} disabled={pending} placeholder="Thông tin tổ chức kỳ thi..." />
          </Field>
        </div>
      </div>
      {feedback ? <p role="alert" className="mt-5 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{feedback}</p> : null}
      <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-5">
        <button type="button" className={`${secondaryButtonClassName} !rounded-full !border-slate-500 !bg-slate-600 !text-white hover:!bg-slate-700`} onClick={() => router.back()} disabled={pending}>Hủy</button>
        <button type="button" className={`${primaryButtonClassName} !bg-[#ea580c] hover:!bg-[#c2410c]`} onClick={save} disabled={pending}>{pending ? "Đang lưu…" : "Tạo kỳ thi"}</button>
      </div>
    </section>
  );
}
