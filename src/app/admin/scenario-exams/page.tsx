import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { ScenarioExamList } from "@/components/scenario-exams/scenario-exam-list";
import { ExamPageFrame, ExamPageHeader, primaryButtonClassName } from "@/components/exams/shared";
import { listScenarioExams } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Kỳ thi Scenario" };

export default async function ScenarioExamsPage() {
  const exams = await listScenarioExams();
  return <ExamPageFrame><div className="mx-auto w-full max-w-7xl"><ExamPageHeader title="Kỳ thi Scenario" description="Tạo kỳ thi, phát mã theo từng thí sinh và theo dõi tiến độ theo các module được tích." actions={<Link href="/admin/scenario-exams/new" className={primaryButtonClassName}><Plus aria-hidden size={18} /> Tạo kỳ thi</Link>} /><ScenarioExamList items={exams} /></div></ExamPageFrame>;
}
