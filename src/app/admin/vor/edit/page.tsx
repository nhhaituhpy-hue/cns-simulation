"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Dvor1150aScenarioAuthor } from "@/modules/devices/dvor-1150a";

function EditVorScenarioContent() {
  const searchParams = useSearchParams();
  return <Dvor1150aScenarioAuthor scenarioId={searchParams.get("id") ?? ""} />;
}

export default function EditVorScenarioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải trình chỉnh sửa DVOR 1150A...</div>}>
      <EditVorScenarioContent />
    </Suspense>
  );
}
