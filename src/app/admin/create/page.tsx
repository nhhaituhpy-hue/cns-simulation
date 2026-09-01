import type { Metadata } from "next";
import { ScenarioWizard } from "@/components/admin/scenario-wizard";

export const metadata: Metadata = {
  title: "Kịch bản",
};

export default function CreateScenarioPage() {
  return <ScenarioWizard />;
}
