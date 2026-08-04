"use client";

import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useEffect, useRef } from "react";

type DeleteScenarioDialogProps = {
  scenarioTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteScenarioDialog({
  scenarioTitle,
  onCancel,
  onConfirm,
}: DeleteScenarioDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    return () => {
      if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-scenario-title"
      aria-describedby="delete-scenario-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text-primary)] shadow-[var(--shadow-panel)] backdrop:bg-[#171717]/30"
    >
      <div className="p-5 sm:p-6">
        <span className="inline-flex size-10 items-center justify-center rounded bg-[#fef2f2] text-[#b91c1c]">
          <Warning aria-hidden size={22} weight="regular" />
        </span>
        <h2
          id="delete-scenario-title"
          className="mt-4 text-lg font-semibold tracking-tight"
        >
          Xóa kịch bản này?
        </h2>
        <p
          id="delete-scenario-description"
          className="mt-2 text-sm leading-6 text-[var(--text-secondary)]"
        >
          Kịch bản “{scenarioTitle}” sẽ bị xóa khỏi thiết bị này. Hành động này không thể hoàn tác.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="h-10 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          Giữ lại
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 rounded bg-[#b91c1c] px-4 text-sm font-semibold text-white hover:bg-[#991b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2"
        >
          Xóa kịch bản
        </button>
      </div>
    </dialog>
  );
}
