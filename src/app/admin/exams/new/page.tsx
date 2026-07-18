import type { Metadata } from "next";
import { ExamEditor } from "@/components/exams/exam-editor";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { listAdminExamSets } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Tạo kỳ thi" };

export default async function NewExamPage() {
  const examSets = await listAdminExamSets();
  return (
    <ExamPageFrame>
      <ExamPageHeader
        title="Tạo kỳ thi mới"
        description="Nhập thông tin tổ chức và chọn bộ đề áp dụng. Sau khi tạo, hệ thống chuyển tới trang chi tiết để nhập giám khảo và thí sinh."
      />
      <ExamEditor examSets={examSets.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        subjectCount: item.subjectCount,
        paperCount: item.paperCount,
      }))} />
    </ExamPageFrame>
  );
}
