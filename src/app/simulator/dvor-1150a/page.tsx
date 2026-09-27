import type { Metadata } from "next";
import { Dvor1150aPmdtLayout } from "@/modules/devices/dvor-1150a";
import { getCurrentProfile } from "@/lib/auth/profile";

export const metadata: Metadata = { title: "DVOR 1150A PMDT Simulator" };

export default async function Dvor1150aSimulatorPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="pmdt-classic-page dvor1150a-pmdt-page">
      <Dvor1150aPmdtLayout
        mode="preview"
        simulatorId="dvor-1150a"
        scenarioAuthoringEnabled={profile?.role === "admin"}
        sessionUserId={profile?.id ?? ""}
      />
    </div>
  );
}
