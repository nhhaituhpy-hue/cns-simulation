import { VorStudentSession } from "@/components/vor/student/vor-student-session";
import { getCurrentProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";

interface VorStudentSessionPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function VorStudentSessionPage({ searchParams }: VorStudentSessionPageProps) {
  const params = await searchParams;
  const scenarioId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <VorStudentSession scenarioId={scenarioId} identity={{ userId: profile.id, studentName: profile.fullName, workUnit: profile.workUnit }} />;
}
