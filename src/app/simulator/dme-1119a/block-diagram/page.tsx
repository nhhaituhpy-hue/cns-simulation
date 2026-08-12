import type { Metadata } from "next";
import { Dme1119aBlockDiagram } from "@/modules/devices/dme-1119a/dme-1119a-block-diagram";

export const metadata: Metadata = {
  title: "Sơ đồ khối DME 1119A",
  description: "Khám phá sơ đồ nguyên lý, cabinet ba mặt và dữ liệu bảo dưỡng của Model 1119A Dual High Power DME.",
};

export default function Dme1119aBlockDiagramPage() {
  return <Dme1119aBlockDiagram />;
}
