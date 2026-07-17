import type { Metadata } from "next";
import { DmeScenarioAuthor } from "@/components/dme/admin/dme-scenario-author";

export const metadata: Metadata = {
  title: "Tạo kịch bản DME",
};

export default function CreateDmeScenarioPage() {
  return <DmeScenarioAuthor />;
}

