import type { Metadata } from "next";
import { DmeSubmissionList } from "@/components/dme/admin/dme-submission-list";

export const metadata: Metadata = { title: "Bài nộp DME" };

export default function DmeSubmissionsPage() {
  return <DmeSubmissionList />;
}

