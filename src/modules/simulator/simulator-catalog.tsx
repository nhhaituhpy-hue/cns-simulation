import Image from "next/image";
import Link from "next/link";
import { SIMULATOR_MODULES } from "@/modules/core/registry";

const moduleIconImages: Record<string, string> = {
  "dvor-1150": "/images/simulator-icons/dvor-1150.png",
  "dvor-1150a": "/images/simulator-icons/dvor-1150.png",
  "dme-1119a": "/images/simulator-icons/dme-1119a.png",
  "dvor-220": "/images/simulator-icons/dvor-220.png",
  "dme-320": "/images/simulator-icons/dme-1119a.png",
  "ads-b": "/images/simulator-icons/ads-b.png",
  vhf: "/images/simulator-icons/vhf.png",
  vsat: "/images/simulator-icons/vsat.png",
};

export function SimulatorCatalog() {
  return (
    <div className="w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <section aria-label="Danh sách công cụ mô phỏng">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SIMULATOR_MODULES.map((module) => {
            const available = module.status === "available";
            const moduleIcon = moduleIconImages[module.id] ?? moduleIconImages["dvor-1150"];
            return (
              <article key={module.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl ${available ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-muted)]"}`}>
                    <Image src={moduleIcon} alt="" width={80} height={80} sizes="80px" className="size-full object-contain p-1" />
                  </span>
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${available ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]"}`}>
                    {available ? "Sẵn sàng" : "Chuẩn bị"}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">{module.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-5 text-[var(--text-secondary)]">{module.description}</p>
                <Link href={module.routes.simulator} className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-[var(--accent)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98]">
                  Mở Simulator
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
