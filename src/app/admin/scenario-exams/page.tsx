import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { ScenarioExamList } from "@/components/scenario-exams/scenario-exam-list";
import { ExamPageFrame, ExamPageHeader, primaryButtonClassName } from "@/components/exams/shared";
import { listScenarioExams } from "@/lib/scenario-exams/queries";

export const metadata: Metadata = { title: "Quản lý kỳ thi" };

export default async function ScenarioExamsPage() {
  const exams = await listScenarioExams();
  return <ExamPageFrame><div className="mx-auto w-full max-w-7xl"><ExamPageHeader title="Quản lý kỳ thi" description="Tạo kỳ thi, phát mã theo từng thí sinh và theo dõi tiến độ theo các module được tích." actions={<Link href="/admin/scenario-exams/new" className={`${primaryButtonClassName} !bg-[#ea580c] hover:!bg-[#c2410c]`}><Plus aria-hidden size={18} /> Tạo kỳ thi</Link>} /><ScenarioExamList items={exams} /></div></ExamPageFrame>;
}
