import type { Metadata } from "next";
import { Dme1119aPmdtLayout } from "@/modules/devices/dme-1119a";
import { getCurrentProfile } from "@/lib/auth/profile";

export const metadata: Metadata = { title: "DME 1119A PMDT Simulator" };

export default async function Dme1119aSimulatorPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="pmdt-classic-page dme-pmdt-page">
      <Dme1119aPmdtLayout mode="preview" simulatorId="dme-1119a" scenarioAuthoringEnabled={profile?.role === "admin"} sessionUserId={profile?.id ?? ""} />
    </div>
  );
}
