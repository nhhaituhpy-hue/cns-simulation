export function StudentDashboardLoading() {
  return (
    <section
      aria-label="Đang tải danh sách bài thực hành"
      aria-busy="true"
      className="space-y-6"
    >
      <div className="border-b border-white/[0.08] pb-6">
        <div className="h-3 w-40 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-3 h-8 w-80 max-w-full animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
      </div>
      <div className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#141f2a] shadow-sm">
        <div className="divide-y divide-white/[0.05]">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 sm:p-5 lg:grid-cols-[2.5rem_minmax(0,1fr)_10rem]"
            >
              <div className="size-8 animate-pulse rounded-[6px] bg-white/[0.05] motion-reduce:animate-none" />
              <div>
                <div className="h-5 w-2/5 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
                <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
              </div>
              <div className="col-span-2 h-9 animate-pulse rounded-[8px] bg-white/[0.05] motion-reduce:animate-none lg:col-span-1" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Đang tải dữ liệu bài thực hành.</span>
    </section>
  );
}

export function ScenarioMonitorLoading() {
  return (
    <section
      aria-label="Đang tải màn hình QCMS"
      aria-busy="true"
      className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-48 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        <div className="h-9 w-24 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      </div>
      <div className="mt-6 h-[34rem] animate-pulse rounded-lg border border-[var(--border)] bg-white motion-reduce:animate-none" />
      <span className="sr-only">Đang tải dữ liệu QCMS.</span>
    </section>
  );
}
