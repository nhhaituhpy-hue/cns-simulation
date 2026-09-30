import type { Metadata } from "next";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { ScenarioExamEditor } from "@/components/scenario-exams/scenario-exam-editor";

export const metadata: Metadata = { title: "Tạo kỳ thi Scenario" };

export default function NewScenarioExamPage() {
  return <ExamPageFrame><ExamPageHeader title="Tạo kỳ thi Scenario" description="Tạo kỳ thi độc lập với luồng exam legacy. Sau khi mở kỳ thi, giám khảo cấp mã và chọn các module cho từng thí sinh." /><ScenarioExamEditor /></ExamPageFrame>;
}
