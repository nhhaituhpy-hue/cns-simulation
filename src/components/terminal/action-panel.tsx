"use client";

import {
  CheckSquare,
  Pause,
  Record,
  Square,
  Trash,
} from "@phosphor-icons/react";
import type { RecordedAction } from "@/lib/types";

export interface ActionPanelProps {
  actions: RecordedAction[];
  selectedActions: RecordedAction[];
  isRecording: boolean;
  onToggleRecording: () => void;
  onToggleSelected: (step: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  canSubmit?: boolean;
}

export function ActionPanel({
  actions,
  selectedActions,
  isRecording,
  onToggleRecording,
  onToggleSelected,
  onSelectAll,
  onClearSelection,
  onSubmit,
  submitLabel = "Nộp bài",
  canSubmit = selectedActions.length > 0,
}: ActionPanelProps) {
  const selectedSteps = new Set(selectedActions.map((action) => action.step));

  return (
    <aside className="flex min-h-[480px] min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] lg:min-h-[640px]">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">
              Thao tác đã ghi
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Đã chọn {selectedActions.length}/{actions.length} bước
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleRecording}
            aria-pressed={isRecording}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              isRecording
                ? "border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
                : "border-[var(--border-strong)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {isRecording ? (
              <Pause aria-hidden size={16} weight="fill" />
            ) : (
              <Record aria-hidden size={16} weight="fill" />
            )}
            {isRecording ? "Tạm dừng" : "Tiếp tục ghi"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={onSelectAll}
          disabled={actions.length === 0}
          className="inline-flex min-h-9 items-center gap-1.5 rounded px-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40"
        >
          <CheckSquare aria-hidden size={16} />
          Chọn tất cả
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={!canSubmit}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded px-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40"
        >
          <Trash aria-hidden size={16} />
          Bỏ chọn
        </button>
      </div>

      <div className="border-b border-[var(--border)] p-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex min-h-12 w-full items-center justify-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]"
        >
          {submitLabel}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {actions.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
            <Record aria-hidden size={28} className="text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
              Chưa có thao tác
            </p>
            <p className="mt-1 max-w-[30ch] text-xs leading-5 text-[var(--text-muted)]">
              Đăng nhập và điều hướng terminal. Các bước sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <ol>
            {actions.map((action) => {
              const selected = selectedSteps.has(action.step);
              return (
                <li key={action.step} className="border-b border-[var(--border)] last:border-b-0">
                  <label
                    className={`flex cursor-pointer items-start gap-3 border-l-2 px-4 py-3 transition-colors motion-reduce:transition-none ${
                      selected
                        ? "border-[var(--accent)] bg-sky-50"
                        : "border-transparent hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => onToggleSelected(action.step)}
                    />
                    <span className="mt-0.5 text-[var(--accent)]">
                      {selected ? (
                        <CheckSquare aria-hidden size={18} weight="fill" />
                      ) : (
                        <Square aria-hidden size={18} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">
                          {action.step}
                        </span>
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {action.input === "" ? "RETURN" : action.input}
                        </code>
                      </span>
                      <span className="mt-1 block text-sm font-medium leading-5 text-[var(--text-primary)]">
                        {action.resultLabel}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-[var(--text-muted)]">
                        {action.menuTitle}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        )}
      </div>

    </aside>
  );
}
