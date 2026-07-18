"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useId, useMemo, useState, type ReactNode } from "react";

export const SCENARIOS_PER_PAGE = 10;

export type ScenarioTableColumn = {
  id: string;
  label: string;
  className?: string;
};

type ScenarioDataTableProps<T extends { id: string; title: string }> = {
  items: T[];
  caption: string;
  columns: ScenarioTableColumn[];
  renderCells: (item: T, rowIndex: number) => ReactNode;
  searchLabel?: string;
  emptySearchMessage?: string;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

export function ScenarioDataTable<T extends { id: string; title: string }>({
  items,
  caption,
  columns,
  renderCells,
  searchLabel = "Tìm nhanh theo tiêu đề kịch bản",
  emptySearchMessage = "Không tìm thấy kịch bản phù hợp với tiêu đề đã nhập.",
}: ScenarioDataTableProps<T>) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const normalizedQuery = normalizeSearchValue(query);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      normalizeSearchValue(item.title).includes(normalizedQuery),
    );
  }, [items, normalizedQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / SCENARIOS_PER_PAGE),
  );
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * SCENARIOS_PER_PAGE;
  const visibleItems = filteredItems.slice(
    startIndex,
    startIndex + SCENARIOS_PER_PAGE,
  );
  const firstVisible = filteredItems.length === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(
    startIndex + SCENARIOS_PER_PAGE,
    filteredItems.length,
  );

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <label htmlFor={searchId} className="relative block w-full sm:max-w-sm">
          <span className="sr-only">{searchLabel}</span>
          <MagnifyingGlass
            aria-hidden
            size={17}
            weight="regular"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setRequestedPage(1);
            }}
            placeholder="Tìm theo tiêu đề kịch bản..."
            className="h-10 w-full rounded-md border border-[var(--border-strong)] bg-white pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
          />
        </label>

        <p
          aria-live="polite"
          className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-secondary)]"
        >
          {normalizedQuery
            ? `${filteredItems.length}/${items.length} kịch bản phù hợp`
            : `${items.length} kịch bản`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`border-b border-[var(--border)] px-4 py-3 ${column.className ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visibleItems.map((item, index) => (
              <tr
                key={item.id}
                className="transition-colors hover:bg-[var(--surface-subtle)]"
              >
                {renderCells(item, startIndex + index)}
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
                >
                  {emptySearchMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs tabular-nums text-[var(--text-secondary)]">
          Hiển thị {firstVisible}-{lastVisible} trong {filteredItems.length} kịch bản
        </p>

        <nav
          aria-label={`Phân trang ${caption}`}
          className="flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setRequestedPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            title="Trang trước"
            className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CaretLeft aria-hidden size={16} weight="bold" />
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setRequestedPage(pageNumber)}
                aria-label={`Mở trang ${pageNumber}`}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={`inline-flex size-9 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  pageNumber === currentPage
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() =>
              setRequestedPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            aria-label="Trang sau"
            title="Trang sau"
            className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CaretRight aria-hidden size={16} weight="bold" />
          </button>
        </nav>
      </div>
    </div>
  );
}
