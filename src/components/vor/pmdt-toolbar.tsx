"use client";

export function PmdtToolbar({ title }: { title: string }) {
  return (
    <div className="flex min-h-11 items-center border-b border-[#334155] bg-[#111827] px-3">
      <h2 className="truncate text-sm font-semibold text-[#e2e8f0]">{title}</h2>
    </div>
  );
}
