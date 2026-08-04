import type { Metadata } from "next";
import { Dme1119aSubmissionList } from "@/modules/devices/dme-1119a";

export const metadata: Metadata = { title: "Bài nộp DME" };

export default function DmeSubmissionsPage() {
  return <Dme1119aSubmissionList />;
}

