import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DataUnavailable, ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { CandidateExamSession } from "@/components/scenario-exams/candidate-exam-session";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCandidateScenarioExamSession } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Phiên thi Scenario" };

export default async function CandidateScenarioExamSessionPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    return <ExamPageFrame><ExamPageHeader title="Khu vực Thí sinh" description="Phiên thi bằng mã code được mở bằng tài khoản có role Thí sinh." /><DataUnavailable title="Tài khoản hiện tại không phải tài khoản Thí sinh" description="Hãy đăng nhập bằng tài khoản Thí sinh để tiếp tục phiên thi." /></ExamPageFrame>;
  }
  const session = await getCandidateScenarioExamSession();
  if (!session) redirect("/student/scenario-exams");
  return <ExamPageFrame><ExamPageHeader title="Phiên thi Scenario" description="Phiên thi được định danh bằng mã code; tài khoản Thí sinh chỉ bảo vệ quyền truy cập." /><CandidateExamSession session={session} /></ExamPageFrame>;
}
