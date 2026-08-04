import type { Metadata } from "next";
import { Dme1119aScenarioAuthor } from "@/modules/devices/dme-1119a";

export const metadata: Metadata = { title: "Tạo kịch bản DME 1119A" };

export default function CreateDmeScenarioPage() {
  return <Dme1119aScenarioAuthor />;
}
