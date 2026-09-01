"use client";

import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlash } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { Key } from "@phosphor-icons/react/dist/csr/Key";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  changeOwnPasswordAction,
  type AuthActionResult,
} from "@/app/login/actions";

type ChangeOwnPasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
};

function PasswordField({ id, label, autoComplete, value, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-medium text-[var(--text-primary)]">
      {label}
      <span className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === "new-password" ? 8 : undefined}
          className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 pr-11 text-base text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-muted)]"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeSlash aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
        </button>
      </span>
    </label>
  );
}

export function ChangeOwnPasswordDialog({ open, onClose }: ChangeOwnPasswordDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  function closeDialog() {
    if (pending) return;
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setResult(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const response = await changeOwnPasswordAction({
        currentPassword,
        password,
        confirmPassword,
      });
      setResult(response);
      if (response.ok) {
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="change-password-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        if (open) closeDialog();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-[30rem] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-0 text-[var(--text-primary)] shadow-[var(--shadow-panel)] backdrop:bg-[var(--color-overlay)] backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            <Key aria-hidden size={21} />
          </span>
          <div>
            <h2 id="change-password-title" className="text-lg font-bold">Đổi mật khẩu</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
              Các phiên đăng nhập khác sẽ được đăng xuất để bảo vệ tài khoản.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeDialog}
          disabled={pending}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          aria-label="Đóng hộp thoại đổi mật khẩu"
        >
          <X aria-hidden size={20} />
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4 px-5 py-5">
        <PasswordField id="current-password" label="Mật khẩu hiện tại" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
        <PasswordField id="new-password" label="Mật khẩu mới" autoComplete="new-password" value={password} onChange={setPassword} />
        <PasswordField id="confirm-new-password" label="Xác nhận mật khẩu mới" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
        <p className="-mt-1 text-xs leading-5 text-[var(--text-muted)]">Ít nhất 8 ký tự, bao gồm chữ và số.</p>

        {result ? (
          <p
            role={result.ok ? "status" : "alert"}
            className={[
              "rounded-lg border px-3 py-2.5 text-sm",
              result.ok
                ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]"
                : "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--danger)]",
            ].join(" ")}
          >
            {result.message}
          </p>
        ) : null}

        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeDialog}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
