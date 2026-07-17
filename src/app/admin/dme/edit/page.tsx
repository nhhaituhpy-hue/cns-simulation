"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DmeScenarioAuthor } from "@/components/dme/admin/dme-scenario-author";

function EditDmeScenarioContent() {
  const searchParams = useSearchParams();
  return <DmeScenarioAuthor scenarioId={searchParams.get("id") ?? ""} />;
}

export default function EditDmeScenarioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải trình chỉnh sửa DME...</div>}>
      <EditDmeScenarioContent />
    </Suspense>
  );
}

