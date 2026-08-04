"use client";

import { Archive } from "@phosphor-icons/react/dist/csr/Archive";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { archiveExamSetAction } from "@/lib/exams/actions";
import { ActionFeedback } from "./action-feedback";
import { inputClassName } from "./shared";

export interface ExamSetListItem {
  id: string;
  name: string;
  description: string;
  subjectNames: string[];
  paperCount: number;
  isUsed: boolean;
  status: "draft" | "ready" | "archived";
  updatedAt: string;
}

function normalized(value: string) {
  return value
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .trim();
}

export function ExamSetList({ items }: { items: ExamSetListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const visible = useMemo(() => {
    const keyword = normalized(query);
    if (!keyword) return items;
    return items.filter((item) =>
      normalized(`${item.name} ${item.description} ${item.subjectNames.join(" ")}`).includes(keyword),
    );
  }, [items, query]);

  function archive(item: ExamSetListItem) {
    const message = item.isUsed
      ? `Bộ đề “${item.name}” đã được sử dụng. Hệ thống sẽ lưu trữ và giữ nguyên dữ liệu tham chiếu. Tiếp tục?`
      : `Lưu trữ bộ đề “${item.name}”?`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      const result = await archiveExamSetAction(item.id);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Tìm bộ đề thi</span>
          <MagnifyingGlass aria-hidden size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên bộ đề hoặc môn thi..."
            className={`${inputClassName} pl-9`}
          />
        </label>
        <p className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">{visible.length}/{items.length} bộ đề</p>
      </div>

      {feedback ? <div className="p-4"><ActionFeedback tone="error" message={feedback} /></div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <caption className="sr-only">Danh sách bộ đề thi</caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
            <tr>
              <th className="w-16 border-b border-[var(--border)] px-4 py-3">STT</th>
              <th className="border-b border-[var(--border)] px-4 py-3">Bộ đề thi</th>
              <th className="w-56 border-b border-[var(--border)] px-4 py-3">Môn thi</th>
              <th className="w-28 border-b border-[var(--border)] px-4 py-3">Số đề</th>
              <th className="w-32 border-b border-[var(--border)] px-4 py-3">Trạng thái</th>
              <th className="w-36 border-b border-[var(--border)] px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visible.map((item, index) => (
              <tr key={item.id} className="hover:bg-[var(--surface-subtle)]">
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-[var(--text-muted)]">{index + 1}</td>
                <td className="px-4 py-3 align-top">
                  <Link href={`/admin/exam-sets/${item.id}/edit`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline">
                    {item.name}
                  </Link>
                  {item.description ? <p className="mt-1 line-clamp-2 max-w-[60ch] text-xs leading-5 text-[var(--text-secondary)]">{item.description}</p> : null}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{item.subjectNames.join(", ") || "Chưa cấu hình"}</td>
                <td className="px-4 py-3 font-mono text-sm tabular-nums text-[var(--text-secondary)]">{item.paperCount}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    item.status === "ready"
                      ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                      : item.status === "draft"
                        ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"
                        : "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                  }`}>
                    {item.status === "ready" ? "Sẵn sàng" : item.status === "draft" ? "Bản nháp" : "Đã lưu trữ"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/admin/exam-sets/${item.id}/edit`}
                      className="inline-flex size-9 items-center justify-center rounded-md text-[var(--accent)] hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      title={item.isUsed ? "Xem bộ đề" : "Sửa bộ đề"}
                    >
                      {item.isUsed ? <Eye aria-hidden size={18} /> : <NotePencil aria-hidden size={18} />}
                    </Link>
                    {item.status !== "archived" ? (
                      <button
                        type="button"
                        onClick={() => archive(item)}
                        disabled={isPending}
                        className="inline-flex size-9 items-center justify-center rounded-md text-[var(--danger)] hover:bg-[var(--danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:opacity-50"
                        title="Lưu trữ bộ đề"
                      >
                        <Archive aria-hidden size={18} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">Không tìm thấy bộ đề phù hợp.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
