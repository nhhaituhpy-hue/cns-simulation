import type { Metadata } from "next";
import { DvorBlockDiagram } from "@/modules/devices/dvor-1150a/dvor-block-diagram";

export const metadata: Metadata = {
  title: "Sơ đồ khối DVOR 1150A",
  description: "Khám phá sơ đồ nguyên lý, vị trí cabinet và các khối chức năng của thiết bị DVOR 1150A.",
};

export default function Dvor1150aBlockDiagramPage() {
  return <DvorBlockDiagram />;
}
