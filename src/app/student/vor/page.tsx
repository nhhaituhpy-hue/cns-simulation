import { VorStudentSession } from "@/components/vor/student/vor-student-session";

interface VorStudentPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function VorStudentPage({ searchParams }: VorStudentPageProps) {
  const params = await searchParams;
  const scenarioId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  return <VorStudentSession scenarioId={scenarioId} />;
}
