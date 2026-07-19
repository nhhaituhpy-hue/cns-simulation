import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamDetailManager } from "@/components/exams/exam-detail-manager";
import { ExamEditor } from "@/components/exams/exam-editor";
import { ExamList } from "@/components/exams/exam-list";
import { ExamSetEditor } from "@/components/exams/exam-set-editor";
import { ExamSetList } from "@/components/exams/exam-set-list";
import { ExamPageFrame, ExamPageHeader, ExamStatusBadge, primaryButtonClassName } from "@/components/exams/shared";

const subjects = [
  { id: "subject-vor-dme", code: "VOR-DME", name: "Khai thác VOR/DME", modules: ["vor", "dme"] as const },
  { id: "subject-ads-b", code: "ADS-B", name: "Khai thác ADS-B", modules: ["ads-b"] as const },
];

const scenarios = [
  { moduleCode: "vor" as const, scenarioId: "vor-monitor-alarm", title: "VOR - Cảnh báo giám sát Integral" },
  { moduleCode: "vor" as const, scenarioId: "vor-offset", title: "VOR - Sai lệch thông số Offset" },
  { moduleCode: "dme" as const, scenarioId: "dme-monitor", title: "DME - Mất tín hiệu Monitor" },
  { moduleCode: "dme" as const, scenarioId: "dme-vswr", title: "DME - Cảnh báo VSWR" },
  { moduleCode: "ads-b" as const, scenarioId: "adsb-cat21", title: "ADS-B - Khôi phục đầu ra CAT21" },
];

const examSets = [
  { id: "set-2026", name: "Bộ đề kiểm tra năng định CNS 2026", status: "ready" as const, subjectCount: 2, paperCount: 4 },
];

const examSubjects = [
  {
    id: "subject-vor-dme",
    name: "Khai thác VOR/DME",
    papers: [
      { id: "paper-vd-01", paperNumber: 1, title: "Đề VOR/DME số 01" },
      { id: "paper-vd-02", paperNumber: 2, title: "Đề VOR/DME số 02" },
    ],
  },
  {
    id: "subject-ads-b",
    name: "Khai thác ADS-B",
    papers: [{ id: "paper-adsb-01", paperNumber: 1, title: "Đề ADS-B số 01" }],
  },
];

export default async function AdminMediaCapturePage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string | string[] }>;
}) {
  if (process.env.MEDIA_CAPTURE_MODE !== "1") notFound();
  const query = await searchParams;
  const screen = Array.isArray(query.screen) ? query.screen[0] : query.screen;

  if (screen === "exam-set-list") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Quản lý bộ đề thi"
          description="Tổ chức các đề theo môn thi và chọn kịch bản VOR, DME hoặc ADS-B cho từng đề."
          actions={<Link href="/admin/media-capture?screen=exam-set-editor" className={primaryButtonClassName}><Plus aria-hidden size={18} /> Tạo bộ đề thi</Link>}
        />
        <ExamSetList items={[{
          id: "set-2025",
          name: "Bộ đề kiểm tra CNS năm 2025",
          description: "Bộ đề tham khảo của kỳ kiểm tra trước.",
          subjectNames: ["Khai thác VOR/DME", "Khai thác ADS-B"],
          paperCount: 4,
          isUsed: true,
          status: "ready",
          updatedAt: "2026-07-18T08:00:00.000Z",
        }]} />
      </ExamPageFrame>
    );
  }

  if (screen === "exam-set-editor") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Tạo bộ đề thi"
          description="Chọn môn, tạo từng đề và thêm các kịch bản tương ứng. Hãy lưu đề hiện tại trước khi tạo đề tiếp theo."
        />
        <ExamSetEditor subjects={subjects.map((subject) => ({ ...subject, modules: [...subject.modules] }))} scenarios={scenarios} />
      </ExamPageFrame>
    );
  }

  if (screen === "exam-list") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Quản lý kỳ thi"
          description="Tạo kỳ thi, cấu hình hội đồng, phân thí sinh vào môn và đề thi, sau đó nhập kết quả chính thức."
          actions={<Link href="/admin/media-capture?screen=exam-editor" className={primaryButtonClassName}><Plus aria-hidden size={18} /> Tạo kỳ thi</Link>}
        />
        <ExamList items={[{
          id: "exam-sample",
          name: "Kỳ kiểm tra năng định CNS đợt 1 năm 2026",
          examDate: "2026-08-20",
          locationLabel: "Đà Nẵng",
          decisionBasis: "Quyết định số 123/QĐ-ATTECH",
          examSetName: examSets[0].name,
          candidateCount: 12,
          status: "open",
        }]} />
      </ExamPageFrame>
    );
  }

  if (screen === "exam-editor") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Tạo kỳ thi mới"
          description="Nhập thông tin tổ chức và chọn bộ đề áp dụng. Sau khi tạo, hệ thống chuyển tới trang chi tiết để nhập giám khảo và thí sinh."
        />
        <ExamEditor examSets={examSets} />
      </ExamPageFrame>
    );
  }

  if (screen === "exam-detail") {
    return (
      <ExamPageFrame>
        <ExamPageHeader
          title="Kỳ kiểm tra năng định CNS đợt 1 năm 2026"
          description="Quyết định số 123/QĐ-ATTECH | Đà Nẵng | 20/08/2026 | Bộ đề: Bộ đề kiểm tra năng định CNS 2026"
          actions={<ExamStatusBadge status="open" />}
        />
        <ExamDetailManager
          examId="exam-capture"
          subjects={examSubjects}
          initialExaminers={[]}
          candidates={[]}
          currentPage={1}
          totalPages={0}
          totalCandidates={0}
        />
      </ExamPageFrame>
    );
  }

  notFound();
}
