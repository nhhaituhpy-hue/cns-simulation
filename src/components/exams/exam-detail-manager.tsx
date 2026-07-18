"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteExamCandidateAction,
  saveExamCandidateAction,
  saveExamExaminersAction,
} from "@/lib/exams/actions";
import { ActionFeedback } from "./action-feedback";
import { CandidateResultEditor } from "./candidate-result-editor";
import {
  Field,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  selectClassName,
} from "./shared";

export interface ExamPaperOption {
  id: string;
  paperNumber: number;
  title: string;
}

export interface ExamSubjectPaperOption {
  id: string;
  name: string;
  papers: ExamPaperOption[];
}

export interface ExamExaminerView {
  id?: string;
  fullName: string;
  subjectId: string;
  position: number;
}

export type CandidateSubjectStatus = "assigned" | "in_progress" | "submitted" | "reviewed";

export interface ExamCandidateSubjectView {
  id: string;
  subjectId: string;
  subjectName: string;
  examPaperId: string;
  paperTitle: string;
  officialScore: number | null;
  examinerComment: string;
  status: CandidateSubjectStatus;
}

export interface ExamCandidateView {
  id: string;
  fullName: string;
  workUnit: string;
  email: string;
  subjects: ExamCandidateSubjectView[];
}

interface CandidateDraftSubject {
  key: string;
  id?: string;
  subjectId: string;
  examPaperId: string;
}

interface CandidateDraft {
  id?: string;
  fullName: string;
  workUnit: string;
  username: string;
  subjects: CandidateDraftSubject[];
}

function key() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function emptyCandidate(): CandidateDraft {
  return { fullName: "", workUnit: "", username: "", subjects: [] };
}

function candidateToDraft(candidate: ExamCandidateView): CandidateDraft {
  return {
    id: candidate.id,
    fullName: candidate.fullName,
    workUnit: candidate.workUnit,
    username: candidate.email.replace(/@attech\.com\.vn$/i, ""),
    subjects: candidate.subjects.map((subject) => ({
      key: key(),
      id: subject.id,
      subjectId: subject.subjectId,
      examPaperId: subject.examPaperId,
    })),
  };
}

function statusLabel(status: CandidateSubjectStatus) {
  return {
    assigned: "Chưa thi",
    in_progress: "Đang thi",
    submitted: "Đã nộp",
    reviewed: "Đã chấm",
  }[status];
}

function CandidateForm({
  examId,
  subjects,
  initial,
  onClose,
}: {
  examId: string;
  subjects: ExamSubjectPaperOption[];
  initial?: ExamCandidateView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CandidateDraft>(() => initial ? candidateToDraft(initial) : emptyCandidate());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addSubject() {
    const firstAvailable = subjects.find((subject) => !draft.subjects.some((item) => item.subjectId === subject.id));
    if (!firstAvailable) return;
    setDraft((current) => ({
      ...current,
      subjects: [...current.subjects, { key: key(), subjectId: firstAvailable.id, examPaperId: firstAvailable.papers[0]?.id ?? "" }],
    }));
  }

  function save() {
    const username = draft.username.trim().toLowerCase().replace(/@attech\.com\.vn$/i, "");
    if (!draft.fullName.trim() || !draft.workUnit.trim() || !username) {
      setFeedback("Họ tên, đơn vị và email thí sinh là bắt buộc.");
      return;
    }
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(username)) {
      setFeedback("Tên email ATTECH không hợp lệ.");
      return;
    }
    if (draft.subjects.length === 0) {
      setFeedback("Thí sinh phải được phân ít nhất một môn thi.");
      return;
    }
    if (draft.subjects.some((item) => !item.subjectId || !item.examPaperId)) {
      setFeedback("Vui lòng chọn đề thi tương ứng cho từng môn.");
      return;
    }
    if (new Set(draft.subjects.map((item) => item.subjectId)).size !== draft.subjects.length) {
      setFeedback("Một thí sinh không thể có hai dòng cùng môn thi.");
      return;
    }

    startTransition(async () => {
      const result = await saveExamCandidateAction({
        id: draft.id,
        examId,
        fullName: draft.fullName.trim(),
        workUnit: draft.workUnit.trim(),
        email: `${username}@attech.com.vn`,
        subjects: draft.subjects.map((item) => ({
          id: item.id,
          subjectId: item.subjectId,
          examPaperId: item.examPaperId,
        })),
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <section aria-labelledby="candidate-form-title" className="rounded-xl border border-[var(--accent-border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="candidate-form-title" className="text-base font-semibold text-[var(--text-primary)]">{initial ? "Sửa thí sinh" : "Thêm thí sinh"}</h3>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Đóng</button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Field label="Tên thí sinh" htmlFor="candidate-name" required>
          <input id="candidate-name" value={draft.fullName} onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))} className={inputClassName} disabled={isPending} />
        </Field>
        <Field label="Đơn vị" htmlFor="candidate-unit" required>
          <input id="candidate-unit" value={draft.workUnit} onChange={(event) => setDraft((current) => ({ ...current, workUnit: event.target.value }))} className={inputClassName} disabled={isPending} />
        </Field>
        <Field label="Email công vụ" htmlFor="candidate-email" required>
          <span className="relative block">
            <input
              id="candidate-email"
              value={draft.username}
              onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value.replace(/@attech\.com\.vn$/i, "") }))}
              className={`${inputClassName} pr-[8.75rem]`}
              autoComplete="off"
              disabled={isPending}
              required
              aria-required="true"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">@attech.com.vn</span>
          </span>
        </Field>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-[var(--border)] bg-white">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <caption className="sr-only">Phân môn và đề thi cho thí sinh</caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
            <tr><th className="border-b border-[var(--border)] px-3 py-2.5">Môn thi</th><th className="border-b border-[var(--border)] px-3 py-2.5">Đề thi</th><th className="w-16 border-b border-[var(--border)] px-3 py-2.5"><span className="sr-only">Xóa</span></th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {draft.subjects.map((item) => {
              const selectedSubject = subjects.find((subject) => subject.id === item.subjectId);
              return (
                <tr key={item.key}>
                  <td className="px-3 py-2.5">
                    <select
                      aria-label="Môn thi"
                      value={item.subjectId}
                      onChange={(event) => {
                        const subjectId = event.target.value;
                        const subject = subjects.find((option) => option.id === subjectId);
                        setDraft((current) => ({
                          ...current,
                          subjects: current.subjects.map((row) => row.key === item.key ? { ...row, subjectId, examPaperId: subject?.papers[0]?.id ?? "" } : row),
                        }));
                      }}
                      className={selectClassName}
                      disabled={isPending}
                    >
                      {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      aria-label="Đề thi"
                      value={item.examPaperId}
                      onChange={(event) => setDraft((current) => ({ ...current, subjects: current.subjects.map((row) => row.key === item.key ? { ...row, examPaperId: event.target.value } : row) }))}
                      className={selectClassName}
                      disabled={isPending}
                    >
                      <option value="">Chọn đề thi</option>
                      {selectedSubject?.papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title || `Đề số ${paper.paperNumber}`}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button type="button" onClick={() => setDraft((current) => ({ ...current, subjects: current.subjects.filter((row) => row.key !== item.key) }))} title="Xóa môn thi" className="inline-flex size-8 items-center justify-center rounded-md text-[var(--danger)] hover:bg-[var(--danger-muted)]" aria-label="Xóa môn thi"><Trash aria-hidden size={16} /></button>
                  </td>
                </tr>
              );
            })}
            {draft.subjects.length === 0 ? <tr><td colSpan={3} className="px-4 py-7 text-center text-sm text-[var(--text-muted)]">Chưa phân môn thi.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addSubject} disabled={isPending || draft.subjects.length >= subjects.length} className={`${secondaryButtonClassName} mt-3`}><Plus aria-hidden size={17} /> Thêm môn thi</button>

      {feedback ? <div className="mt-4"><ActionFeedback tone="error" message={feedback} /></div> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButtonClassName}>Hủy</button>
        <button type="button" onClick={save} disabled={isPending} className={primaryButtonClassName}><FloppyDisk aria-hidden size={17} /> {isPending ? "Đang lưu..." : "Lưu thí sinh"}</button>
      </div>
    </section>
  );
}

export function ExamDetailManager({
  examId,
  subjects,
  initialExaminers,
  candidates,
  currentPage,
  totalPages,
  totalCandidates,
  rosterReadOnly = false,
}: {
  examId: string;
  subjects: ExamSubjectPaperOption[];
  initialExaminers: ExamExaminerView[];
  candidates: ExamCandidateView[];
  currentPage: number;
  totalPages: number;
  totalCandidates: number;
  rosterReadOnly?: boolean;
}) {
  const router = useRouter();
  const [examiners, setExaminers] = useState<ExamExaminerView[]>(() => {
    const rowCount = Math.max(2, initialExaminers.length);
    return Array.from({ length: rowCount }, (_, index) => initialExaminers[index] ?? ({
      fullName: "",
      subjectId: subjects[0]?.id ?? "",
      position: index + 1,
    }));
  });
  const [examinerFeedback, setExaminerFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [candidateEditing, setCandidateEditing] = useState<ExamCandidateView | "new" | null>(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveExaminers() {
    const populated = examiners.filter((examiner) => examiner.fullName.trim());
    if (populated.some((examiner) => !examiner.subjectId)) {
      setExaminerFeedback({ tone: "error", message: "Vui lòng chọn môn chấm thi cho từng giám khảo đã nhập." });
      return;
    }
    startTransition(async () => {
      const result = await saveExamExaminersAction(examId, populated.map((examiner, index) => ({ ...examiner, fullName: examiner.fullName.trim(), position: index + 1 })));
      setExaminerFeedback({ tone: result.ok ? "success" : "error", message: result.message });
      if (result.ok) router.refresh();
    });
  }

  function deleteCandidate(candidate: ExamCandidateView) {
    if (!window.confirm(`Xóa thí sinh “${candidate.fullName}” khỏi kỳ thi? Nếu đã bắt đầu thi, dữ liệu sẽ được giữ và thao tác bị từ chối.`)) return;
    startTransition(async () => {
      const result = await deleteExamCandidateAction(candidate.id);
      if (!result.ok) window.alert(result.message);
      else router.refresh();
    });
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Danh sách giám khảo</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{rosterReadOnly ? "Kỳ thi đã lưu trữ; danh sách hội đồng được giữ ở chế độ chỉ đọc." : "Hai dòng được tạo sẵn. Có thể bổ sung hoặc xóa theo thực tế hội đồng."}</p>
          </div>
          {!rosterReadOnly ? <button type="button" onClick={() => setExaminers((current) => [...current, { fullName: "", subjectId: subjects[0]?.id ?? "", position: current.length + 1 }])} className={secondaryButtonClassName}><Plus aria-hidden size={17} /> Thêm giám khảo</button> : null}
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-[var(--border)]">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">Danh sách giám khảo và môn chấm thi</caption>
            <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]"><tr><th className="w-16 border-b border-[var(--border)] px-3 py-2.5">STT</th><th className="border-b border-[var(--border)] px-3 py-2.5">Tên giám khảo</th><th className="w-64 border-b border-[var(--border)] px-3 py-2.5">Bộ môn chấm thi</th><th className="w-16 border-b border-[var(--border)] px-3 py-2.5"><span className="sr-only">Xóa</span></th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {examiners.map((examiner, index) => (
                <tr key={examiner.id ?? `examiner-${index}`}>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-muted)]">{index + 1}</td>
                  <td className="px-3 py-2.5"><input aria-label={`Tên giám khảo ${index + 1}`} value={examiner.fullName} onChange={(event) => setExaminers((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, fullName: event.target.value } : item))} className={inputClassName} disabled={rosterReadOnly} /></td>
                  <td className="px-3 py-2.5"><select aria-label={`Môn chấm thi của giám khảo ${index + 1}`} value={examiner.subjectId} onChange={(event) => setExaminers((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, subjectId: event.target.value } : item))} className={selectClassName} disabled={rosterReadOnly}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></td>
                  <td className="px-3 py-2.5 text-right">{!rosterReadOnly ? <button type="button" onClick={() => setExaminers((current) => current.filter((_, rowIndex) => rowIndex !== index))} title="Xóa giám khảo" className="inline-flex size-8 items-center justify-center rounded-md text-[var(--danger)] hover:bg-[var(--danger-muted)]" aria-label={`Xóa giám khảo ${index + 1}`}><Trash aria-hidden size={16} /></button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {examinerFeedback ? <div className="mt-4"><ActionFeedback tone={examinerFeedback.tone} message={examinerFeedback.message} /></div> : null}
        {!rosterReadOnly ? <div className="mt-4 flex justify-end"><button type="button" onClick={saveExaminers} disabled={isPending} className={primaryButtonClassName}><FloppyDisk aria-hidden size={17} /> {isPending ? "Đang lưu..." : "Lưu danh sách giám khảo"}</button></div> : null}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-base font-semibold text-[var(--text-primary)]">Danh sách thí sinh</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Phân môn, đề thi và nhập kết quả chính thức cho từng thí sinh.</p></div>
          {!rosterReadOnly ? <button type="button" onClick={() => setCandidateEditing("new")} className={primaryButtonClassName}><Plus aria-hidden size={17} /> Thêm thí sinh</button> : null}
        </div>

        {candidateEditing ? (
          <div className="mt-4"><CandidateForm examId={examId} subjects={subjects} initial={candidateEditing === "new" ? undefined : candidateEditing} onClose={() => setCandidateEditing(null)} /></div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-md border border-[var(--border)]">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <caption className="sr-only">Danh sách thí sinh kỳ thi, phân trang 20 người</caption>
            <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]"><tr><th className="w-16 border-b border-[var(--border)] px-3 py-3">STT</th><th className="border-b border-[var(--border)] px-3 py-3">Thí sinh</th><th className="w-48 border-b border-[var(--border)] px-3 py-3">Đơn vị</th><th className="w-56 border-b border-[var(--border)] px-3 py-3">Email</th><th className="w-72 border-b border-[var(--border)] px-3 py-3">Môn và đề thi</th><th className="w-24 border-b border-[var(--border)] px-3 py-3">Điểm</th><th className="w-24 border-b border-[var(--border)] px-3 py-3 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {candidates.map((candidate, index) => (
                <tr key={candidate.id} className="align-top hover:bg-[var(--surface-subtle)]">
                  <td className="px-3 py-3 text-sm leading-5 text-[var(--text-muted)]">{(currentPage - 1) * 20 + index + 1}</td>
                  <td className="px-3 py-3"><p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{candidate.fullName}</p></td>
                  <td className="px-3 py-3 text-sm leading-5 text-[var(--text-secondary)]">{candidate.workUnit}</td>
                  <td className="px-3 py-3 text-sm leading-5 text-[var(--text-secondary)]">{candidate.email}</td>
                  <td className="px-3 py-3"><div className="grid gap-1.5">{candidate.subjects.map((subject) => <p key={subject.id} className="text-sm leading-5 text-[var(--text-secondary)]">{subject.subjectName} - {subject.paperTitle}</p>)}</div></td>
                  <td className="px-3 py-3 text-sm leading-5"><div className="grid gap-1.5">{candidate.subjects.map((subject) => <button key={subject.id} type="button" onClick={() => setExpandedCandidateId((current) => current === candidate.id ? null : candidate.id)} aria-expanded={expandedCandidateId === candidate.id} aria-controls={`candidate-result-${candidate.id}`} aria-label={`Mở kết quả ${subject.subjectName} của ${candidate.fullName}`} className="candidate-result-trigger m-0 block w-fit appearance-none border-0 bg-transparent p-0 text-left">{subject.officialScore === null ? statusLabel(subject.status) : `${subject.officialScore}/100`}</button>)}</div></td>
                  <td className="px-3 py-3 text-right"><div className="inline-flex align-top gap-1">{!rosterReadOnly ? <><button type="button" onClick={() => setCandidateEditing(candidate)} title="Sửa thí sinh" className="inline-flex size-5 items-center justify-center rounded text-[var(--accent)] hover:bg-[var(--accent-muted)]" aria-label={`Sửa ${candidate.fullName}`}><NotePencil aria-hidden size={16} /></button><button type="button" onClick={() => deleteCandidate(candidate)} disabled={isPending} title="Xóa thí sinh" className="inline-flex size-5 items-center justify-center rounded text-[var(--danger)] hover:bg-[var(--danger-muted)]" aria-label={`Xóa ${candidate.fullName}`}><Trash aria-hidden size={16} /></button></> : null}</div></td>
                </tr>
              ))}
              {candidates.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">Chưa có thí sinh trong kỳ thi.</td></tr> : null}
            </tbody>
          </table>
        </div>

        {expandedCandidateId ? (
          <div id={`candidate-result-${expandedCandidateId}`} className="mt-4 grid gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Kết quả chính thức do giám khảo nhập</h3>
            {candidates.find((candidate) => candidate.id === expandedCandidateId)?.subjects.map((subject) => (
              <div key={subject.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">{subject.subjectName} - {subject.paperTitle}</p>
                  {subject.status === "submitted" || subject.status === "reviewed" ? (
                    <Link href={`/admin/exams/${examId}/results/${subject.id}`} className="text-xs font-semibold text-[var(--accent)] hover:underline">Xem bài làm và bằng chứng</Link>
                  ) : null}
                </div>
                <CandidateResultEditor
                  candidateSubjectId={subject.id}
                  status={subject.status}
                  officialScore={subject.officialScore}
                  examinerComment={subject.examinerComment}
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs tabular-nums text-[var(--text-secondary)]">Trang {currentPage}/{Math.max(1, totalPages)} - {totalCandidates} thí sinh - 20 người/trang</p>
          <nav aria-label="Phân trang danh sách thí sinh" className="flex items-center gap-1">
            {currentPage <= 1
              ? <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white opacity-40"><CaretLeft aria-hidden size={16} /></span>
              : <Link href={`/admin/exams/${examId}?page=${currentPage - 1}`} aria-label="Trang trước" title="Trang trước" className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"><CaretLeft aria-hidden size={16} /></Link>}
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <Link key={page} href={`/admin/exams/${examId}?page=${page}`} aria-current={page === currentPage ? "page" : undefined} className={`inline-flex size-9 items-center justify-center rounded-md border font-mono text-xs font-semibold ${page === currentPage ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"}`}>{page}</Link>)}
            {currentPage >= totalPages
              ? <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white opacity-40"><CaretRight aria-hidden size={16} /></span>
              : <Link href={`/admin/exams/${examId}?page=${currentPage + 1}`} aria-label="Trang sau" title="Trang sau" className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"><CaretRight aria-hidden size={16} /></Link>}
          </nav>
        </div>
      </section>
    </div>
  );
}
