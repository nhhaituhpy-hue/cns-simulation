import type { Metadata } from "next";
import { Dvor220BlockDiagram } from "@/modules/operations/dvor-220";

export const metadata: Metadata = {
  title: "Sơ đồ khối DVOR 220",
  description: "Khám phá topology, cabinet, ASU và các LRU của thiết bị MOPIENS 220 DVOR.",
};

export default function Dvor220BlockDiagramPage() {
  return <Dvor220BlockDiagram />;
}
