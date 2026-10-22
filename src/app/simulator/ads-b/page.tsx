import type { Metadata } from "next";
import { AdsbSimulatorLab } from "@/modules/devices/adsb";
import { AdsbPracticeWorkspace } from "@/components/scenario/adsb-practice-workspace";

export const metadata: Metadata = { title: "ADS-B Simulator" };

export default async function AdsbSimulatorPage({ searchParams }: { searchParams?: Promise<{ review?: string | string[]; scenarioId?: string | string[] }> } = {}) {
  const params = await searchParams;
  const practiceId = params?.review === "1" && typeof params.scenarioId === "string" && params.scenarioId ? params.scenarioId : null;
  return (
    <div className="adsb-simulator-page">
      {practiceId ? <AdsbPracticeWorkspace scenarioId={practiceId} /> : <AdsbSimulatorLab />}
    </div>
  );
}
