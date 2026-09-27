"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioLibraryKind } from "@/lib/scenario-libraries";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

type LibraryResponse = {
  practice?: Array<{ id: string }>;
  exam?: Array<{ id: string }>;
  libraryRevisions?: { practice?: number; exam?: number };
};

function buttonClass(primary = false) {
  return `inline-flex min-h-9 items-center justify-center rounded border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${primary
    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
    : "border-[var(--border-strong)] bg-transparent text-[var(--text-primary)]"}`;
}

export function ScenarioLibraryControls({
  moduleId,
  scenarios,
}: {
  moduleId: ScenarioParametersModuleId;
  scenarios: readonly StoredScenarioParameters[];
}) {
  const [selected, setSelected] = useState<Record<ScenarioLibraryKind, string[]>>({ practice: [], exam: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ScenarioLibraryKind | null>(null);
  const [libraryRevisions, setLibraryRevisions] = useState<Record<ScenarioLibraryKind, number>>({ practice: 0, exam: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const available = useMemo(() => scenarios.filter((scenario) => scenario.moduleId === moduleId), [moduleId, scenarios]);

  useEffect(() => {
    let cancelled = false;
    if (scenarios.length === 0) {
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    fetch(`/api/scenario-libraries?moduleId=${encodeURIComponent(moduleId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải trạng thái thư viện.");
        return response.json() as Promise<LibraryResponse>;
      })
      .then((payload) => {
        if (cancelled) return;
        setSelected({
          practice: (payload.practice ?? []).map((item) => item.id),
          exam: (payload.exam ?? []).map((item) => item.id),
        });
        setLibraryRevisions({
          practice: payload.libraryRevisions?.practice ?? 0,
          exam: payload.libraryRevisions?.exam ?? 0,
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Không thể tải trạng thái thư viện.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [moduleId, scenarios.length]);

  function toggle(kind: ScenarioLibraryKind, id: string, checked: boolean) {
    setSelected((current) => ({
      ...current,
      [kind]: checked
        ? [...new Set([...current[kind], id])]
        : current[kind].filter((item) => item !== id),
    }));
  }

  async function save(kind: ScenarioLibraryKind) {
    setBusy(kind);
    setMessage(null);
    try {
      const response = await fetch("/api/scenario-libraries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, libraryKind: kind, scenarioIds: selected[kind], expectedRevision: libraryRevisions[kind] }),
      });
      const payload = await response.json() as { libraryRevision?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Không thể cập nhật thư viện.");
      if (typeof payload.libraryRevision === "number") {
        setLibraryRevisions((current) => ({ ...current, [kind]: payload.libraryRevision! }));
      }
      setMessage(kind === "practice" ? "Đã cập nhật thư viện Ôn tập." : "Đã cập nhật thư viện Kiểm tra.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật thư viện.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-5 grid gap-4 rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-4 lg:grid-cols-2" aria-label="Thư viện kịch bản">
      {(["practice", "exam"] as const).map((kind) => (
        <fieldset key={kind} className="min-w-0 rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <legend className="px-1 text-sm font-bold text-[var(--text-primary)]">{kind === "practice" ? "Thư viện Ôn tập" : "Thư viện Kiểm tra"}</legend>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {kind === "practice" ? "Học viên chỉ thấy các tình huống được công bố ở đây." : "Các tình huống ở đây có thể được giáo viên chọn để giao bài kiểm tra."}
          </p>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {loading ? <p className="text-xs text-[var(--text-muted)]">Đang tải…</p> : available.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Chưa có tình huống.</p> : available.map((scenario) => (
              <label key={scenario.id} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={selected[kind].includes(scenario.id)}
                  onChange={(event) => toggle(kind, scenario.id, event.currentTarget.checked)}
                  className="mt-0.5"
                />
                <span><strong className="text-[var(--text-primary)]">{scenario.name}</strong><span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">{scenario.scenarioId}</span></span>
              </label>
            ))}
          </div>
          <button type="button" className={`mt-4 ${buttonClass(kind === "exam")}`} disabled={loading || busy !== null} onClick={() => void save(kind)}>
            {busy === kind ? "Đang lưu…" : `Lưu ${kind === "practice" ? "Ôn tập" : "Kiểm tra"}`}
          </button>
        </fieldset>
      ))}
      {message ? <p role="status" className="lg:col-span-2 text-xs text-[var(--text-secondary)]">{message}</p> : null}
    </section>
  );
}
