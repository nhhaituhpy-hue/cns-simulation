import type { Metadata } from "next";
import { VorSubmissionReview } from "@/components/vor/admin/vor-submission-review";

export const metadata: Metadata = { title: "Chấm bài VOR" };

interface VorSubmissionReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function VorSubmissionReviewPage({ params }: VorSubmissionReviewPageProps) {
  const { id } = await params;
  return <VorSubmissionReview submissionId={id} />;
}
