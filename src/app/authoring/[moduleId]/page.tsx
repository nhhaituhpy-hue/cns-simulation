import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScenarioManagementWorkspace } from "@/components/scenario/scenario-management-workspace";
import {
  isScenarioParametersModuleId,
  SCENARIO_PARAMETERS_MODULES,
} from "@/lib/scenario-parameters";
import { getSimulatorModule } from "@/modules/core/registry";

interface AuthoringModulePageProps {
  params: Promise<{ moduleId: string }>;
}

export function generateStaticParams() {
  return SCENARIO_PARAMETERS_MODULES.map((module) => ({
    moduleId: module.moduleId,
  }));
}

export async function generateMetadata({
  params,
}: AuthoringModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const simulatorModule = getSimulatorModule(moduleId);
  return {
    title: simulatorModule
      ? `Kịch bản ${simulatorModule.shortName}`
      : "Module không tồn tại",
  };
}

export default async function AuthoringModulePage({
  params,
}: AuthoringModulePageProps) {
  const { moduleId } = await params;
  if (!isScenarioParametersModuleId(moduleId)) notFound();

  return <ScenarioManagementWorkspace moduleId={moduleId} />;
}
