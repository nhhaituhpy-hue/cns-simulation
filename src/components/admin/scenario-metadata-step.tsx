import type { ScenarioDifficulty } from "@/lib/types";
import type {
  ScenarioDraft,
  ValidationErrors,
} from "./scenario-form-utils";

type ScenarioMetadataStepProps = {
  draft: ScenarioDraft;
  errors: ValidationErrors;
  onChange: (changes: Partial<ScenarioDraft>) => void;
};

const difficulties: Array<{
  value: ScenarioDifficulty;
  label: string;
  description: string;
}> = [
  {
    value: "easy",
    label: "Cơ bản",
    description: "Luồng thao tác ngắn, phù hợp làm quen hệ thống.",
  },
  {
    value: "medium",
    label: "Trung bình",
    description: "Nhiều menu và bước kiểm tra liên tiếp.",
  },
  {
    value: "hard",
    label: "Nâng cao",
    description: "Chuỗi xử lý dài, yêu cầu hiểu rõ ngữ cảnh.",
  },
];

export function ScenarioMetadataStep({
  draft,
  errors,
  onChange,
}: ScenarioMetadataStepProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <label
          htmlFor="scenario-title"
          className="text-sm font-semibold text-[var(--text-primary)]"
        >
          Tiêu đề kịch bản
        </label>
        <input
          id="scenario-title"
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
          maxLength={100}
          autoComplete="off"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "scenario-title-error" : undefined}
          className="h-11 rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="Ví dụ: Khôi phục kết nối Sensor A"
        />
        {errors.title ? (
          <p id="scenario-title-error" role="alert" className="text-sm text-[#b91c1c]">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="scenario-description"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            Mô tả
          </label>
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {draft.description.length}/500
          </span>
        </div>
        <textarea
          id="scenario-description"
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          maxLength={500}
          rows={5}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "scenario-description-error" : undefined
          }
          className="resize-y rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="Mô tả tình huống, dấu hiệu lỗi và mục tiêu đào tạo."
        />
        {errors.description ? (
          <p
            id="scenario-description-error"
            role="alert"
            className="text-sm text-[#b91c1c]"
          >
            {errors.description}
          </p>
        ) : null}
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-[var(--text-primary)]">
          Mức độ
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {difficulties.map((difficulty) => (
            <label
              key={difficulty.value}
              className={`cursor-pointer rounded-lg border p-4 transition-[border-color,background-color,box-shadow] focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 ${
                draft.difficulty === difficulty.value
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <input
                  type="radio"
                  name="difficulty"
                  value={difficulty.value}
                  checked={draft.difficulty === difficulty.value}
                  onChange={() => onChange({ difficulty: difficulty.value })}
                  className="size-4 accent-[var(--accent)]"
                />
                {difficulty.label}
              </span>
              <span className="mt-2 block text-xs leading-5 text-[var(--text-secondary)]">
                {difficulty.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
