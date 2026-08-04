import type { Metadata } from "next";
import { AdsbSimulatorLab } from "@/modules/devices/adsb";

export const metadata: Metadata = { title: "ADS-B Simulator" };

export default function AdsbSimulatorPage() {
  return <AdsbSimulatorLab />;
}
