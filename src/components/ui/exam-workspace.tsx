import {
  Broadcast,
  GearSix,
  Student,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

export type CnsModule = "vor" | "dme" | "ads-b";
export type WorkspaceRole = "admin" | "student";

const moduleLabels: Record<CnsModule, string> = {
  vor: "VOR",
  dme: "DME",
  "ads-b": "ADS-B",
};

const roleDetails: Record<
  WorkspaceRole,
  { label: string; eyebrow: string; icon: Icon }
> = {
  admin: {
    label: "Giám khảo",
    eyebrow: "Quản trị kỳ kiểm tra",
    icon: GearSix,
  },
  student: {
    label: "Thí sinh",
    eyebrow: "Thực hành và đánh giá",
    icon: Student,
  },
};

export function WorkspaceHeader({
  role,
  title,
  description,
}: {
  role: WorkspaceRole;
  title: string;
  description: string;
}) {
  const details = roleDetails[role];
  const RoleIcon = details.icon;

  return (
    <header className="grid gap-5 border-b border-[var(--border)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          {details.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-[68ch] text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          {description}
        </p>
      </div>

      <div className="inline-flex w-fit items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 shadow-[var(--shadow-card)]">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-[var(--accent-muted)] text-[var(--accent)]">
          <RoleIcon aria-hidden size={19} weight="duotone" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Vai trò hiện tại
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
            {details.label}
          </p>
        </div>
      </div>
    </header>
  );
}

export function ModuleNavigation({
  role,
  activeModule,
}: {
  role: WorkspaceRole;
  activeModule: CnsModule;
}) {
  return (
    <nav
      aria-label="Phân hệ thiết bị CNS"
      className="mt-6 flex w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1 sm:w-fit"
    >
      {(Object.keys(moduleLabels) as CnsModule[]).map((moduleId) => {
        const active = activeModule === moduleId;

        return (
          <Link
            key={moduleId}
            href={`/${role}/${moduleId}`}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 min-w-24 flex-1 items-center justify-center rounded-md px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset motion-reduce:transition-none sm:flex-none ${
              active
                ? "bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-sm)]"
                : "text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--text-primary)]"
            }`}
          >
            {moduleLabels[moduleId]}
          </Link>
        );
      })}
    </nav>
  );
}

export function ModuleSummary({
  title,
  description,
  icon: SummaryIcon = Broadcast,
  actions,
}: {
  title: string;
  description: string;
  icon?: Icon;
  actions?: ReactNode;
}) {
  return (
    <section className="mt-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
            <SummaryIcon aria-hidden size={23} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ScenarioSectionHeader({
  id,
  title,
  description,
  count,
  countLabel,
}: {
  id: string;
  title: string;
  description?: string;
  count?: number;
  countLabel: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-[68ch] text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {typeof count === "number" ? (
        <span className="w-fit shrink-0 rounded-md bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
          {count} {countLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ScenarioListFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      {children}
    </div>
  );
}

export function LoadingRows({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="divide-y divide-[var(--border)]"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid gap-3 p-5 sm:grid-cols-[2.25rem_minmax(0,1fr)_8rem] sm:items-center">
          <div className="size-9 animate-pulse rounded-md bg-[var(--surface-muted)] motion-reduce:animate-none" />
          <div>
            <div className="h-4 w-2/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
            <div className="mt-3 h-3.5 w-4/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          </div>
          <div className="h-9 animate-pulse rounded-md bg-[var(--surface-muted)] motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center sm:py-14">
      <span className="mx-auto inline-flex size-11 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
