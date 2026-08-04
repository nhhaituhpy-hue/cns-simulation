export function ExamRouteLoading({ label = "Đang tải dữ liệu kỳ thi" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="w-full max-w-none px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <span className="sr-only">{label}</span>
      <div className="h-7 w-56 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
      <div className="mt-7 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="h-14 animate-pulse bg-[var(--surface-subtle)] motion-reduce:animate-none" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="grid grid-cols-[3rem_minmax(0,2fr)_minmax(8rem,1fr)] gap-4 border-t border-[var(--border)] p-4">
            <div className="h-8 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
            <div className="h-8 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
            <div className="h-8 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
