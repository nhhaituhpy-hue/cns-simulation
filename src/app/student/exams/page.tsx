import type { Metadata } from "next";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { StudentExamList } from "@/components/exams/student-exam-list";
import { listStudentOpenExams } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Vào thi" };
const locationLabels = { ha_noi: "Hà Nội", da_nang: "Đà Nẵng", tp_hcm: "TP. HCM" } as const;

export default async function StudentExamsPage() {
  const exams = await listStudentOpenExams();
  return (
    <ExamPageFrame>
      <ExamPageHeader title="Vào thi" description="Chọn kỳ thi đang mở hoặc tiếp tục lượt thi đã bắt đầu. Hệ thống đối chiếu email công vụ với danh sách do hội đồng thi thiết lập." />
      <StudentExamList items={exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        examDate: exam.examDate,
        locationLabel: locationLabels[exam.location],
        decisionBasis: exam.decisionBasis,
        status: exam.status,
        candidateName: exam.candidateName ?? undefined,
        subjectCount: exam.subjectCount,
      }))} />
    </ExamPageFrame>
  );
}
