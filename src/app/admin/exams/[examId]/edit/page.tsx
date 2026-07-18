import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExamEditor } from "@/components/exams/exam-editor";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { getAdminExamDetail, listAdminExamSets } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Sửa kỳ thi" };

export default async function EditExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const [detail, examSets] = await Promise.all([getAdminExamDetail(examId, 1, 1), listAdminExamSets()]);
  if (!detail) notFound();
  if (detail.status === "archived") redirect(`/admin/exams/${detail.id}`);
  return (
    <ExamPageFrame>
      <ExamPageHeader title="Sửa thông tin kỳ thi" description="Cập nhật thông tin tổ chức. Bộ đề đã chọn được giữ cố định để không làm thay đổi phân đề hiện tại." />
      <ExamEditor
        examSets={examSets.map((item) => ({ id: item.id, name: item.name, status: item.status, subjectCount: item.subjectCount, paperCount: item.paperCount }))}
        initialValue={{
          id: detail.id,
          name: detail.name,
          examDate: detail.examDate,
          location: detail.location,
          decisionBasis: detail.decisionBasis,
          examSetId: detail.examSetId,
        }}
      />
    </ExamPageFrame>
  );
}
