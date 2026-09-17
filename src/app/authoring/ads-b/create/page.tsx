import type { Metadata } from "next";
import { ScenarioWizard } from "@/components/admin/scenario-wizard";

export const metadata: Metadata = { title: "Tạo kịch bản ADS-B" };

export default function CreateAdsbScenarioPage() {
  return <ScenarioWizard />;
}
