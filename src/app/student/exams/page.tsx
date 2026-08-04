import type { Metadata } from "next";
import { ExamPageFrame } from "@/components/exams/shared";
import { StudentExamList } from "@/components/exams/student-exam-list";
import { listStudentOpenExams } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Vào thi" };
const locationLabels = { ha_noi: "Hà Nội", da_nang: "Đà Nẵng", tp_hcm: "TP. HCM" } as const;

export default async function StudentExamsPage() {
  const exams = await listStudentOpenExams();
  return (
    <ExamPageFrame>
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
