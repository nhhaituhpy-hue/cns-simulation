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
  return "size-4 rounded-[4px] accent-[#0369a1] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-1 focus-visible:ring-offset-[#101922] transition-shadow";
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
    <label className="inline-flex min-h-7 cursor-pointer items-center justify-center gap-1.5 text-center select-none">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={`Chọn tất cả ${LIBRARY_LABELS[kind]}`}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className={checkboxClass()}
      />
      <span className="text-[11px] font-medium normal-case tracking-normal text-[#9AA9BC]">
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
      className="mt-6 overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#141f2a] shadow-sm"
      aria-label="Phân chia thư viện kịch bản"
    >
      <header className="flex flex-col gap-3 border-b border-white/[0.06] bg-[#141f2a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-[16px] font-semibold text-[#E6EDF5]">
            Phân chia thư viện
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#9AA9BC]">
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

      <div
        role="region"
        aria-label="Danh sách kịch bản để phân chia thư viện"
        tabIndex={0}
        className="cns-scrollbar max-h-[26rem] overflow-auto"
      >
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Phân chia kịch bản vào thư viện Ôn tập và thư viện Kiểm tra
          </caption>
          <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#101922] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA9BC]">
            <tr>
              <th
                scope="col"
                className="px-5 py-3 sm:px-6"
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
                    className="w-44 px-3 py-2 text-center"
                  >
                    <span className="block font-semibold text-[#E6EDF5]">{LIBRARY_LABELS[kind]}</span>
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
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-[13px] text-[#6B7A8D]"
                >
                  Đang tải trạng thái thư viện…
                </td>
              </tr>
            ) : available.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-[13px] text-[#6B7A8D]"
                >
                  Chưa có kịch bản để phân chia thư viện.
                </td>
              </tr>
            ) : (
              available.map((scenario) => (
                <tr
                  key={scenario.id}
                  className="transition-colors duration-150 hover:bg-white/[0.035]"
                >
                  <th
                    scope="row"
                    className="px-5 py-3.5 align-middle sm:px-6 font-normal"
                  >
                    <span className="block text-[14px] font-medium text-[#E6EDF5]">
                      {scenario.name}
                    </span>
                    <span className="mt-1 block font-mono text-[12px] text-[#6B7A8D]">
                      {scenario.scenarioId}
                    </span>
                  </th>
                  {LIBRARY_KINDS.map((kind) => (
                    <td
                      key={kind}
                      className="px-3 py-2 text-center align-middle"
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

      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-white/[0.07] bg-[#101922]/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
