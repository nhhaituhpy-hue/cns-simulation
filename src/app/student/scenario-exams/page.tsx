import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { DataUnavailable } from "@/components/exams/shared";
import { CandidateExamEntry } from "@/components/scenario-exams/candidate-exam-entry";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listCandidateOpenScenarioExams } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Vào kỳ thi Scenario" };

export default async function CandidateScenarioExamsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    return <ExamPageFrame><ExamPageHeader title="Khu vực Thí sinh" description="Phiên thi bằng mã code được mở bằng tài khoản có role Thí sinh." /><DataUnavailable title="Tài khoản hiện tại không phải tài khoản Thí sinh" description="Hãy đăng xuất và đăng nhập bằng tài khoản Thí sinh để chọn kỳ thi và nhập mã code." /></ExamPageFrame>;
  }
  const exams = await listCandidateOpenScenarioExams();
  return <ExamPageFrame><ExamPageHeader title="Thí sinh" description="Chọn kỳ thi và nhập mã code được giám khảo cấp để tạo phiên thi." /><CandidateExamEntry exams={exams} /></ExamPageFrame>;
}
