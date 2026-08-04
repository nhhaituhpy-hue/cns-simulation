import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import type { Metadata } from "next";
import Link from "next/link";
import { ExamList } from "@/components/exams/exam-list";
import { ExamPageFrame, primaryButtonClassName } from "@/components/exams/shared";
import { listAdminExams } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Quản lý kỳ thi" };

const locationLabels = { ha_noi: "Hà Nội", da_nang: "Đà Nẵng", tp_hcm: "TP. HCM" } as const;

export default async function ExamsPage() {
  const exams = await listAdminExams();
  return (
    <ExamPageFrame>
      <div className="flex justify-end print:hidden">
        <Link href="/admin/exams/new" className={primaryButtonClassName}><Plus aria-hidden size={18} /> Tạo kỳ thi</Link>
      </div>
      <ExamList items={exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        examDate: exam.examDate,
        locationLabel: locationLabels[exam.location],
        decisionBasis: exam.decisionBasis,
        examSetName: exam.examSetName,
        candidateCount: exam.candidateCount,
        status: exam.status,
      }))} />
    </ExamPageFrame>
  );
}
