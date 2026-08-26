import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Tạo kịch bản DME 1119A" };

export default function CreateDmeScenarioPage() {
  redirect("/simulator/dme-1119a");
}
