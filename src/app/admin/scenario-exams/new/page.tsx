import type { Metadata } from "next";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { ScenarioExamEditor } from "@/components/scenario-exams/scenario-exam-editor";

export const metadata: Metadata = { title: "Tạo kỳ thi mới" };

export default function NewScenarioExamPage() {
  return <ExamPageFrame><div className="mx-auto w-full max-w-7xl"><ExamPageHeader title="Tạo kỳ thi mới" description="Sau khi mở kỳ thi, giám khảo cấp mã và chọn các module cho từng thí sinh." /><ScenarioExamEditor /></div></ExamPageFrame>;
}
