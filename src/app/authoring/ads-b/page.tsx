import type { Metadata } from "next";
import { AdsbAdminDashboard } from "@/modules/devices/adsb";

export const metadata: Metadata = { title: "Kịch bản ADS-B" };

export default function AdsbAuthoringPage() {
  return <AdsbAdminDashboard />;
}
