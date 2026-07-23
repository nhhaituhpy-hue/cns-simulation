import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TerminalSession } from "@/components/terminal/terminal-session";
import { getOfficialExamScenario, getStudentAttemptItem } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Terminal thi ADS-B" };

export default async function OfficialExamTerminalPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string; candidateSubjectId: string; attemptItemId: string }>;
  searchParams: Promise<{ sensorId?: string | string[] }>;
}) {
  const [{ examId, candidateSubjectId, attemptItemId }, query] = await Promise.all([params, searchParams]);
  const item = await getStudentAttemptItem(attemptItemId);
  if (!item || item.examId !== examId || item.candidateSubjectId !== candidateSubjectId || item.moduleCode !== "ads-b") notFound();
  if (item.status === "submitted") redirect(item.returnHref);
  const officialScenario = await getOfficialExamScenario(item.moduleCode, item.scenarioId);
  if (!officialScenario || officialScenario.moduleCode !== "ads-b") notFound();
  const sensorId = Array.isArray(query.sensorId) ? query.sensorId[0] : query.sensorId;
  const scenarioHref = `/student/exams/${examId}/subjects/${candidateSubjectId}/scenarios/${attemptItemId}`;
  return (
    <TerminalSession
      scenarioId={item.scenarioId}
      sensorId={sensorId}
      cacheOwnerId={candidateSubjectId}
      officialScenario={officialScenario.scenario}
      officialExam={{
        attemptItemId,
        sessionKey: `exam:${attemptItemId}`,
        startedAt: item.startedAt ?? undefined,
        returnHref: `/student/exams/${examId}/subjects/${candidateSubjectId}`,
        scenarioHref,
        terminalHref: `${scenarioHref}/terminal`,
      }}
    />
  );
}
