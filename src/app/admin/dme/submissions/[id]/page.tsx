import type { Metadata } from "next";
import { DmeSubmissionReview } from "@/components/dme/admin/dme-submission-review";

export const metadata: Metadata = { title: "Chấm bài DME" };

interface DmeSubmissionReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function DmeSubmissionReviewPage({ params }: DmeSubmissionReviewPageProps) {
  const { id } = await params;
  return <DmeSubmissionReview submissionId={id} />;
}

