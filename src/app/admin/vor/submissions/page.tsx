import type { Metadata } from "next";
import { VorSubmissionList } from "@/components/vor/admin/vor-submission-list";

export const metadata: Metadata = { title: "Bài nộp VOR" };

export default function VorSubmissionsPage() {
  return <VorSubmissionList />;
}
