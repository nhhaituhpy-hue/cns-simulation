import { getCurrentProfile } from "@/lib/auth/profile";
import { Dvor1150StudentSession } from "@/modules/devices/dvor-1150";
import { redirect } from "next/navigation";

interface Dvor1150StudentSessionPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function Dvor1150StudentSessionPage({ searchParams }: Dvor1150StudentSessionPageProps) {
  const params = await searchParams;
  const scenarioId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <Dvor1150StudentSession scenarioId={scenarioId} identity={{ studentName: profile.fullName, workUnit: profile.workUnit }} />;
}
