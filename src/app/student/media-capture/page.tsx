import { notFound } from "next/navigation";
import { ExamPageFrame, ExamPageHeader } from "@/components/exams/shared";
import { StudentExamDetail } from "@/components/exams/student-exam-detail";
import { StudentExamList } from "@/components/exams/student-exam-list";
import { StudentSubjectProgress } from "@/components/exams/student-subject-progress";

const examId = "exam-capture";
const candidateSubjectId = "candidate-subject-capture";

export default async function StudentMediaCapturePage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string | string[] }>;
}) {
  if (process.env.MEDIA_CAPTURE_MODE !== "1") notFound();
  const query = await searchParams;
  const screen = Array.isArray(query.screen) ? query.screen[0] : query.screen;

  if (screen === "exam-list") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Vào thi"
          description="Chọn kỳ thi đang mở hoặc tiếp tục lượt thi đã bắt đầu. Hệ thống đối chiếu email công vụ với danh sách do hội đồng thi thiết lập."
        />
        <StudentExamList items={[{
          id: examId,
          name: "Kỳ kiểm tra năng định CNS đợt 1 năm 2026",
          examDate: "2026-08-20",
          locationLabel: "Đà Nẵng",
          decisionBasis: "Quyết định số 123/QĐ-ATTECH",
          status: "open",
          candidateName: "Nguyễn Văn An",
          subjectCount: 2,
        }]} />
      </ExamPageFrame>
    );
  }

  if (screen === "exam-detail") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Kỳ kiểm tra năng định CNS đợt 1 năm 2026"
          description="Quyết định số 123/QĐ-ATTECH | Ngày 20/08/2026 | Hội đồng thi tại Đà Nẵng"
        />
        <StudentExamDetail
          examId={examId}
          candidate={{
            fullName: "Nguyễn Văn An",
            workUnit: "Đài DVOR/DME Đà Nẵng",
            email: "thisinh@attech.com.vn",
            subjects: [
              { id: candidateSubjectId, subjectName: "Khai thác VOR/DME", paperTitle: "Đề VOR/DME số 01", status: "assigned", officialScore: null },
              { id: "candidate-subject-adsb", subjectName: "Khai thác ADS-B", paperTitle: "Đề ADS-B số 01", status: "assigned", officialScore: null },
            ],
          }}
        />
      </ExamPageFrame>
    );
  }

  if (screen === "subject-ready") {
    return (
      <ExamPageFrame>
        <ExamPageHeader title="Khai thác VOR/DME" description="Kỳ kiểm tra năng định CNS đợt 1 năm 2026" />
        <StudentSubjectProgress
          examId={examId}
          candidateSubjectId={candidateSubjectId}
          subjectName="Khai thác VOR/DME"
          paperTitle="Đề VOR/DME số 01"
          attempt={null}
        />
      </ExamPageFrame>
    );
  }

  if (screen === "subject-progress") {
    return (
      <ExamPageFrame>
        <ExamPageHeader title="Khai thác VOR/DME" description="Kỳ kiểm tra năng định CNS đợt 1 năm 2026" />
        <StudentSubjectProgress
          examId={examId}
          candidateSubjectId={candidateSubjectId}
          subjectName="Khai thác VOR/DME"
          paperTitle="Đề VOR/DME số 01"
          attempt={{
            id: "attempt-capture",
            status: "in_progress",
            items: [
              { id: "item-vor", moduleCode: "vor", scenarioTitle: "VOR - Cảnh báo giám sát Integral", position: 1, status: "in_progress" },
              { id: "item-dme", moduleCode: "dme", scenarioTitle: "DME - Mất tín hiệu Monitor", position: 2, status: "pending" },
            ],
          }}
        />
      </ExamPageFrame>
    );
  }

  if (screen === "subject-complete") {
    return (
      <ExamPageFrame>
        <ExamPageHeader title="Khai thác VOR/DME" description="Kỳ kiểm tra năng định CNS đợt 1 năm 2026" />
        <StudentSubjectProgress
          examId={examId}
          candidateSubjectId={candidateSubjectId}
          subjectName="Khai thác VOR/DME"
          paperTitle="Đề VOR/DME số 01"
          attempt={{
            id: "attempt-capture",
            status: "in_progress",
            items: [
              { id: "item-vor", moduleCode: "vor", scenarioTitle: "VOR - Cảnh báo giám sát Integral", position: 1, status: "submitted" },
              { id: "item-dme", moduleCode: "dme", scenarioTitle: "DME - Mất tín hiệu Monitor", position: 2, status: "submitted" },
            ],
          }}
        />
      </ExamPageFrame>
    );
  }

  notFound();
}
