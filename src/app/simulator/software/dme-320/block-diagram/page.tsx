import type { Metadata } from "next";
import { Dme320BlockDiagram } from "@/modules/operations/dme-320";

export const metadata: Metadata = {
  title: "Sơ đồ khối DME 320",
  description:
    "Khám phá topology, cabinet, dual transponder và các LRU của thiết bị MOPIENS 320 DME.",
};

export default function Dme320BlockDiagramPage() {
  return <Dme320BlockDiagram />;
}
