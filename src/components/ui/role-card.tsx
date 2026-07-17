import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

type RoleCardProps = {
  href: string;
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
};

export function RoleCard({
  href,
  title,
  description,
  action,
  icon,
}: RoleCardProps) {
  return (
    <Link
      href={href}
      className="group grid min-h-36 grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-1.5 max-w-[46ch] text-[13px] leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
        <span className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--accent)]">
          {action}
        </span>
      </div>
      <ArrowRight
        aria-hidden
        size={19}
        weight="regular"
        className="mt-2 text-[var(--accent)] transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none"
      />
    </Link>
  );
}
