import type { Metadata } from "next";
import { ExamSetEditor } from "@/components/exams/exam-set-editor";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { listScenarioOptions, listSubjects } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Tạo bộ đề thi" };

export default async function NewExamSetPage() {
  const [subjects, scenarios] = await Promise.all([listSubjects(), listScenarioOptions()]);

  return (
    <ExamPageFrame>
      <ExamPageHeader
        title="Tạo bộ đề thi"
        description="Chọn môn, tạo từng đề và thêm các kịch bản tương ứng. Hãy lưu đề hiện tại trước khi tạo đề tiếp theo."
      />
      <ExamSetEditor
        subjects={subjects.filter((subject) => subject.isActive).map((subject) => ({
          id: subject.id,
          code: subject.code,
          name: subject.name,
          modules: subject.modules.map((module) => module.moduleCode),
        }))}
        scenarios={scenarios}
      />
    </ExamPageFrame>
  );
}
