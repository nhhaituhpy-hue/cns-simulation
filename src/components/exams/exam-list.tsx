"use client";

import { Archive } from "@phosphor-icons/react/dist/csr/Archive";
import { Lock } from "@phosphor-icons/react/dist/csr/Lock";
import { LockOpen } from "@phosphor-icons/react/dist/csr/LockOpen";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import { UsersThree } from "@phosphor-icons/react/dist/csr/UsersThree";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { archiveExamAction, setExamStatusAction } from "@/lib/exams/actions";
import { ActionFeedback } from "./action-feedback";
import { ExamStatusBadge, inputClassName, type ExamStatus } from "./shared";

export interface ExamListItem {
  id: string;
  name: string;
  examDate: string;
  locationLabel: string;
  decisionBasis: string;
  examSetName: string;
  candidateCount: number;
  status: ExamStatus;
}

function normalized(value: string) {
  return value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").trim();
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function ExamList({ items }: { items: ExamListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const visible = useMemo(() => {
    const keyword = normalized(query);
    if (!keyword) return items;
    return items.filter((item) => normalized(`${item.name} ${item.locationLabel} ${item.decisionBasis} ${item.examSetName}`).includes(keyword));
  }, [items, query]);

  function changeStatus(item: ExamListItem) {
    const nextStatus = item.status === "open" ? "locked" : "open";
    const question = nextStatus === "locked"
      ? `Khóa kỳ thi “${item.name}”? Thí sinh chưa bắt đầu sẽ không thể vào thi.`
      : `Mở lại kỳ thi “${item.name}”?`;
    if (!window.confirm(question)) return;
    startTransition(async () => {
      const result = await setExamStatusAction(item.id, nextStatus);
      if (!result.ok) setFeedback(result.message);
      else {
        setFeedback(null);
        router.refresh();
      }
    });
  }

  function archive(item: ExamListItem) {
    if (!window.confirm(`Lưu trữ kỳ thi “${item.name}”? Dữ liệu và kết quả đã phát sinh vẫn được giữ lại.`)) return;
    startTransition(async () => {
      const result = await archiveExamAction(item.id);
      if (!result.ok) setFeedback(result.message);
      else {
        setFeedback(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">Tìm kỳ thi</span>
          <MagnifyingGlass aria-hidden size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên kỳ thi, địa điểm, quyết định..." className={`${inputClassName} pl-9`} />
        </label>
        <p className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">{visible.length}/{items.length} kỳ thi</p>
      </div>
      {feedback ? <div className="p-4"><ActionFeedback tone="error" message={feedback} /></div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <caption className="sr-only">Danh sách kỳ thi</caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
            <tr>
              <th className="w-16 border-b border-[var(--border)] px-4 py-3">STT</th>
              <th className="border-b border-[var(--border)] px-4 py-3">Kỳ thi</th>
              <th className="w-28 border-b border-[var(--border)] px-4 py-3">Ngày thi</th>
              <th className="w-32 border-b border-[var(--border)] px-4 py-3">Địa điểm</th>
              <th className="w-56 border-b border-[var(--border)] px-4 py-3">Bộ đề</th>
              <th className="w-24 border-b border-[var(--border)] px-4 py-3">Thí sinh</th>
              <th className="w-28 border-b border-[var(--border)] px-4 py-3">Trạng thái</th>
              <th className="w-44 border-b border-[var(--border)] px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visible.map((item, index) => (
              <tr key={item.id} className="hover:bg-[var(--surface-subtle)]">
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{index + 1}</td>
                <td className="px-4 py-3 align-top">
                  <Link href={`/admin/exams/${item.id}`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline">{item.name}</Link>
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">{item.decisionBasis}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-[var(--text-secondary)]">{formatDate(item.examDate)}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{item.locationLabel}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{item.examSetName}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-mono text-sm text-[var(--text-secondary)]"><UsersThree aria-hidden size={16} /> {item.candidateCount}</span></td>
                <td className="px-4 py-3"><ExamStatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {item.status !== "archived" ? <Link href={`/admin/exams/${item.id}/edit`} title="Sửa kỳ thi" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--accent)] hover:bg-[var(--accent-muted)]" aria-label={`Sửa ${item.name}`}><NotePencil aria-hidden size={18} /></Link> : null}
                    {item.status !== "archived" ? (
                      <button type="button" onClick={() => changeStatus(item)} disabled={isPending} title={item.status === "open" ? "Tạm khóa" : "Mở lại kỳ thi"} className="inline-flex size-9 items-center justify-center rounded-md text-[#92400e] hover:bg-[#fffbeb] disabled:opacity-50" aria-label={item.status === "open" ? `Khóa ${item.name}` : `Mở ${item.name}`}>
                        {item.status === "open" ? <Lock aria-hidden size={18} /> : <LockOpen aria-hidden size={18} />}
                      </button>
                    ) : null}
                    {item.status !== "archived" ? (
                      <button type="button" onClick={() => archive(item)} disabled={isPending} title="Đóng kỳ thi" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--danger)] hover:bg-[var(--danger-muted)] disabled:opacity-50" aria-label={`Lưu trữ ${item.name}`}><Archive aria-hidden size={18} /></button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">Không tìm thấy kỳ thi phù hợp.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
