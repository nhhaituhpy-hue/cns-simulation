"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioLibraryKind } from "@/lib/scenario-libraries";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";
import { CountBadgePill } from "@/components/ui/button";

const LIBRARY_KINDS = ["practice", "exam"] as const satisfies readonly ScenarioLibraryKind[];
const LIBRARY_LABELS: Record<ScenarioLibraryKind, string> = {
  practice: "Thư viện Ôn tập",
  exam: "Thư viện Kiểm tra",
};
const LIBRARY_TITLES: Record<ScenarioLibraryKind, string> = { practice: "Ôn tập", exam: "Kiểm tra" };
type LibrarySelection = Record<ScenarioLibraryKind, string[]>;
type LibrarySnapshot = { selected: LibrarySelection; revisions: Record<ScenarioLibraryKind, number> };
const EMPTY_SNAPSHOT: LibrarySnapshot = { selected: { practice: [], exam: [] }, revisions: { practice: 0, exam: 0 } };

type LibraryControlsState = {
  selected: LibrarySelection;
  selectedCounts: Record<ScenarioLibraryKind, number>;
  availableCount: number;
  disabled: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  toggle: (kind: ScenarioLibraryKind, id: string, checked: boolean) => void;
  toggleAll: (kind: ScenarioLibraryKind, checked: boolean) => void;
};
const LibraryControlsContext = createContext<LibraryControlsState | null>(null);
function useLibraryControls() {
  const value = useContext(LibraryControlsContext);
  if (!value) throw new Error("Library controls require ScenarioLibraryControls.");
  return value;
}

function checkboxClass() {
  return "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-slate-400 bg-slate-200 transition-colors checked:border-[#0284c7] checked:bg-[#0284c7] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-1 focus-visible:ring-offset-[#e5e7eb] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[10px] after:font-bold after:text-white after:content-['✓'] after:opacity-0 checked:after:opacity-100";
}

async function readLibraries(moduleId: ScenarioParametersModuleId): Promise<LibrarySnapshot> {
  const response = await fetch(`/api/scenario-libraries?moduleId=${encodeURIComponent(moduleId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Không thể tải trạng thái thư viện. Hãy tải lại trang.");
  const payload = await response.json();
  const selected = {} as LibrarySelection;
  const revisions = {} as LibrarySnapshot["revisions"];
  for (const kind of LIBRARY_KINDS) {
    if (!Array.isArray(payload?.[kind]) || payload[kind].some((item: { id?: unknown } | null) => !item || typeof item.id !== "string") || !Number.isInteger(payload?.libraryRevisions?.[kind]) || payload.libraryRevisions[kind] < 0) {
      throw new Error("Trạng thái thư viện không hợp lệ. Hãy tải lại trang.");
    }
    selected[kind] = payload[kind].map((item: { id: string }) => item.id);
    revisions[kind] = payload.libraryRevisions[kind];
  }
  return { selected, revisions };
}

function SelectAllCheckbox({ kind, checked, indeterminate, disabled, onChange }: {
  kind: ScenarioLibraryKind;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <label className="inline-flex size-8 cursor-pointer select-none items-center justify-center">
    <input ref={inputRef} type="checkbox" checked={checked} disabled={disabled}
      aria-label={`Chọn tất cả ${LIBRARY_LABELS[kind]}`}
      title={`Chọn tất cả ${LIBRARY_TITLES[kind]}`}
      onChange={event => onChange(event.currentTarget.checked)} className={checkboxClass()} />
  </label>;
}

export function ScenarioLibraryControls({ moduleId, scenarios, disabled = false, children }: {
  moduleId: ScenarioParametersModuleId;
  scenarios: readonly StoredScenarioParameters[];
  disabled?: boolean;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(EMPTY_SNAPSHOT);
  const [selected, setSelected] = useState<LibrarySelection>(EMPTY_SNAPSHOT.selected);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const epoch = useRef(0);
  const saveLock = useRef(false);
  const availableIds = useMemo(() => scenarios.filter(s => s.moduleId === moduleId).map(s => s.id), [scenarios, moduleId]);
  const idsKey = JSON.stringify(availableIds);
  const selectedCounts = {
    practice: availableIds.filter(id => selected.practice.includes(id)).length,
    exam: availableIds.filter(id => selected.exam.includes(id)).length,
  };

  useEffect(() => {
    const currentEpoch = ++epoch.current;
    setLoading(true);
    setReady(false);
    setError(null);
    setNotice(null);
    setBusy(false);
    saveLock.current = false;
    readLibraries(moduleId).then(next => {
      if (currentEpoch !== epoch.current) return;
      setSnapshot(next);
      setSelected(next.selected);
      setReady(true);
    }).catch((reason: unknown) => {
      if (currentEpoch === epoch.current) setError(reason instanceof Error ? reason.message : "Không thể tải trạng thái thư viện.");
    }).finally(() => {
      if (currentEpoch === epoch.current) setLoading(false);
    });
    return () => { epoch.current = currentEpoch + 1; };
  }, [moduleId, idsKey]);

  async function save(kind: ScenarioLibraryKind, changedIds: string[], checked: boolean) {
    if (!ready || loading || disabled || saveLock.current) return;
    const currentEpoch = epoch.current;
    saveLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const optimistic = new Set(snapshot.selected[kind]);
    for (const id of changedIds) {
      if (checked) optimistic.add(id); else optimistic.delete(id);
    }
    setSelected({ ...snapshot.selected, [kind]: [...optimistic] });
    try {
      const response = await fetch("/api/scenario-libraries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, libraryKind: kind, scenarioIds: changedIds, selected: checked, expectedRevision: snapshot.revisions[kind] }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(typeof payload?.error === "string" ? payload.error : `Không thể lưu ${LIBRARY_LABELS[kind]} (${response.status}).`);
      }
      const next = await readLibraries(moduleId);
      if (currentEpoch !== epoch.current) return;
      setSnapshot(next);
      setSelected(next.selected);
      setNotice(`Đã tự lưu ${LIBRARY_LABELS[kind]}.`);
    } catch (reason: unknown) {
      if (currentEpoch !== epoch.current) return;
      // A lost response can follow a committed write. Refresh rather than retrying or pretending rollback.
      try {
        const next = await readLibraries(moduleId);
        if (currentEpoch !== epoch.current) return;
        setSnapshot(next);
        setSelected(next.selected);
      } catch {
        if (currentEpoch !== epoch.current) return;
        setSelected(snapshot.selected);
        setReady(false);
      }
      setError(`${reason instanceof Error ? reason.message : "Không thể lưu thư viện."} Trạng thái đã được đối chiếu lại; nếu chưa tải được, hãy tải lại trang.`);
    } finally {
      if (currentEpoch === epoch.current) {
        saveLock.current = false;
        setBusy(false);
      }
    }
  }

  function toggle(kind: ScenarioLibraryKind, id: string, checked: boolean) {
    if (!availableIds.includes(id)) return;
    void save(kind, [id], checked);
  }
  function toggleAll(kind: ScenarioLibraryKind, checked: boolean) {
    if (availableIds.length > 0) void save(kind, availableIds, checked);
  }

  return <LibraryControlsContext.Provider value={{ selected, selectedCounts, availableCount: availableIds.length,
    disabled: disabled || !ready || loading || busy, loading, busy, error, notice, toggle, toggleAll }}>
    {children}
  </LibraryControlsContext.Provider>;
}

export function useScenarioLibraryBusy() {
  return useLibraryControls().busy;
}

export function ScenarioLibraryColumnHeading({ kind }: { kind: ScenarioLibraryKind }) {
  const controls = useLibraryControls();
  const count = controls.selectedCounts[kind];
  const all = controls.availableCount > 0 && count === controls.availableCount;
  return <div className="flex flex-col items-center justify-center gap-0.5">
    <span className="block whitespace-nowrap text-[11px] font-semibold normal-case leading-4 tracking-normal">{LIBRARY_TITLES[kind]}</span>
    <SelectAllCheckbox kind={kind} checked={all} indeterminate={count > 0 && !all}
      disabled={controls.disabled || controls.availableCount === 0} onChange={checked => controls.toggleAll(kind, checked)} />
  </div>;
}

export function ScenarioLibraryColumnHeaders() {
  return LIBRARY_KINDS.map(kind => <th key={kind} scope="col" className="w-24 min-w-24 px-2 py-3 text-center">
    <ScenarioLibraryColumnHeading kind={kind} />
  </th>);
}

export function ScenarioLibraryCells({ scenario, disabled = false }: { scenario: Pick<StoredScenarioParameters, "id" | "name">; disabled?: boolean }) {
  const controls = useLibraryControls();
  return LIBRARY_KINDS.map(kind => <td key={kind} className="px-2 py-3.5 text-center align-middle">
    <label className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md">
      <input type="checkbox" checked={controls.selected[kind].includes(scenario.id)} disabled={disabled || controls.disabled}
        aria-label={`Nạp “${scenario.name}” vào ${LIBRARY_LABELS[kind]}`}
        onChange={event => controls.toggle(kind, scenario.id, event.currentTarget.checked)} className={checkboxClass()} />
    </label>
  </td>);
}

export function ScenarioLibraryStatus() {
  const controls = useLibraryControls();
  return <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cns-border-subtle)] bg-[var(--cns-surface-table-header)] px-4 py-3 text-[13px] sm:px-6">
    <div className="flex gap-2">
      <CountBadgePill>Ôn tập {controls.selectedCounts.practice}</CountBadgePill>
      <CountBadgePill>Kiểm tra {controls.selectedCounts.exam}</CountBadgePill>
    </div>
    {controls.error ? <p role="alert" className="text-[var(--color-danger)]">{controls.error}</p>
      : <p role="status" className={controls.notice ? "text-[var(--color-success)]" : "text-[var(--cns-text-muted)]"}>
        {controls.loading ? "Đang tải trạng thái thư viện…" : controls.busy ? "Đang lưu…" : controls.notice ?? "Tích hoặc bỏ tích để tự lưu vào thư viện."}
      </p>}
  </footer>;
}
