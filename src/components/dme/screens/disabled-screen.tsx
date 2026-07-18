"use client";

import { LockSimple } from "@phosphor-icons/react/dist/csr/LockSimple";

export function DisabledScreen() {
  return (
    <section className="grid min-h-full place-items-center p-8 text-center">
      <div className="max-w-sm text-[#64748b]">
        <LockSimple aria-hidden className="mx-auto" size={42} weight="duotone" />
        <p className="mt-4 text-sm font-medium">
          Màn hình này chưa khả dụng trong phiên bản hiện tại
        </p>
      </div>
    </section>
  );
}

