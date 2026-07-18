import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DmeStudentSession } from "@/components/dme/student/dme-student-session";
import { ScenarioMonitorView } from "@/components/qcms/scenario-monitor-view";
import { VorStudentSession } from "@/components/vor/student/vor-student-session";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getOfficialExamScenario, getStudentAttemptItem } from "@/lib/exams/queries";

export const metadata: Metadata = { title: "Kịch bản thi" };

export default async function OfficialExamScenarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string; candidateSubjectId: string; attemptItemId: string }>;
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const [{ examId, candidateSubjectId, attemptItemId }, query, profile] = await Promise.all([
    params,
    searchParams,
    getCurrentProfile(),
  ]);
  if (!profile) redirect("/login");
  const item = await getStudentAttemptItem(attemptItemId);
  if (!item || item.examId !== examId || item.candidateSubjectId !== candidateSubjectId || item.status === "submitted") notFound();
  const officialScenario = await getOfficialExamScenario(item.moduleCode, item.scenarioId);
  if (!officialScenario) notFound();

  const baseHref = `/student/exams/${examId}/subjects/${candidateSubjectId}/scenarios/${attemptItemId}`;
  const officialExam = {
    attemptItemId,
    sessionKey: `exam:${attemptItemId}`,
    startedAt: item.startedAt ?? undefined,
    returnHref: `/student/exams/${examId}/subjects/${candidateSubjectId}`,
    scenarioHref: baseHref,
    terminalHref: `${baseHref}/terminal`,
  };
  const identity = { userId: profile.id, studentName: item.candidateName, workUnit: item.candidateWorkUnit };

  if (item.moduleCode === "vor" && officialScenario.moduleCode === "vor") {
    return <VorStudentSession scenarioId={item.scenarioId} identity={identity} officialExam={officialExam} officialScenario={officialScenario.scenario} />;
  }
  if (item.moduleCode === "dme" && officialScenario.moduleCode === "dme") {
    return <DmeStudentSession scenarioId={item.scenarioId} identity={identity} officialExam={officialExam} officialScenario={officialScenario.scenario} />;
  }
  const stage = Array.isArray(query.stage) ? query.stage[0] : query.stage;
  if (item.moduleCode === "ads-b" && officialScenario.moduleCode === "ads-b") {
    return <ScenarioMonitorView scenarioId={item.scenarioId} autoOpenHardware={stage === "hardware"} officialExam={officialExam} officialScenario={officialScenario.scenario} />;
  }
  notFound();
}
