import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { StudentExamDetail } from "@/components/exams/student-exam-detail";
import { getStudentExamDetail } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Thông tin kỳ thi" };
const locationLabels = { ha_noi: "Hà Nội", da_nang: "Đà Nẵng", tp_hcm: "TP. HCM" } as const;

export default async function StudentExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const detail = await getStudentExamDetail(examId);
  if (!detail) notFound();
  return (
    <ExamPageFrame>
      <ExamPageHeader
        title={detail.name}
        description={`${detail.decisionBasis} | Ngày ${detail.examDate.split("-").reverse().join("/")} | Hội đồng thi tại ${locationLabels[detail.location]}`}
      />
      <StudentExamDetail
        examId={detail.id}
        candidate={detail.candidate ? {
          fullName: detail.candidate.fullName,
          workUnit: detail.candidate.workUnit,
          email: detail.candidate.email,
          subjects: detail.candidate.subjects.map((subject) => ({
            id: subject.id,
            subjectName: subject.subjectName,
            paperTitle: subject.paperTitle,
            status: subject.status,
            officialScore: subject.officialScore,
          })),
        } : null}
      />
    </ExamPageFrame>
  );
}
