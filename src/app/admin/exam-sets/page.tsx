import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import type { Metadata } from "next";
import Link from "next/link";
import { ExamSetList } from "@/components/exams/exam-set-list";
import { ExamPageFrame, ExamPageHeader, primaryButtonClassName } from "@/components/exams/shared";
import { listAdminExamSets } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Tạo đề thi" };

export default async function ExamSetsPage() {
  const examSets = await listAdminExamSets();

  return (
    <ExamPageFrame>
      <ExamPageHeader
        title="Quản lý bộ đề thi"
        description="Tổ chức các đề theo môn thi và chọn kịch bản VOR, DME hoặc ADS-B cho từng đề. Bộ đề đã áp dụng được giữ nguyên để bảo toàn kỳ thi."
        actions={
          <Link href="/admin/exam-sets/new" className={primaryButtonClassName}>
            <Plus aria-hidden size={18} /> Tạo bộ đề thi
          </Link>
        }
      />
      <ExamSetList
        items={examSets.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          subjectNames: item.subjectNames ?? [],
          paperCount: item.paperCount,
          isUsed: item.isUsed ?? false,
          status: item.status,
          updatedAt: item.updatedAt,
        }))}
      />
    </ExamPageFrame>
  );
}
