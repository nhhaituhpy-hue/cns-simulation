"use client";

import {
  Broadcast,
  ClipboardText,
  FilePlus,
  PencilSimple,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";

export function VorAdminDashboard() {
  const scenarios = useVorScenarioStore((state) => state.scenarios);
  const isHydrated = useVorScenarioStore((state) => state.isHydrated);
  const syncError = useVorScenarioStore((state) => state.syncError);
  const hydrate = useVorScenarioStore((state) => state.hydrate);
  const deleteScenario = useVorScenarioStore((state) => state.deleteScenario);
  const submissions = useVorSubmissionStore((state) => state.submissions);
  const hydrateSubmissions = useVorSubmissionStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateSubmissions();
  }, [hydrate, hydrateSubmissions]);

  const waitingCount = submissions.filter((item) => item.status === "submitted").length;

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex size-12 items-center justify-center rounded bg-[var(--accent-muted)] text-[var(--accent)]">
              <Broadcast aria-hidden size={26} weight="duotone" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              PMDT Simulator — DVOR 1150A
            </h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--text-secondary)]">
              Cấu hình dữ liệu sự cố và xây dựng các bước kiểm tra ngay trên giao diện PMDT.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/admin/vor/submissions" className="inline-flex h-10 items-center gap-2 rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]">
              <ClipboardText aria-hidden size={18} />Bài nộp{waitingCount > 0 ? ` (${waitingCount})` : ""}
            </Link>
            <Link href="/admin/vor-pmdt" className="inline-flex h-10 items-center rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]">
              Mở PMDT Simulator
            </Link>
            <Link href="/admin/vor/create" className="inline-flex h-10 items-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">
              <FilePlus aria-hidden size={18} />Tạo kịch bản VOR
            </Link>
          </div>
        </div>
      </section>

      {syncError ? (
        <div role="status" className="flex items-start gap-2 rounded border border-[#fde68a] bg-[#fffbeb] p-3 text-sm text-[#78350f]">
          <WarningCircle aria-hidden className="mt-0.5 shrink-0" size={18} />
          <span>Đang dùng dữ liệu VOR cục bộ. Supabase chưa đồng bộ: {syncError}</span>
        </div>
      ) : null}

      <section aria-labelledby="vor-scenario-list-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="vor-scenario-list-title" className="text-lg font-semibold text-[var(--text-primary)]">Kịch bản VOR</h3>
          {isHydrated ? <span className="font-mono text-xs text-[var(--text-muted)]">{scenarios.length} kịch bản</span> : null}
        </div>

        {!isHydrated ? (
          <div aria-busy="true" className="h-28 animate-pulse rounded-lg bg-[var(--surface-muted)] motion-reduce:animate-none" />
        ) : scenarios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Chưa có kịch bản VOR</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Mở PMDT authoring mode để cấu hình tình huống đầu tiên.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {scenarios.map((scenario) => (
              <li key={scenario.id} className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-[var(--text-primary)]">{scenario.title}</h4><span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">{scenario.difficulty}</span></div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{scenario.description}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{scenario.overrides.length} giá trị sự cố · {scenario.expectedCheckpoints.length} bước kiểm tra</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/admin/vor/edit?id=${encodeURIComponent(scenario.id)}`} className="inline-flex h-9 items-center gap-1.5 rounded border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"><PencilSimple aria-hidden size={16} />Sửa</Link>
                    <button type="button" onClick={() => {
                      if (window.confirm(`Xóa kịch bản “${scenario.title}”?`)) void deleteScenario(scenario.id);
                    }} className="inline-flex h-9 items-center gap-1.5 rounded px-3 text-sm font-semibold text-[#b91c1c] hover:bg-[#fef2f2]"><Trash aria-hidden size={16} />Xóa</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
