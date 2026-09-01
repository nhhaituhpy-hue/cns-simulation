import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOperationsSoftwareModule, OPERATIONS_SOFTWARE_MODULES } from "@/modules/core/registry";
import { TrainingModulePlaceholder } from "@/modules/training/training-workspace";

interface AuthoringModulePageProps {
  params: Promise<{ moduleId: string }>;
}

export function generateStaticParams() {
  return OPERATIONS_SOFTWARE_MODULES.map((module) => ({ moduleId: module.id }));
}

export async function generateMetadata({ params }: AuthoringModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const simulatorModule = getOperationsSoftwareModule(moduleId);
  return { title: simulatorModule ? `Kịch bản ${simulatorModule.shortName}` : "Module không tồn tại" };
}

export default async function AuthoringModulePage({ params }: AuthoringModulePageProps) {
  const { moduleId } = await params;
  const simulatorModule = getOperationsSoftwareModule(moduleId);
  if (!simulatorModule) notFound();
  return <TrainingModulePlaceholder module={simulatorModule} mode="authoring" />;
}
