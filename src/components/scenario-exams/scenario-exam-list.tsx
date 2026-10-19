"use client";

import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ScenarioExamSummary } from "@/lib/scenario-exams/types";
import { formatScenarioExamDate } from "@/lib/scenario-exams/presentation";
import { inputClassName, primaryButtonClassName } from "@/components/exams/shared";
import { ScenarioExamAvailabilityBadge } from "./scenario-exam-availability-badge";

export function ScenarioExamList({ items }: { items: ScenarioExamSummary[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi-VN");
    return normalized ? items.filter((item) => item.name.toLocaleLowerCase("vi-VN").includes(normalized)) : items;
  }, [items, query]);

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">Tìm kỳ thi Scenario</span>
          <MagnifyingGlass aria-hidden size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Tìm tên kỳ thi..." className={`${inputClassName} pl-9`} />
        </label>
        <span className="text-xs tabular-nums text-[var(--text-secondary)]">{visible.length}/{items.length} kỳ thi</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <caption className="sr-only">Danh sách kỳ thi bằng mã code</caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
            <tr>
              <th className="w-16 border-b border-[var(--border)] px-4 py-3">STT</th>
              <th className="border-b border-[var(--border)] px-4 py-3">Kỳ thi</th>
              <th className="w-56 border-b border-[var(--border)] px-4 py-3">Lịch thi (giờ Việt Nam)</th>
              <th className="w-32 border-b border-[var(--border)] px-4 py-3">Thời lượng</th>
              <th className="w-36 border-b border-[var(--border)] px-4 py-3">Mã / hoàn tất</th>
              <th className="w-44 border-b border-[var(--border)] px-4 py-3">Trạng thái</th>
              <th className="w-20 border-b border-[var(--border)] px-4 py-3"><span className="sr-only">Mở</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visible.map((item, index) => (
              <tr key={item.id} className="bg-[#e5e7eb] hover:bg-[#d1d5db]">
                <td className="px-4 py-4 font-mono text-xs text-slate-600">{index + 1}</td>
                <td className="px-4 py-4">
                  <Link href={`/admin/scenario-exams/${item.id}`} className="font-semibold text-slate-900 hover:text-[#0284c7] hover:underline">{item.name}</Link>
                </td>
                <td className="px-4 py-4 text-xs text-slate-700"><p>Mở: {formatScenarioExamDate(item.opensAt, "Khi mở kỳ thi")}</p><p className="mt-1">Đóng: {formatScenarioExamDate(item.closesAt)}</p></td>
                <td className="px-4 py-4 font-mono text-xs text-slate-700">{item.durationMinutes} phút</td>
                <td className="px-4 py-4 text-sm text-slate-700">{item.codeCount} / {item.terminalCodeCount}</td>
                <td className="px-4 py-4"><ScenarioExamAvailabilityBadge availability={item.availability} /></td>
                <td className="px-4 py-4 text-right"><Link href={`/admin/scenario-exams/${item.id}`} className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-100" aria-label={`Mở ${item.name}`}><ArrowRight aria-hidden size={18} /></Link></td>
              </tr>
            ))}
            {visible.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-600 bg-[#e5e7eb]">Chưa có kỳ thi phù hợp.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-[var(--border)] p-3">
        <Link href="/admin/scenario-exams/new" className={`${primaryButtonClassName} !bg-[#ea580c] hover:!bg-[#c2410c]`}><Plus aria-hidden size={18} /> Tạo kỳ thi</Link>
      </div>
    </section>
  );
}
