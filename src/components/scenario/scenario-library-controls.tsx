"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioLibraryKind } from "@/lib/scenario-libraries";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

const LIBRARY_KINDS = ["practice", "exam"] as const satisfies readonly ScenarioLibraryKind[];

type LibraryResponse = {
  practice?: Array<{ id: string }>;
  exam?: Array<{ id: string }>;
  libraryRevisions?: { practice?: number; exam?: number };
};

type LibraryWriteResponse = {
  libraryRevision?: number;
  error?: string;
};

type LibrarySelection = Record<ScenarioLibraryKind, string[]>;

const LIBRARY_LABELS: Record<ScenarioLibraryKind, string> = {
  practice: "Thư viện Ôn tập",
  exam: "Thư viện Kiểm tra",
};

const EMPTY_SELECTION: LibrarySelection = { practice: [], exam: [] };

function buttonClass(primary = false) {
  return `inline-flex min-h-10 items-center justify-center rounded border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${primary
    ? "border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
    : "border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"}`;
}

function checkboxClass() {
  return "size-4 accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
}

function sameIds(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function libraryNames(kinds: readonly ScenarioLibraryKind[]) {
  return kinds.map((kind) => LIBRARY_LABELS[kind]).join(" và ");
}

function SelectAllCheckbox({
  kind,
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
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

  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 text-center">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={`Chọn tất cả ${LIBRARY_LABELS[kind]}`}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className={checkboxClass()}
      />
      <span className="text-[10px] font-semibold normal-case tracking-normal text-[var(--text-secondary)]">
        Chọn tất cả
      </span>
    </label>
  );
}

export function ScenarioLibraryControls({
  moduleId,
  scenarios,
}: {
  moduleId: ScenarioParametersModuleId;
  scenarios: readonly StoredScenarioParameters[];
}) {
  const [selected, setSelected] = useState<LibrarySelection>(EMPTY_SELECTION);
  const [savedSelection, setSavedSelection] =
    useState<LibrarySelection>(EMPTY_SELECTION);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [libraryRevisions, setLibraryRevisions] = useState<
    Record<ScenarioLibraryKind, number>
  >({ practice: 0, exam: 0 });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const available = useMemo(
    () => scenarios.filter((scenario) => scenario.moduleId === moduleId),
    [moduleId, scenarios],
  );
  const availableIds = useMemo(
    () => available.map((scenario) => scenario.id),
    [available],
  );
  const availableIdSet = useMemo(() => new Set(availableIds), [availableIds]);
  const selectedCounts = useMemo(
    () =>
      Object.fromEntries(
        LIBRARY_KINDS.map((kind) => [
          kind,
          availableIds.filter((id) => selected[kind].includes(id)).length,
        ]),
      ) as Record<ScenarioLibraryKind, number>,
    [availableIds, selected],
  );
  const changedKinds = useMemo(
    () =>
      LIBRARY_KINDS.filter(
        (kind) => !sameIds(selected[kind], savedSelection[kind]),
      ),
    [savedSelection, selected],
  );

  useEffect(() => {
    let cancelled = false;
    if (scenarios.length === 0) {
      setSelected(EMPTY_SELECTION);
      setSavedSelection(EMPTY_SELECTION);
      setLibraryRevisions({ practice: 0, exam: 0 });
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    fetch(
      `/api/scenario-libraries?moduleId=${encodeURIComponent(moduleId)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải trạng thái thư viện.");
        return response.json() as Promise<LibraryResponse>;
      })
      .then((payload) => {
        if (cancelled) return;
        const nextSelection: LibrarySelection = {
          practice: (payload.practice ?? []).map((item) => item.id),
          exam: (payload.exam ?? []).map((item) => item.id),
        };
        setSelected(nextSelection);
        setSavedSelection(nextSelection);
        setLibraryRevisions({
          practice: payload.libraryRevisions?.practice ?? 0,
          exam: payload.libraryRevisions?.exam ?? 0,
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải trạng thái thư viện.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId, scenarios.length]);

  function toggle(kind: ScenarioLibraryKind, id: string, checked: boolean) {
    setSelected((current) => {
      const ids = new Set(current[kind]);
      if (checked) ids.add(id);
      else ids.delete(id);
      return { ...current, [kind]: [...ids] };
    });
  }

  function toggleAll(kind: ScenarioLibraryKind, checked: boolean) {
    setSelected((current) => ({
      ...current,
      [kind]: checked
        ? [...availableIds]
        : current[kind].filter((id) => !availableIdSet.has(id)),
    }));
  }

  async function saveAll() {
    if (changedKinds.length === 0) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    const savedKinds: ScenarioLibraryKind[] = [];
    let savingKind: ScenarioLibraryKind | null = null;

    try {
      for (const kind of changedKinds) {
        savingKind = kind;
        const response = await fetch("/api/scenario-libraries", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            libraryKind: kind,
            scenarioIds: selected[kind],
            expectedRevision: libraryRevisions[kind],
          }),
        });
        const payload = (await response.json()) as LibraryWriteResponse;
        if (!response.ok) {
          throw new Error(
            payload.error ?? `Không thể cập nhật ${LIBRARY_LABELS[kind]}.`,
          );
        }

        if (typeof payload.libraryRevision === "number") {
          setLibraryRevisions((current) => ({
            ...current,
            [kind]: payload.libraryRevision!,
          }));
        }
        setSavedSelection((current) => ({
          ...current,
          [kind]: [...selected[kind]],
        }));
        savedKinds.push(kind);
        savingKind = null;
      }

      setNotice(`Đã lưu ${libraryNames(savedKinds)}.`);
    } catch (saveError) {
      const reason =
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật thư viện.";
      const partialMessage =
        savedKinds.length > 0
          ? `Đã lưu ${libraryNames(savedKinds)} nhưng chưa lưu ${savingKind ? LIBRARY_LABELS[savingKind] : "phần còn lại"}. `
          : "";
      setError(`${partialMessage}${reason}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface-subtle)]"
      aria-label="Phân chia thư viện kịch bản"
    >
      <header className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Phân chia thư viện
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Chọn thư viện cho từng kịch bản rồi lưu một lần.
          </p>
        </div>
        <p
          aria-live="polite"
          className="text-xs tabular-nums text-[var(--text-secondary)]"
        >
          {available.length} kịch bản · Ôn tập {selectedCounts.practice} · Kiểm
          tra {selectedCounts.exam}
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Phân chia kịch bản vào thư viện Ôn tập và thư viện Kiểm tra
          </caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
            <tr>
              <th
                scope="col"
                className="border-b border-[var(--border)] px-4 py-3 sm:px-5"
              >
                Tên kịch bản
              </th>
              {LIBRARY_KINDS.map((kind) => {
                const selectedCount = selectedCounts[kind];
                const allSelected =
                  available.length > 0 && selectedCount === available.length;
                const indeterminate = selectedCount > 0 && !allSelected;
                return (
                  <th
                    key={kind}
                    scope="col"
                    className="w-44 border-b border-[var(--border)] px-3 py-2 text-center"
                  >
                    <span className="block">{LIBRARY_LABELS[kind]}</span>
                    <SelectAllCheckbox
                      kind={kind}
                      checked={allSelected}
                      indeterminate={indeterminate}
                      disabled={loading || available.length === 0 || busy}
                      onChange={(checked) => toggleAll(kind, checked)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-8 text-center text-xs text-[var(--text-muted)]"
                >
                  Đang tải trạng thái thư viện…
                </td>
              </tr>
            ) : available.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-8 text-center text-xs text-[var(--text-muted)]"
                >
                  Chưa có kịch bản để phân chia thư viện.
                </td>
              </tr>
            ) : (
              available.map((scenario) => (
                <tr
                  key={scenario.id}
                  className="transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  <th
                    scope="row"
                    className="px-4 py-3 align-middle sm:px-5"
                  >
                    <span className="block font-semibold text-[var(--text-primary)]">
                      {scenario.name}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-[var(--text-muted)]">
                      {scenario.scenarioId}
                    </span>
                  </th>
                  {LIBRARY_KINDS.map((kind) => (
                    <td
                      key={kind}
                      className="px-3 py-2 text-center align-middle"
                    >
                      <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded border border-transparent transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)]">
                        <input
                          type="checkbox"
                          checked={selected[kind].includes(scenario.id)}
                          disabled={busy}
                          aria-label={`Nạp “${scenario.name}” vào ${LIBRARY_LABELS[kind]}`}
                          onChange={(event) =>
                            toggle(kind, scenario.id, event.currentTarget.checked)
                          }
                          className={checkboxClass()}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-h-5 text-xs leading-5">
          {error ? (
            <p role="alert" className="text-[#b91c1c]">
              {error}
            </p>
          ) : notice ? (
            <p role="status" className="text-[#166534]">
              {notice}
            </p>
          ) : (
            <p className="text-[var(--text-muted)]">
              {changedKinds.length > 0
                ? "Có thay đổi chưa lưu."
                : "Các thay đổi sẽ áp dụng sau khi nhấn lưu."}
            </p>
          )}
        </div>
        <button
          type="button"
          className={buttonClass(true)}
          disabled={loading || busy || available.length === 0 || changedKinds.length === 0}
          onClick={() => void saveAll()}
        >
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </footer>
    </section>
  );
}
