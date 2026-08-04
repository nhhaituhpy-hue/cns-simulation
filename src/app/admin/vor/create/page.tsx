import type { Metadata } from "next";
import { Dvor1150aScenarioAuthor } from "@/modules/devices/dvor-1150a";

export const metadata: Metadata = { title: "Tạo kịch bản DVOR 1150A" };

export default function CreateVorScenarioPage() {
  return <Dvor1150aScenarioAuthor />;
}
