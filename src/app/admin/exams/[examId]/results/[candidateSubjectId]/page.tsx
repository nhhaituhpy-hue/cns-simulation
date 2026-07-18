import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfficialExamReview } from "@/components/exams/official-exam-review";
import { getAdminCandidateSubjectReview } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Chấm bài thi chính thức" };

export default async function OfficialExamReviewPage({
  params,
}: {
  params: Promise<{ examId: string; candidateSubjectId: string }>;
}) {
  const { examId, candidateSubjectId } = await params;
  const detail = await getAdminCandidateSubjectReview(candidateSubjectId);
  if (!detail || detail.examId !== examId) notFound();
  return <OfficialExamReview detail={detail} />;
}
