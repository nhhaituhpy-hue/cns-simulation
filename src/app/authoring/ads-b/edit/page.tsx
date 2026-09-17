import type { Metadata } from "next";
import { Suspense } from "react";
import { EditAdsbScenarioPage } from "@/components/admin/edit-adsb-scenario-page";

export const metadata: Metadata = { title: "Chỉnh sửa kịch bản ADS-B" };

export default function EditAdsbScenarioRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Đang tải trình chỉnh sửa...</div>}>
      <EditAdsbScenarioPage />
    </Suspense>
  );
}
