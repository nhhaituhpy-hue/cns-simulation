import type { Metadata } from "next";
import { Dvor1150aSubmissionList } from "@/modules/devices/dvor-1150a";

export const metadata: Metadata = { title: "Bài nộp VOR" };

export default function VorSubmissionsPage() {
  return <Dvor1150aSubmissionList />;
}
