import { WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

export type ExamStatus = "open" | "locked" | "archived";

const STATUS_STYLES: Record<ExamStatus, { label: string; className: string }> = {
  open: {
    label: "Đang mở",
    className: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
  },
  locked: {
    label: "Đã khóa",
    className: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
  },
  archived: {
    label: "Đã lưu trữ",
    className: "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  },
};

export function ExamPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      {children}
    </div>
  );
}

export function ExamPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-[76ch] text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  const details = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-none ${details.className}`}>
      {details.label}
    </span>
  );
}

export function DataUnavailable({
  title = "Không thể tải dữ liệu",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div role="alert" className="mt-6 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-5 py-8 text-center text-[#7f1d1d]">
      <WarningCircle aria-hidden size={30} weight="duotone" className="mx-auto" />
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-[64ch] text-sm leading-6">{description}</p>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const hintId = `${htmlFor}-hint`;
  const isDirectControl = isValidElement(children)
    && (children.props as { id?: string }).id === htmlFor;
  const control = isDirectControl
    ? cloneElement(children as ReactElement<{
        required?: boolean;
        "aria-required"?: boolean;
        "aria-describedby"?: string;
      }>, {
        ...(required ? { required: true, "aria-required": true } : {}),
        ...(hint
          ? {
              "aria-describedby": [
                (children.props as { "aria-describedby"?: string })["aria-describedby"],
                hintId,
              ].filter(Boolean).join(" "),
            }
          : {}),
      })
    : children;

  return (
    <label htmlFor={htmlFor} className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">
      <span>
        {label}
        {required ? <span className="ml-1 text-[var(--danger)]" aria-hidden>*</span> : null}
      </span>
      {control}
      {hint ? <span id={hintId} className="text-xs font-normal leading-5 text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
}

export const inputClassName =
  "h-10 w-full rounded-md border border-[var(--border-strong)] bg-white px-3 text-sm font-normal text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]";

export const selectClassName = inputClassName;

export const textareaClassName =
  "min-h-24 w-full resize-y rounded-md border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm font-normal leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)]";

export const primaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none";

export const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none";

export const dangerButtonClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#fecaca] bg-white px-4 text-sm font-semibold text-[var(--danger)] transition-[background-color,transform] hover:bg-[var(--danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none";
