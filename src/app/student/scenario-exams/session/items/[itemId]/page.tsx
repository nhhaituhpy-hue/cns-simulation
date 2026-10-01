import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CandidateExamItem } from "@/components/scenario-exams/candidate-exam-item";
import { DataUnavailable, ExamPageFrame, secondaryButtonClassName } from "@/components/exams/shared";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCandidateScenarioExamItem } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Làm bài Scenario" };

export default async function CandidateScenarioExamItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect("/student/scenario-exams");
  const { itemId } = await params;
  const item = await getCandidateScenarioExamItem(itemId);
  if (!item) {
    return (
      <ExamPageFrame>
        <DataUnavailable title="Không thể mở môn thi" description="Môn thi không thuộc phiên hiện tại, đã kết thúc hoặc phiên thi đã hết thời gian." />
        <Link href="/student/scenario-exams/session" className={`${secondaryButtonClassName} mt-4`}>Quay lại phiên thi</Link>
      </ExamPageFrame>
    );
  }
  return <CandidateExamItem key={item.id} item={item} />;
}
