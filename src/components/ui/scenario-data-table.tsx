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
      <div className="flex flex-col gap-3 border-b border-white/[0.06] bg-[#141f2a] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <label htmlFor={searchId} className="relative block w-full sm:max-w-sm">
          <span className="sr-only">{searchLabel}</span>
          <MagnifyingGlass
            aria-hidden
            size={16}
            weight="regular"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A8D]"
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
            className="h-9 w-full rounded-[8px] border border-white/[0.12] bg-[#101922] pl-9 pr-3 text-[13px] text-[#E6EDF5] outline-none placeholder:text-[#6B7A8D] focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
          />
        </label>

        <p
          aria-live="polite"
          className="shrink-0 text-[12px] font-medium tabular-nums text-[#9AA9BC]"
        >
          {normalizedQuery
            ? `${filteredItems.length}/${items.length} kịch bản phù hợp`
            : `${items.length} kịch bản`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-white/[0.06] bg-[#101922] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA9BC]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`px-5 py-3 sm:px-6 ${column.className ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {visibleItems.map((item, index) => (
              <tr
                key={item.id}
                className="transition-colors duration-150 hover:bg-white/[0.035]"
              >
                {renderCells(item, startIndex + index)}
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-[13px] text-[#6B7A8D]"
                >
                  {emptySearchMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-[#141f2a] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[12px] tabular-nums text-[#9AA9BC]">
          Hiển thị {firstVisible}-{lastVisible} trong {filteredItems.length} kịch bản
        </p>

        <nav
          aria-label={`Phân trang ${caption}`}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setRequestedPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            title="Trang trước"
            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-white/[0.12] bg-white/[0.04] text-[#9AA9BC] transition duration-150 hover:bg-white/[0.08] hover:text-[#E6EDF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CaretLeft aria-hidden size={15} weight="bold" />
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setRequestedPage(pageNumber)}
                aria-label={`Mở trang ${pageNumber}`}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={`inline-flex size-8 items-center justify-center rounded-[8px] border font-mono text-[12px] font-semibold tabular-nums transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] ${
                  pageNumber === currentPage
                    ? "border-[#0369a1] bg-[#0369a1] text-white shadow-sm"
                    : "border-white/[0.12] bg-white/[0.04] text-[#9AA9BC] hover:bg-white/[0.08] hover:text-[#E6EDF5]"
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
            className="inline-flex size-8 items-center justify-center rounded-[8px] border border-white/[0.12] bg-white/[0.04] text-[#9AA9BC] transition duration-150 hover:bg-white/[0.08] hover:text-[#E6EDF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CaretRight aria-hidden size={15} weight="bold" />
          </button>
        </nav>
      </div>
    </div>
  );
}
