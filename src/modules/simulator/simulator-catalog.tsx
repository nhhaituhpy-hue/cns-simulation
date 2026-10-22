"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSimulatorCatalogueImage } from "@/modules/core/simulator-catalogue-images";
import { SIMULATOR_MODULES } from "@/modules/core/registry";

export function SimulatorCatalog() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRun = (moduleId: string, route: string) => {
    if (loadingId) return;
    setLoadingId(moduleId);
    router.push(route);
  };

  const loadingModule = SIMULATOR_MODULES.find((m) => m.id === loadingId);

  return (
    <div className="w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <section aria-label="Danh sách công cụ mô phỏng">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SIMULATOR_MODULES.map((module) => {
            const available = module.status === "available";
            const moduleIcon = getSimulatorCatalogueImage(module.id);
            const isLoading = loadingId === module.id;
            return (
              <article key={module.id} className="rounded-xl border border-[#d1d5db] bg-[#e5e7eb] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl ${available ? "bg-[var(--accent-muted)]" : "bg-[#d1d5db]"}`}>
                    <Image src={moduleIcon} alt="" width={80} height={80} sizes="80px" className="size-full object-contain p-1" />
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{module.name}</h3>
                {available ? (
                  <button
                    type="button"
                    disabled={loadingId !== null}
                    onClick={() => handleRun(module.id, module.routes.simulator)}
                    className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Đang mở…</span>
                      </>
                    ) : (
                      "Mở simulator"
                    )}
                  </button>
                ) : (
                  <span aria-disabled="true" className="mt-4 inline-flex min-h-9 items-center justify-center rounded-full bg-[#d1d5db] px-3.5 text-sm font-semibold text-slate-500">
                    Đang hoàn thiện
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Loading overlay (mờ) */}
      {loadingId ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm"
          role="status"
          aria-live="assertive"
          aria-label="Đang mở simulator"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--cns-btn-ghost-border)] bg-[var(--cns-surface-card)]/90 px-8 py-6 shadow-2xl">
            <svg className="size-10 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-[var(--cns-text-primary)]">
              Đang mở {loadingModule?.name ?? "simulator"}…
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
