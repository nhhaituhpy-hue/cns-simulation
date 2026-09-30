"use client";

import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createScenarioExamAction } from "@/lib/scenario-exams/actions";
import { inputClassName, primaryButtonClassName, secondaryButtonClassName, textareaClassName, Field } from "@/components/exams/shared";

function localDateTimeToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

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
        opensAt: localDateTimeToIso(opensAt),
        closesAt: localDateTimeToIso(closesAt),
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
    <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Tên kỳ thi" htmlFor="scenario-exam-name" required>
          <input id="scenario-exam-name" value={name} onChange={(event) => setName(event.currentTarget.value)} className={inputClassName} placeholder="Năng định đợt 2 năm 2026" disabled={pending} />
        </Field>
        <Field label="Thời lượng (phút)" htmlFor="scenario-exam-duration" required hint="Tính từ lúc mã được chấp nhận và phiên thi được tạo.">
          <input id="scenario-exam-duration" type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(event.currentTarget.value)} className={inputClassName} disabled={pending} />
        </Field>
        <Field label="Mở kỳ thi" htmlFor="scenario-exam-opens-at" hint="Để trống nếu mở ngay sau khi chuyển trạng thái.">
          <input id="scenario-exam-opens-at" type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.currentTarget.value)} className={inputClassName} disabled={pending} />
        </Field>
        <Field label="Đóng kỳ thi" htmlFor="scenario-exam-closes-at">
          <input id="scenario-exam-closes-at" type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.currentTarget.value)} className={inputClassName} disabled={pending} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Mô tả" htmlFor="scenario-exam-description">
            <textarea id="scenario-exam-description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} className={textareaClassName} rows={4} disabled={pending} placeholder="Thông tin tổ chức kỳ thi..." />
          </Field>
        </div>
      </div>
      {feedback ? <p role="alert" className="mt-5 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{feedback}</p> : null}
      <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-5">
        <button type="button" className={secondaryButtonClassName} onClick={() => router.back()} disabled={pending}>Hủy</button>
        <button type="button" className={primaryButtonClassName} onClick={save} disabled={pending}><FloppyDisk aria-hidden size={18} /> {pending ? "Đang lưu…" : "Tạo kỳ thi"}</button>
      </div>
    </section>
  );
}
