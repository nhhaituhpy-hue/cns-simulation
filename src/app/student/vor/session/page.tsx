import { getCurrentProfile } from "@/lib/auth/profile";
import { Dvor1150aStudentSession } from "@/modules/devices/dvor-1150a";
import { redirect } from "next/navigation";

interface VorStudentSessionPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function VorStudentSessionPage({ searchParams }: VorStudentSessionPageProps) {
  const params = await searchParams;
  const scenarioId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <Dvor1150aStudentSession scenarioId={scenarioId} identity={{ userId: profile.id, studentName: profile.fullName, workUnit: profile.workUnit }} />;
}
