"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioLibraryKind } from "@/lib/scenario-libraries";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";
import { Button, CountBadgePill } from "@/components/ui/button";

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

function checkboxClass() {
  return "size-4 rounded-[4px] border border-white/20 bg-white/5 accent-[#0284c7] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-1 focus-visible:ring-offset-[#101922] transition-shadow";
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
    <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={`Chọn tất cả ${LIBRARY_LABELS[kind]}`}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className={checkboxClass()}
      />
      <span className="text-[10px] sm:text-[11px] font-medium normal-case tracking-normal text-[#9AA9BC]">
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

    const successfulKinds: ScenarioLibraryKind[] = [];
    const nextSavedSelection = { ...savedSelection };
    const nextRevisions = { ...libraryRevisions };
    let failureReason = "";

    try {
      for (const kind of changedKinds) {
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

        const payload = (await response.json().catch(() => null)) as
          | LibraryWriteResponse
          | null;

        if (!response.ok) {
          failureReason =
            payload?.error ??
            `Không thể lưu ${LIBRARY_LABELS[kind]} (${response.status}).`;
          break;
        }

        successfulKinds.push(kind);
        nextSavedSelection[kind] = [...selected[kind]];
        if (typeof payload?.libraryRevision === "number") {
          nextRevisions[kind] = payload.libraryRevision;
        }
      }

      setSavedSelection(nextSavedSelection);
      setLibraryRevisions(nextRevisions);

      if (successfulKinds.length === changedKinds.length) {
        setNotice(`Đã lưu ${libraryNames(successfulKinds)}.`);
        return;
      }

      const partialMessage =
        successfulKinds.length > 0
          ? `Đã lưu ${libraryNames(successfulKinds)}, nhưng phần còn lại thất bại: `
          : "";
      const reason = failureReason || "Không thể lưu thay đổi thư viện.";
      setError(`${partialMessage}${reason}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-6 overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#141f2a] shadow-sm"
      aria-label="Phân chia thư viện kịch bản"
    >
      {/* Card Header: left block (title + subtitle), right block (3 chips) centered vertically together */}
      <header className="flex flex-col gap-3 border-b border-white/[0.06] bg-[#141f2a] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#E6EDF5]">
            Phân chia thư viện
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#9AA9BC]">
            Chọn thư viện cho từng kịch bản rồi lưu một lần.
          </p>
        </div>
        <div
          aria-live="polite"
          className="flex flex-wrap items-center gap-2"
        >
          <CountBadgePill>
            <span className="font-semibold text-[#E6EDF5]">{available.length}</span> kịch bản
          </CountBadgePill>
          <CountBadgePill>
            Ôn tập <span className="font-semibold text-[#E6EDF5]">{selectedCounts.practice}</span>
          </CountBadgePill>
          <CountBadgePill>
            Kiểm tra <span className="font-semibold text-[#E6EDF5]">{selectedCounts.exam}</span>
          </CountBadgePill>
        </div>
      </header>

      {/* Table Region: CSS Grid based layout with unified columns */}
      <div
        role="region"
        aria-label="Danh sách kịch bản để phân chia thư viện"
        tabIndex={0}
        className="cns-scrollbar max-h-[26rem] overflow-auto [scrollbar-gutter:stable]"
      >
        <table className="w-full border-collapse text-left text-sm table-fixed">
          <caption className="sr-only">
            Phân chia kịch bản vào thư viện Ôn tập và thư viện Kiểm tra
          </caption>
          <thead className="sticky top-0 z-10 block border-b border-white/[0.06] bg-[#101922] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA9BC]">
            <tr className="grid grid-cols-[minmax(0,1fr)_150px_150px] items-center px-6 py-2.5">
              <th
                scope="col"
                className="text-left font-semibold text-[11px] uppercase tracking-[0.06em] text-[#9AA9BC] min-w-0 pr-4"
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
                    className="flex flex-col items-center justify-center gap-1.5 text-center w-[150px] justify-self-center font-normal"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA9BC] leading-none">
                      {LIBRARY_LABELS[kind]}
                    </span>
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
          <tbody className="block divide-y divide-white/[0.05]">
            {loading ? (
              <tr className="block px-6 py-8 text-center text-[13px] text-[#6B7A8D]">
                <td colSpan={3} className="block w-full">
                  Đang tải trạng thái thư viện…
                </td>
              </tr>
            ) : available.length === 0 ? (
              <tr className="block px-6 py-8 text-center text-[13px] text-[#6B7A8D]">
                <td colSpan={3} className="block w-full">
                  Chưa có kịch bản để phân chia thư viện.
                </td>
              </tr>
            ) : (
              available.map((scenario) => (
                <tr
                  key={scenario.id}
                  className="grid grid-cols-[minmax(0,1fr)_150px_150px] items-center px-6 min-h-[60px] transition-colors duration-150 hover:bg-white/[0.04]"
                >
                  <th
                    scope="row"
                    className="text-left font-normal min-w-0 pr-4 py-3"
                  >
                    <span
                      className="block text-[14px] font-medium text-[#E6EDF5] truncate"
                      title={scenario.name}
                    >
                      {scenario.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[12px] text-[#6B7A8D]">
                      {scenario.scenarioId}
                    </span>
                  </th>
                  {LIBRARY_KINDS.map((kind) => (
                    <td
                      key={kind}
                      className="flex items-center justify-center text-center w-[150px] justify-self-center py-3"
                    >
                      <label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] border border-transparent transition-colors hover:border-white/[0.12] hover:bg-white/[0.06]">
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

      {/* Sticky Bottom Actions Bar */}
      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-white/[0.07] bg-[#101922] px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-[13px] leading-5">
          {error ? (
            <p role="alert" className="text-[#f87171]">
              {error}
            </p>
          ) : notice ? (
            <p role="status" className="text-[#4ade80]">
              {notice}
            </p>
          ) : (
            <p className="text-[#6B7A8D]">
              {changedKinds.length > 0
                ? "Có thay đổi chưa lưu."
                : "Các thay đổi sẽ áp dụng sau khi nhấn lưu."}
            </p>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          disabled={loading || busy || available.length === 0 || changedKinds.length === 0}
          onClick={() => void saveAll()}
        >
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </footer>
    </section>
  );
}
