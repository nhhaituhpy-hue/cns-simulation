import type { Metadata } from "next";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { CandidateExamEntry } from "@/components/scenario-exams/candidate-exam-entry";
import { listCandidateOpenScenarioExams } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Vào kỳ thi Scenario" };

export default async function CandidateScenarioExamsPage() {
  const exams = await listCandidateOpenScenarioExams();
  return <ExamPageFrame><ExamPageHeader title="Thí sinh" description="Chọn kỳ thi và nhập mã code được giám khảo cấp để tạo phiên thi." /><CandidateExamEntry exams={exams} /></ExamPageFrame>;
}
