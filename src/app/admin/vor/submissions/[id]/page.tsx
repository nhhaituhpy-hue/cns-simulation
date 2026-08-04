import type { Metadata } from "next";
import { Dvor1150aSubmissionReview } from "@/modules/devices/dvor-1150a";

export const metadata: Metadata = { title: "Chấm bài VOR" };

interface VorSubmissionReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function VorSubmissionReviewPage({ params }: VorSubmissionReviewPageProps) {
  const { id } = await params;
  return <Dvor1150aSubmissionReview submissionId={id} />;
}
