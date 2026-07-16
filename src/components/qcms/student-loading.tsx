export function StudentDashboardLoading() {
  return (
    <section
      aria-label="Đang tải danh sách bài thực hành"
      aria-busy="true"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10"
    >
      <div className="h-8 w-56 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      <div className="mt-6 border-t border-[var(--border)] pt-7">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-52 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          <div className="h-4 w-14 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-36 grid-cols-[2.5rem_minmax(0,1fr)] gap-4 rounded-lg border border-[var(--border)] bg-white p-4 sm:p-5 lg:grid-cols-[2.5rem_minmax(0,1fr)_10rem]"
          >
            <div className="size-9 animate-pulse rounded-full bg-[var(--surface-muted)] motion-reduce:animate-none" />
            <div>
              <div className="h-5 w-2/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
              <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
              <div className="mt-5 h-4 w-1/3 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
            </div>
            <div className="col-span-2 h-10 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none lg:col-span-1" />
          </div>
        ))}
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
