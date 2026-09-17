import type { Metadata } from "next";
import { AdsbAdminDashboard } from "@/modules/devices/adsb";

export const metadata: Metadata = { title: "Kịch bản ADS-B" };

export default function AdsbAuthoringPage() {
  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      <AdsbAdminDashboard />
    </div>
  );
}
