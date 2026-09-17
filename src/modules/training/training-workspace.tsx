import Image from "next/image";
import Link from "next/link";
import { getSimulatorIconImage } from "@/modules/core/simulator-icon-images";
import { TRAINING_MODULES } from "@/modules/core/registry";
import type { SimulatorModuleDefinition } from "@/modules/core/types";

export type TrainingWorkspaceMode = "authoring" | "review";

function getWorkspaceStatus(
  module: SimulatorModuleDefinition,
  mode: TrainingWorkspaceMode,
) {
  if (mode === "review" && module.reviewStatus) return module.reviewStatus;
  return module.trainingStatus ?? module.status;
}

const workspaceCopy = {
  authoring: {
    title: "Kịch bản",
    availableAction: "Quản lý kịch bản",
    plannedAction: "Mở khung kịch bản",
  },
  review: {
    title: "Ôn tập",
    availableAction: "Mở bài ôn tập",
    plannedAction: "Mở khung ôn tập",
  },
} as const;

export function TrainingWorkspaceCatalog({
  mode,
  modules,
}: {
  mode: TrainingWorkspaceMode;
  modules?: readonly SimulatorModuleDefinition[];
}) {
  const copy = workspaceCopy[mode];
  const catalogModules = modules ?? TRAINING_MODULES;

  return (
    <div className="w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <section aria-label={`Danh sách module ${copy.title}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalogModules.map((module) => {
          const trainingStatus = getWorkspaceStatus(
            module as SimulatorModuleDefinition,
            mode,
          );
          const trainingAvailable = trainingStatus === "available";
          const moduleIcon = getSimulatorIconImage(module.id);
          return (
            <article key={module.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl ${trainingAvailable ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-muted)]"}`}>
                  <Image src={moduleIcon} alt="" width={80} height={80} sizes="80px" className="size-full object-contain p-1" />
                </span>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${trainingAvailable ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]"}`}>
                  {trainingAvailable ? "Sẵn sàng" : "Chuẩn bị"}
                </span>
              </div>
              <h2 className="mt-4 text-base font-bold text-[var(--text-primary)]">{module.shortName}</h2>
              <p className="mt-2 min-h-12 text-sm leading-5 text-[var(--text-secondary)]">{module.description}</p>
              <Link href={module.routes[mode]} className={`mt-4 inline-flex min-h-9 items-center justify-center rounded px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] ${trainingAvailable ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus-visible:ring-offset-2" : "border border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent-muted)]"}`}>
                {trainingAvailable ? copy.availableAction : copy.plannedAction}
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
  const moduleIcon = getSimulatorIconImage(module.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href={backHref} className="inline-flex min-h-9 items-center rounded px-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        Quay về {copy.title}
      </Link>
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-muted)]">
            <Image src={moduleIcon} alt="" width={48} height={48} sizes="48px" className="size-full object-contain p-1" />
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
