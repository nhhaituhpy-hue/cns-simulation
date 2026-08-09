import type { Metadata } from "next";
import { Dme1119aPmdtLayout } from "@/modules/devices/dme-1119a";

export const metadata: Metadata = { title: "DME 1119A PMDT Simulator" };

export default function Dme1119aSimulatorPage() {
  return (
    <div className="pmdt-classic-page dme-pmdt-page">
      <Dme1119aPmdtLayout mode="preview" />
    </div>
  );
}
