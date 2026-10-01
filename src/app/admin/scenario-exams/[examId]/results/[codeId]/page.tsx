import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamPageFrame } from "@/components/exams/shared";
import { ScenarioExamSubmissionReviewView } from "@/components/scenario-exams/scenario-exam-submission-review";
import { getScenarioExamSubmissionReview } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Xem bài và chấm điểm Scenario" };

export default async function ScenarioExamSubmissionReviewPage({ params }: { params: Promise<{ examId: string; codeId: string }> }) {
  const { examId, codeId } = await params;
  const review = await getScenarioExamSubmissionReview(examId, codeId);
  if (!review) notFound();
  return <ExamPageFrame><div className="mx-auto w-full max-w-7xl"><ScenarioExamSubmissionReviewView review={review} /></div></ExamPageFrame>;
}
