import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { StudentSubjectProgress } from "@/components/exams/student-subject-progress";
import { getStudentCandidateSubject } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Môn thi" };

export default async function StudentSubjectPage({ params }: { params: Promise<{ examId: string; candidateSubjectId: string }> }) {
  const { examId, candidateSubjectId } = await params;
  const detail = await getStudentCandidateSubject(candidateSubjectId);
  if (!detail || detail.examId !== examId) notFound();
  return (
    <ExamPageFrame>
      <ExamPageHeader title={detail.examName} description={`${detail.subjectName} | ${detail.paperTitle} | Thí sinh: ${detail.candidateName}`} />
      <StudentSubjectProgress
        examId={examId}
        candidateSubjectId={candidateSubjectId}
        subjectName={detail.subjectName}
        paperTitle={detail.paperTitle}
        attempt={detail.attempt ? {
          id: detail.attempt.id,
          status: detail.attempt.status,
          items: detail.attempt.items.map((item) => ({
            id: item.id,
            moduleCode: item.moduleCode,
            scenarioTitle: item.scenarioTitle ?? `Kịch bản ${item.position}`,
            position: item.position,
            status: item.status,
          })),
        } : null}
      />
    </ExamPageFrame>
  );
}
