"use client";

import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Lock } from "@phosphor-icons/react/dist/csr/Lock";
import { LockOpen } from "@phosphor-icons/react/dist/csr/LockOpen";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { issueScenarioExamCodeAction, setScenarioExamStatusAction } from "@/lib/scenario-exams/actions";
import type { ScenarioExamDetail, ScenarioExamPoolCount } from "@/lib/scenario-exams/types";
import { SCENARIO_PARAMETERS_MODULES, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/exams/shared";

const statusLabel = { draft: "Bản nháp", open: "Đang mở", locked: "Đã khóa", closed: "Đã đóng", archived: "Đã lưu trữ" } as const;

function moduleLabel(moduleId: ScenarioParametersModuleId) {
  return SCENARIO_PARAMETERS_MODULES.find((module) => module.moduleId === moduleId)?.label ?? moduleId;
}

export function ScenarioExamDetailManager({ detail, poolCounts }: { detail: ScenarioExamDetail; poolCounts: ScenarioExamPoolCount[] }) {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [candidateUnit, setCandidateUnit] = useState("");
  const [moduleIds, setModuleIds] = useState<ScenarioParametersModuleId[]>([]);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleModule(moduleId: ScenarioParametersModuleId) {
    setModuleIds((current) => current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]);
  }

  function setStatus(status: "open" | "locked" | "closed") {
    startTransition(async () => {
      const result = await setScenarioExamStatusAction(detail.id, status);
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  }

  function issueCode() {
    setIssuedCode(null);
    startTransition(async () => {
      const result = await issueScenarioExamCodeAction({ examId: detail.id, candidateName, candidateUnit, moduleIds });
      if (!result.ok || !result.data) {
        setFeedback(result.message);
        return;
      }
      setFeedback(result.message);
      setIssuedCode(result.data.code);
      setCandidateName("");
      setCandidateUnit("");
      setModuleIds([]);
      router.refresh();
    });
  }

  async function copyCode() {
    if (issuedCode) await navigator.clipboard?.writeText(issuedCode);
  }

  return (
    <div className="mt-6 grid gap-5">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-xl font-bold text-[var(--text-primary)]">{detail.name}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{detail.description || "Chưa có mô tả."}</p><p className="mt-2 text-xs text-[var(--text-muted)]">{detail.durationMinutes} phút · {detail.codeCount} mã · {detail.terminalCodeCount} đã kết thúc</p></div>
          <span className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">{statusLabel[detail.status]}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {detail.status === "draft" ? <button type="button" className={primaryButtonClassName} onClick={() => setStatus("open")} disabled={pending}><LockOpen aria-hidden size={18} /> Mở kỳ thi</button> : null}
          {detail.status === "open" ? <button type="button" className={secondaryButtonClassName} onClick={() => setStatus("locked")} disabled={pending}><Lock aria-hidden size={18} /> Khóa cấp mã mới</button> : null}
          {detail.status === "locked" ? <button type="button" className={secondaryButtonClassName} onClick={() => setStatus("open")} disabled={pending}><LockOpen aria-hidden size={18} /> Mở lại</button> : null}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Tạo mã thí sinh</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Mã không chứa thông tin cá nhân; thông tin được lưu an toàn ở server và mã chỉ hiển thị một lần.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">Tên thí sinh<input value={candidateName} onChange={(event) => setCandidateName(event.currentTarget.value)} className="h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--text-primary)]" disabled={pending || detail.status !== "open"} /></label>
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">Đơn vị<input value={candidateUnit} onChange={(event) => setCandidateUnit(event.currentTarget.value)} className="h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--text-primary)]" disabled={pending || detail.status !== "open"} /></label>
        </div>
        <fieldset className="mt-5 grid gap-2"><legend className="text-sm font-semibold text-[var(--text-secondary)]">Môn thi</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{poolCounts.map((pool) => <label key={pool.moduleId} className={`flex min-h-11 items-center justify-between gap-3 rounded border px-3 text-sm ${pool.count > 0 ? "border-[var(--border-strong)]" : "border-[var(--border)] opacity-50"}`}><span><span className="font-semibold text-[var(--text-primary)]">{moduleLabel(pool.moduleId)}</span><span className="ml-2 text-xs text-[var(--text-muted)]">{pool.count} scenario</span></span><input type="checkbox" checked={moduleIds.includes(pool.moduleId)} onChange={() => toggleModule(pool.moduleId)} disabled={pending || detail.status !== "open" || pool.count === 0} className="size-4 accent-[var(--accent)]" /></label>)}</div></fieldset>
        <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" className={primaryButtonClassName} onClick={issueCode} disabled={pending || detail.status !== "open" || !candidateName.trim() || !candidateUnit.trim() || moduleIds.length === 0}><Plus aria-hidden size={18} /> {pending ? "Đang tạo…" : "Tạo mã code"}</button>{issuedCode ? <div className="flex items-center gap-2 rounded border border-[#86efac] bg-[#f0fdf4] px-3 py-2 font-mono text-sm font-bold text-[#166534]"><span>{issuedCode}</span><button type="button" className="inline-flex size-8 items-center justify-center rounded hover:bg-[#dcfce7]" onClick={() => void copyCode()} aria-label="Sao chép mã"><Copy aria-hidden size={16} /></button></div> : null}</div>
        {feedback ? <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">{feedback}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-base font-bold text-[var(--text-primary)]">Danh sách mã</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase text-[var(--text-secondary)]"><tr><th className="px-4 py-3">Thí sinh</th><th className="px-4 py-3">Đơn vị</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Môn</th><th className="px-4 py-3">Tiến độ</th><th className="px-4 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{detail.codes.map((code) => <tr key={code.id} className={code.status === "submitted" || code.status === "timed_out" ? "bg-[#f0fdf4]" : ""}><td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{code.candidateName}</td><td className="px-4 py-3 text-[var(--text-secondary)]">{code.candidateUnit}</td><td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">••••{code.codeHint}</td><td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{code.moduleIds.map(moduleLabel).join(", ")}</td><td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{code.completedModules}/{code.moduleIds.length}</td><td className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">{code.status}</td></tr>)}{detail.codes.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">Chưa có mã thí sinh.</td></tr> : null}</tbody></table></div></section>
    </div>
  );
}
