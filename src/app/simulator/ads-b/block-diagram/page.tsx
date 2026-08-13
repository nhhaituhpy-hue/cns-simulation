import type { Metadata } from "next";
import { AdsbBlockDiagram } from "@/modules/devices/adsb";

export const metadata: Metadata = {
  title: "Sơ đồ khối ADS-B ngoài trời",
  description:
    "Khám phá cấu hình lắp đặt, đường RF, GPS, nguồn và mạng của COMSOFT Quadrant ADS-B Sensor ngoài trời.",
};

export default function AdsbBlockDiagramPage() {
  return <AdsbBlockDiagram />;
}
