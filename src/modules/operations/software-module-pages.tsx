import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { DesktopTower } from "@phosphor-icons/react/dist/ssr/DesktopTower";
import Link from "next/link";
import type { OperationsSoftwareModuleId, SimulatorModuleDefinition } from "@/modules/core/types";
import { Dme320Simulator } from "@/modules/operations/dme-320";
import { Dvor220Simulator } from "@/modules/operations/dvor-220";

type OperationsModule = SimulatorModuleDefinition<OperationsSoftwareModuleId>;

export function OperationsSoftwareSimulator({ module }: { module: OperationsModule }) {
  switch (module.id) {
    case "dvor-220":
      return <Dvor220Simulator />;
    case "dme-320":
      return <Dme320Simulator />;
    default:
      return <OperationsSoftwarePlaceholder module={module} />;
  }
}

export function OperationsSoftwarePlaceholder({ module }: { module: OperationsModule }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/simulator" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        <ArrowLeft aria-hidden size={17} />
        Quay về Simulator
      </Link>
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            <DesktopTower aria-hidden size={26} weight="duotone" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Module phần mềm độc lập</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{module.name}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{module.description}</p>
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Ranh giới module đã sẵn sàng</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Module có ID <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{module.id}</code>,
            route riêng và có thể bổ sung domain model, store phiên mô phỏng, màn hình vận hành cùng bộ kịch bản mà không sửa các simulator khác.
          </p>
        </div>
      </section>
    </div>
  );
}
