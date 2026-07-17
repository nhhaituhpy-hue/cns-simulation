export function StudentDashboardLoading() {
  return (
    <section
      aria-label="Đang tải danh sách bài thực hành"
      aria-busy="true"
      className="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9"
    >
      <div className="border-b border-[var(--border)] pb-6">
        <div className="h-3 w-40 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        <div className="mt-3 h-9 w-80 max-w-full animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      </div>
      <div className="mt-6 h-12 w-80 max-w-full animate-pulse rounded-lg bg-[var(--surface-muted)] motion-reduce:animate-none" />
      <div className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-5 w-52 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
            <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="grid min-h-28 grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 sm:p-5 lg:grid-cols-[2.5rem_minmax(0,1fr)_10rem]"
            >
              <div className="size-9 animate-pulse rounded-md bg-[var(--surface-muted)] motion-reduce:animate-none" />
              <div>
                <div className="h-5 w-2/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
                <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
                <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
              </div>
              <div className="col-span-2 h-10 animate-pulse rounded-md bg-[var(--surface-muted)] motion-reduce:animate-none lg:col-span-1" />
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
