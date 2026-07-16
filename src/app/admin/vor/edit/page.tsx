"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VorScenarioAuthor } from "@/components/vor/admin/vor-scenario-author";

function EditVorScenarioContent() {
  const searchParams = useSearchParams();
  return <VorScenarioAuthor scenarioId={searchParams.get("id") ?? ""} />;
}

export default function EditVorScenarioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải trình chỉnh sửa VOR...</div>}>
      <EditVorScenarioContent />
    </Suspense>
  );
}
