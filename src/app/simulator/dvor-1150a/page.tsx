import type { Metadata } from "next";
import { Dvor1150aPmdtLayout } from "@/modules/devices/dvor-1150a";

export const metadata: Metadata = { title: "DVOR 1150A PMDT Simulator" };

export default function Dvor1150aSimulatorPage() {
  return (
    <div className="pmdt-classic-page dvor1150a-pmdt-page">
      <Dvor1150aPmdtLayout mode="preview" simulatorId="dvor-1150a" />
    </div>
  );
}
