import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { CandidateExamSession } from "@/components/scenario-exams/candidate-exam-session";
import { getCandidateScenarioExamSession } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Phiên thi Scenario" };

export default async function CandidateScenarioExamSessionPage() {
  const session = await getCandidateScenarioExamSession();
  if (!session) redirect("/student/scenario-exams");
  return <ExamPageFrame><ExamPageHeader title="Phiên thi Scenario" description="Phiên thi được định danh bằng mã code; tài khoản Thí sinh chỉ bảo vệ quyền truy cập." /><CandidateExamSession session={session} /></ExamPageFrame>;
}
