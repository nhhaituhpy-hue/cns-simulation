import { NotePencil } from "@phosphor-icons/react/dist/ssr/NotePencil";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamDetailManager } from "@/components/exams/exam-detail-manager";
import { ExamPageFrame, ExamPageHeader, ExamStatusBadge, secondaryButtonClassName } from "@/components/exams/shared";
import { getAdminExamDetail } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Chi tiết kỳ thi" };
const locationLabels = { ha_noi: "Hà Nội", da_nang: "Đà Nẵng", tp_hcm: "TP. HCM" } as const;

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ examId }, query] = await Promise.all([params, searchParams]);
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const requestedPage = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const detail = await getAdminExamDetail(examId, requestedPage, 20);
  if (!detail) notFound();

  return (
    <ExamPageFrame>
      <ExamPageHeader
        title={detail.name}
        description={`${detail.decisionBasis} | ${locationLabels[detail.location]} | ${detail.examDate.split("-").reverse().join("/")} | Bộ đề: ${detail.examSetName}`}
        actions={
          <>
            <ExamStatusBadge status={detail.status} />
            {detail.status !== "archived" ? <Link href={`/admin/exams/${detail.id}/edit`} className={secondaryButtonClassName}><NotePencil aria-hidden size={17} /> Sửa thông tin</Link> : null}
          </>
        }
      />
      <ExamDetailManager
        examId={detail.id}
        subjects={detail.subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          papers: subject.papers.map((paper) => ({ id: paper.id, paperNumber: paper.paperNumber, title: paper.title })),
        }))}
        initialExaminers={detail.examiners}
        candidates={detail.candidates.items.map((candidate) => ({
          id: candidate.id,
          fullName: candidate.fullName,
          workUnit: candidate.workUnit,
          email: candidate.email,
          subjects: candidate.subjects.map((subject) => ({
            id: subject.id,
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            examPaperId: subject.examPaperId,
            paperTitle: subject.paperTitle,
            officialScore: subject.officialScore,
            examinerComment: subject.examinerComment ?? "",
            status: subject.status,
          })),
        }))}
        currentPage={detail.candidates.page}
        totalPages={detail.candidates.totalPages}
        totalCandidates={detail.candidates.total}
        rosterReadOnly={detail.status === "archived"}
      />
    </ExamPageFrame>
  );
}
