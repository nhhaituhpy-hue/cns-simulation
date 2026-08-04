import type { Metadata } from "next";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";

export const metadata: Metadata = { title: "Tạo kịch bản" };

export default function AuthoringPage() {
  return <TrainingWorkspaceCatalog mode="authoring" />;
}
