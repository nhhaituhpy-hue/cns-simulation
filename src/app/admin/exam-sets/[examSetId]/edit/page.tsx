import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamSetEditor } from "@/components/exams/exam-set-editor";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { getExamSetDetail, listScenarioOptions, listSubjects } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Chi tiết bộ đề thi" };

export default async function EditExamSetPage({ params }: { params: Promise<{ examSetId: string }> }) {
  const { examSetId } = await params;
  const [examSet, subjects, scenarios] = await Promise.all([
    getExamSetDetail(examSetId),
    listSubjects(),
    listScenarioOptions(),
  ]);
  if (!examSet) notFound();

  return (
    <ExamPageFrame>
      <ExamPageHeader
        title={examSet.isUsed ? "Chi tiết bộ đề thi" : "Chỉnh sửa bộ đề thi"}
        description={examSet.isUsed
          ? "Bộ đề đã được áp dụng cho kỳ thi và đang ở chế độ chỉ đọc."
          : "Cập nhật môn thi, đề thi và danh sách kịch bản trong từng đề."}
      />
      <ExamSetEditor
        subjects={subjects.map((subject) => ({
          id: subject.id,
          code: subject.code,
          name: subject.name,
          modules: subject.modules.map((module) => module.moduleCode),
        }))}
        scenarios={scenarios}
        readOnly={examSet.isUsed || examSet.status === "archived"}
        initialValue={{
          id: examSet.id,
          name: examSet.name,
          description: examSet.description ?? "",
          subjects: examSet.subjects.map((subject) => ({
            subjectId: subject.subjectId,
            papers: subject.papers.map((paper) => ({
              id: paper.id,
              paperNumber: paper.paperNumber,
              title: paper.title,
              scenarios: paper.scenarios.map((scenario) => ({
                moduleCode: scenario.moduleCode,
                scenarioId: scenario.scenarioId,
              })),
            })),
          })),
        }}
      />
    </ExamPageFrame>
  );
}
