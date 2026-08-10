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

function SimulatorIconCard({ module }: { module: (typeof SIMULATOR_MODULES)[number] }) {
  const available = module.status === "available";
  const moduleIcon = moduleIconImages[module.id] ?? moduleIconImages["dvor-1150"];

  return (
    <Link
      href={module.routes.simulator}
      className="group flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
      aria-label={`Mở simulator ${module.name}`}
    >
      <span className={`inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${available ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-muted)]"}`}>
        <Image src={moduleIcon} alt="" width={40} height={40} sizes="40px" className="size-10 object-contain" />
      </span>
      <span className="mt-2 line-clamp-2 text-xs font-bold leading-4 text-[var(--text-primary)]">
        {module.shortName}
      </span>
      <span className={`mt-2 rounded-md border px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${available ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]" : "border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] text-[var(--color-warning)]"}`}>
        {available ? "Sẵn sàng" : "Chuẩn bị"}
      </span>
    </Link>
  );
}

export function SimulatorDashboard() {
  const availableModules = SIMULATOR_MODULES.filter((module) => module.status === "available");
  const deviceCount = SIMULATOR_MODULES.filter((module) => module.category === "device").length;
  const softwareCount = SIMULATOR_MODULES.filter((module) => module.category === "operations-software").length;

  return (
    <main className="home-dashboard min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 lg:px-10 lg:py-10 xl:px-12">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="home-dashboard__header flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.035em] text-[var(--text-primary)] sm:text-2xl">
              Chọn hệ thống để bắt đầu phiên mô phỏng
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Khám phá các thiết bị và phần mềm CNS trong các phiên thực hành ngắn, trực quan.
            </p>
          </div>

          <div className="home-dashboard__stats grid grid-cols-3 divide-x divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-3 shadow-[var(--shadow-sm)] xl:min-w-[25rem]">
            <div className="px-3 text-center sm:px-5">
              <strong className="block text-2xl font-bold tracking-tight text-[var(--text-primary)]">{availableModules.length}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">Sẵn sàng</span>
            </div>
            <div className="px-3 text-center sm:px-5">
              <strong className="block text-2xl font-bold tracking-tight text-[var(--text-primary)]">{deviceCount}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">Thiết bị</span>
            </div>
            <div className="px-3 text-center sm:px-5">
              <strong className="block text-2xl font-bold tracking-tight text-[var(--text-primary)]">{softwareCount}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">Phần mềm</span>
            </div>
          </div>
        </header>

        <section className="mt-10" aria-labelledby="simulator-list-heading">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 id="simulator-list-heading" className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Khu vực mô phỏng
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Chọn biểu tượng để mở simulator tương ứng.
              </p>
            </div>
            <span className="hidden rounded-full border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] sm:inline-flex">
              {SIMULATOR_MODULES.length} khu vực
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {SIMULATOR_MODULES.map((module) => (
              <SimulatorIconCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
