import { getCurrentProfile } from "@/lib/auth/profile";
import { Dme1119aStudentSession } from "@/modules/devices/dme-1119a";
import { redirect } from "next/navigation";

interface DmeStudentSessionPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function DmeStudentSessionPage({ searchParams }: DmeStudentSessionPageProps) {
  const params = await searchParams;
  const scenarioId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <Dme1119aStudentSession scenarioId={scenarioId} identity={{ userId: profile.id, studentName: profile.fullName, workUnit: profile.workUnit }} />;
}
