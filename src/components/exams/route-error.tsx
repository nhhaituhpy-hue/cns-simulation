"use client";

import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { primaryButtonClassName } from "./shared";

export function ExamRouteError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-[55dvh] w-full max-w-2xl place-items-center px-4 py-12 text-center">
      <div>
        <WarningCircle aria-hidden size={40} weight="duotone" className="mx-auto text-[var(--danger)]" />
        <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Không thể tải dữ liệu kỳ thi</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Vui lòng kiểm tra kết nối Supabase và bảo đảm migration quản lý kỳ thi đã được áp dụng.</p>
        <button type="button" onClick={reset} className={`${primaryButtonClassName} mt-5`}><ArrowClockwise aria-hidden size={18} /> Thử lại</button>
      </div>
    </div>
  );
}
