import type { Metadata } from "next";
import { Dvor1150PmdtLayout } from "@/modules/devices/dvor-1150";
import { getCurrentProfile } from "@/lib/auth/profile";

export const metadata: Metadata = { title: "DVOR 1150 PMDT Simulator" };

export default async function Dvor1150SimulatorPage() {
  const profile = await getCurrentProfile();
  return <div className="pmdt-classic-page dvor1150-pmdt-page">
    <Dvor1150PmdtLayout mode="preview" scenarioAuthoringEnabled={profile?.role === "admin"} />
  </div>;
}
