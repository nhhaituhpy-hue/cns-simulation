import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { IdentificationCard } from "@phosphor-icons/react/dist/ssr/IdentificationCard";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import Link from "next/link";

export interface StudentSubjectView {
  id: string;
  subjectName: string;
  paperTitle: string;
  status: "assigned" | "in_progress" | "submitted" | "reviewed";
  officialScore: number | null;
}

export interface StudentCandidateView {
  fullName: string;
  workUnit: string;
  email: string;
  subjects: StudentSubjectView[];
}

function statusLabel(status: StudentSubjectView["status"]) {
  return { assigned: "Chưa bắt đầu", in_progress: "Đang thực hiện", submitted: "Đã nộp", reviewed: "Đã chấm" }[status];
}

export function StudentExamDetail({ examId, candidate }: { examId: string; candidate: StudentCandidateView | null }) {
  if (!candidate) {
    return (
      <div role="status" className="mt-6 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-5 py-10 text-center text-[#78350f]">
        <WarningCircle aria-hidden size={36} weight="duotone" className="mx-auto" />
        <h2 className="mt-4 text-base font-semibold">Không tìm thấy tên bạn trong danh sách thí sinh</h2>
        <p className="mx-auto mt-2 max-w-[64ch] text-sm leading-6">Hệ thống đã đối chiếu bằng email công vụ đang đăng nhập. Vui lòng liên hệ hội đồng thi nếu thông tin chưa chính xác.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-5">
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]"><IdentificationCard aria-hidden size={24} weight="duotone" /></span>
          <div><h2 className="text-base font-semibold text-[var(--text-primary)]">{candidate.fullName}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{candidate.workUnit}</p><p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{candidate.email}</p></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-base font-semibold text-[var(--text-primary)]">Môn thi được phân</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Chọn môn muốn thực hiện. Đề thi đã được hội đồng phân sẵn.</p></div>
        <div className="divide-y divide-[var(--border)]">
          {candidate.subjects.map((subject) => (
            <div key={subject.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-semibold text-[var(--text-primary)]">{subject.subjectName}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{subject.paperTitle}</p><p className="mt-1 text-xs font-medium text-[var(--text-muted)]">{subject.officialScore === null ? statusLabel(subject.status) : `Điểm chính thức: ${subject.officialScore}/100`}</p></div>
              <Link href={`/student/exams/${examId}/subjects/${subject.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">{subject.status === "assigned" ? "Vào thi" : subject.status === "in_progress" ? "Tiếp tục" : "Xem tiến độ"}<ArrowRight aria-hidden size={17} /></Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
