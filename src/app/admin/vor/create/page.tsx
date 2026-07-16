import type { Metadata } from "next";
import { VorScenarioAuthor } from "@/components/vor/admin/vor-scenario-author";

export const metadata: Metadata = {
  title: "Tạo kịch bản VOR",
};

export default function CreateVorScenarioPage() {
  return <VorScenarioAuthor />;
}
