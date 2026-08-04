import type { Metadata } from "next";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";

export const metadata: Metadata = { title: "Ôn tập" };

export default function ReviewPage() {
  return <TrainingWorkspaceCatalog mode="review" />;
}
