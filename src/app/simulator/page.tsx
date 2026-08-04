import type { Metadata } from "next";
import { SimulatorCatalog } from "@/modules/simulator/simulator-catalog";

export const metadata: Metadata = { title: "Simulator" };

export default function SimulatorPage() {
  return <SimulatorCatalog />;
}
