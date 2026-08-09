import type { Metadata } from "next";
import { Dvor1150PmdtLayout } from "@/modules/devices/dvor-1150";

export const metadata: Metadata = { title: "DVOR 1150 PMDT Simulator" };

export default function Dvor1150SimulatorPage() {
  return <div className="pmdt-classic-page"><Dvor1150PmdtLayout mode="preview" /></div>;
}
