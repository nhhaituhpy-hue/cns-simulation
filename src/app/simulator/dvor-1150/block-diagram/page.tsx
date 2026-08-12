import type { Metadata } from "next";
import { Dvor1150BlockDiagram } from "@/modules/devices/dvor-1150/dvor-1150-block-diagram";

export const metadata: Metadata = {
  title: "Sơ đồ khối DVOR 1150",
  description:
    "Khám phá sơ đồ nguyên lý, Electronics Cabinet, Commutator Rack và dữ liệu bảo dưỡng của Model 1150 DVOR.",
};

export default function Dvor1150BlockDiagramPage() {
  return <Dvor1150BlockDiagram />;
}
