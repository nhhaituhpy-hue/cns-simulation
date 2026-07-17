import { DmeStudentSession } from "@/components/dme/student/dme-student-session";

interface DmeStudentSessionPageProps {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default async function DmeStudentSessionPage({ searchParams }: DmeStudentSessionPageProps) {
  const params = await searchParams;
  const scenarioId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  return <DmeStudentSession scenarioId={scenarioId} />;
}

