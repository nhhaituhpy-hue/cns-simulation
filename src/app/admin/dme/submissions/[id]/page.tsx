import type { Metadata } from "next";
import { Dme1119aSubmissionReview } from "@/modules/devices/dme-1119a";

export const metadata: Metadata = { title: "Chấm bài DME" };

interface DmeSubmissionReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function DmeSubmissionReviewPage({ params }: DmeSubmissionReviewPageProps) {
  const { id } = await params;
  return <Dme1119aSubmissionReview submissionId={id} />;
}

