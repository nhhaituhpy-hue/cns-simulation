"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Dme1119aScenarioAuthor } from "@/modules/devices/dme-1119a";

function EditDmeScenarioContent() {
  const searchParams = useSearchParams();
  return <Dme1119aScenarioAuthor scenarioId={searchParams.get("id") ?? ""} />;
}

export default function EditDmeScenarioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải trình chỉnh sửa DME 1119A...</div>}>
      <EditDmeScenarioContent />
    </Suspense>
  );
}
