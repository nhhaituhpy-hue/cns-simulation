import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  isScenarioParametersModuleId,
  SCENARIO_PARAMETERS_MODULES,
} from "@/lib/scenario-parameters";
import { getSimulatorModule } from "@/modules/core/registry";
import { OperationsReviewDashboard } from "@/modules/training/operations-review-dashboard";

interface ReviewModulePageProps {
  params: Promise<{ moduleId: string }>;
}

export function generateStaticParams() {
  return SCENARIO_PARAMETERS_MODULES.map((module) => ({ moduleId: module.moduleId }));
}

export async function generateMetadata({ params }: ReviewModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const simulatorModule = getSimulatorModule(moduleId);
  return { title: simulatorModule ? `Ôn tập ${simulatorModule.shortName}` : "Module không tồn tại" };
}

export default async function ReviewModulePage({ params }: ReviewModulePageProps) {
  const { moduleId } = await params;
  if (!isScenarioParametersModuleId(moduleId)) notFound();
  const simulatorModule = getSimulatorModule(moduleId);
  if (!simulatorModule) notFound();
  const profile = await getCurrentProfile();
  if (!profile) notFound();
  return (
    <OperationsReviewDashboard
      moduleId={moduleId}
      canManage={profile.role === "admin"}
    />
  );
}
