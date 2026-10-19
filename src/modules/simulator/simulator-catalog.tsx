import Image from "next/image";
import Link from "next/link";
import { getSimulatorCatalogueImage } from "@/modules/core/simulator-catalogue-images";
import { SIMULATOR_MODULES } from "@/modules/core/registry";

export function SimulatorCatalog() {
  return (
    <div className="w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <section aria-label="Danh sách công cụ mô phỏng">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SIMULATOR_MODULES.map((module) => {
            const available = module.status === "available";
            const moduleIcon = getSimulatorCatalogueImage(module.id);
            return (
              <article key={module.id} className="rounded-xl border border-[#d1d5db] bg-[#e5e7eb] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl ${available ? "bg-[var(--accent-muted)]" : "bg-[#d1d5db]"}`}>
                    <Image src={moduleIcon} alt="" width={80} height={80} sizes="80px" className="size-full object-contain p-1" />
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${available ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]"}`}>
                    {available ? "ready" : "pending"}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{module.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-5 text-slate-600">{module.description}</p>
                <Link href={module.routes.simulator} className="mt-4 inline-flex min-h-9 items-center justify-center rounded-full bg-[var(--accent)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98]">
                  Run
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
