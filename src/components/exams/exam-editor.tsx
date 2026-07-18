"use client";

import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveExamAction } from "@/lib/exams/actions";
import { ActionFeedback } from "./action-feedback";
import {
  Field,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  selectClassName,
} from "./shared";

export interface ExamEditorValue {
  id?: string;
  name: string;
  examDate: string;
  location: "ha_noi" | "da_nang" | "tp_hcm";
  decisionBasis: string;
  examSetId: string;
}

export interface ExamSetPickerOption {
  id: string;
  name: string;
  status: "draft" | "ready" | "archived";
  subjectCount: number;
  paperCount: number;
}

const EMPTY_EXAM: ExamEditorValue = {
  name: "",
  examDate: "",
  location: "ha_noi",
  decisionBasis: "",
  examSetId: "",
};

export function ExamEditor({
  examSets,
  initialValue,
}: {
  examSets: ExamSetPickerOption[];
  initialValue?: ExamEditorValue;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ExamEditorValue>(initialValue ?? EMPTY_EXAM);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function update<K extends keyof ExamEditorValue>(field: K, fieldValue: ExamEditorValue[K]) {
    setValue((current) => ({ ...current, [field]: fieldValue }));
    setFeedback(null);
  }

  function save() {
    if (!value.name.trim()) {
      setFeedback("Vui lòng nhập tên kỳ thi.");
      return;
    }
    if (!value.examDate) {
      setFeedback("Vui lòng chọn ngày thi.");
      return;
    }
    if (!value.decisionBasis.trim()) {
      setFeedback("Vui lòng nhập căn cứ hoặc số quyết định.");
      return;
    }
    if (!value.examSetId) {
      setFeedback("Vui lòng chọn bộ đề thi áp dụng.");
      return;
    }

    startTransition(async () => {
      const result = await saveExamAction({
        ...value,
        name: value.name.trim(),
        decisionBasis: value.decisionBasis.trim(),
      });
      if (!result.ok || !result.data?.id) {
        setFeedback(result.message || "Không thể lưu kỳ thi.");
        return;
      }
      router.push(`/admin/exams/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Tên kỳ thi" htmlFor="exam-name" required>
          <input
            id="exam-name"
            value={value.name}
            onChange={(event) => update("name", event.target.value)}
            className={inputClassName}
            placeholder="Ví dụ: Kỳ kiểm tra năng định CNS đợt 1 năm 2026"
            disabled={isPending}
          />
        </Field>

        <Field label="Ngày thi" htmlFor="exam-date" required>
          <input
            id="exam-date"
            type="date"
            value={value.examDate}
            onChange={(event) => update("examDate", event.target.value)}
            className={inputClassName}
            disabled={isPending}
          />
        </Field>

        <Field label="Hội đồng thi tổ chức tại" htmlFor="exam-location" required>
          <select
            id="exam-location"
            value={value.location}
            onChange={(event) => update("location", event.target.value as ExamEditorValue["location"])}
            className={selectClassName}
            disabled={isPending}
          >
            <option value="ha_noi">Hà Nội</option>
            <option value="da_nang">Đà Nẵng</option>
            <option value="tp_hcm">TP. HCM</option>
          </select>
        </Field>

        <Field label="Căn cứ" htmlFor="exam-decision" required hint="Nhập đầy đủ số, ngày hoặc tên văn bản làm căn cứ tổ chức kỳ thi.">
          <input
            id="exam-decision"
            value={value.decisionBasis}
            onChange={(event) => update("decisionBasis", event.target.value)}
            className={inputClassName}
            placeholder="Quyết định số..."
            disabled={isPending}
          />
        </Field>

        <div className="lg:col-span-2">
          <Field label="Bộ đề thi áp dụng" htmlFor="exam-set" required hint="Chỉ các bộ đề đã hoàn thiện mới có thể áp dụng cho kỳ thi mới.">
            <select
              id="exam-set"
              value={value.examSetId}
              onChange={(event) => update("examSetId", event.target.value)}
              className={selectClassName}
              disabled={isPending || Boolean(initialValue?.id)}
            >
              <option value="">Chọn bộ đề thi</option>
              {examSets.filter((item) => item.status === "ready" || item.id === initialValue?.examSetId).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.subjectCount} môn, {item.paperCount} đề)
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {feedback ? <div className="mt-5"><ActionFeedback tone="error" message={feedback} /></div> : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-5">
        <button type="button" onClick={() => router.back()} className={secondaryButtonClassName}>Hủy</button>
        <button type="button" onClick={save} disabled={isPending} className={primaryButtonClassName}>
          <FloppyDisk aria-hidden size={18} /> {isPending ? "Đang lưu..." : initialValue?.id ? "Lưu thay đổi" : "Tạo kỳ thi"}
        </button>
      </div>
    </div>
  );
}
