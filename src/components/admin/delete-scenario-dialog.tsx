"use client";

import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

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
      className="m-auto w-[min(30rem,calc(100%-2rem))] overflow-hidden rounded-[12px] border border-[var(--cns-btn-ghost-border)] bg-[var(--cns-surface-card)] p-0 text-[var(--cns-text-primary)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <span className="inline-flex size-10 items-center justify-center rounded-[8px] border border-red-500/25 bg-red-500/10 text-red-400">
          <Warning aria-hidden size={22} weight="regular" />
        </span>
        <h2
          id="delete-scenario-title"
          className="mt-4 text-[18px] font-semibold tracking-tight text-[var(--cns-text-primary)]"
        >
          Xóa kịch bản này?
        </h2>
        <p
          id="delete-scenario-description"
          className="mt-2 text-[13px] leading-relaxed text-[var(--cns-text-secondary)]"
        >
          Kịch bản “{scenarioTitle}” sẽ bị xóa khỏi thiết bị này. Hành động này không thể hoàn tác.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2.5 border-t border-[var(--cns-border-subtle)] bg-[var(--cns-surface-table-header)] px-6 py-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          autoFocus
          variant="secondary"
          size="md"
          onClick={onCancel}
        >
          Giữ lại
        </Button>
        <Button
          type="button"
          variant="danger"
          size="md"
          onClick={onConfirm}
        >
          Xóa kịch bản
        </Button>
      </div>
    </dialog>
  );
}
