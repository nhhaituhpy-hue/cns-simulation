import type { Metadata } from "next";
import { ScenarioManagementWorkspace } from "@/components/scenario/scenario-management-workspace";

export const metadata: Metadata = { title: "Kịch bản" };

export default function AuthoringPage() {
  return <ScenarioManagementWorkspace />;
}
