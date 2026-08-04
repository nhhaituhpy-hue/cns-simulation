import { DesktopTower } from "@phosphor-icons/react/dist/ssr/DesktopTower";
import Link from "next/link";
import { TRAINING_MODULES } from "@/modules/core/registry";
import type { SimulatorModuleDefinition } from "@/modules/core/types";

export type TrainingWorkspaceMode = "authoring" | "review";

const workspaceCopy = {
  authoring: {
    title: "Tạo kịch bản",
    availableAction: "Quản lý kịch bản",
    plannedAction: "Mở khung kịch bản",
  },
  review: {
    title: "Ôn tập",
    availableAction: "Mở bài ôn tập",
    plannedAction: "Mở khung ôn tập",
  },
} as const;

export function TrainingWorkspaceCatalog({ mode }: { mode: TrainingWorkspaceMode }) {
  const copy = workspaceCopy[mode];

  return (
    <div className="w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <section aria-label={`Danh sách module ${copy.title}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRAINING_MODULES.map((module) => {
          const available = module.status === "available";
          return (
            <article key={module.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex size-10 items-center justify-center rounded-lg ${available ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>
                  <DesktopTower aria-hidden size={22} weight="duotone" />
                </span>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${available ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]"}`}>
                  {available ? "Sẵn sàng" : "Chuẩn bị"}
                </span>
              </div>
              <h2 className="mt-4 text-base font-bold text-[var(--text-primary)]">{module.shortName}</h2>
              <p className="mt-2 min-h-12 text-sm leading-5 text-[var(--text-secondary)]">{module.description}</p>
              <Link href={module.routes[mode]} className={`mt-4 inline-flex min-h-9 items-center justify-center rounded-md px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] ${available ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus-visible:ring-offset-2" : "border border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent-muted)]"}`}>
                {available ? copy.availableAction : copy.plannedAction}
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function TrainingModulePlaceholder({
  module,
  mode,
}: {
  module: SimulatorModuleDefinition;
  mode: TrainingWorkspaceMode;
}) {
  const copy = workspaceCopy[mode];
  const backHref = mode === "authoring" ? "/authoring" : "/review";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href={backHref} className="text-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        Quay về {copy.title}
      </Link>
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            <DesktopTower aria-hidden size={26} weight="duotone" />
          </span>
          <div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{module.description}</p>
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Module đang được chuẩn bị</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Route và ranh giới module đã sẵn sàng. Màn hình, dữ liệu mô phỏng và kịch bản nghiệp vụ sẽ được bổ sung ở giai đoạn triển khai thiết bị.
          </p>
        </div>
      </section>
    </div>
  );
}
