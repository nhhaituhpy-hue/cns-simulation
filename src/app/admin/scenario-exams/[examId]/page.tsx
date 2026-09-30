import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { ScenarioExamDetailManager } from "@/components/scenario-exams/scenario-exam-detail-manager";
import { getScenarioExamDetail, listScenarioExamPoolCounts } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Chi tiết kỳ thi Scenario" };

export default async function ScenarioExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const [detail, poolCounts] = await Promise.all([getScenarioExamDetail(examId), listScenarioExamPoolCounts()]);
  if (!detail) notFound();
  return <ExamPageFrame><ExamPageHeader title={detail.name} description="Quản lý mã thí sinh, module được cấp và trạng thái hoàn tất." /><ScenarioExamDetailManager detail={detail} poolCounts={poolCounts} /></ExamPageFrame>;
}
