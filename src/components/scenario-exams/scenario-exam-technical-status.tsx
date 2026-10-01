import type { ScenarioExamTechnicalSummary } from "@/lib/scenario-exams/types";

export function ScenarioExamTechnicalStatus({ summary }: { summary: ScenarioExamTechnicalSummary }) {
  return <span role="status" aria-label="Trạng thái kỹ thuật bài làm" className={`text-sm font-bold ${summary.status === "SOLVED" ? "text-[var(--color-success)]" : "text-[var(--text-secondary)]"}`}>{summary.status === "UNVERIFIED" ? "CHƯA ĐỦ DỮ LIỆU" : summary.status === "IN_PROGRESS" ? "IN PROGRESS" : "SOLVED"}</span>;
}
