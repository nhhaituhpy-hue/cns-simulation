import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOperationsSoftwareModule, OPERATIONS_SOFTWARE_MODULES } from "@/modules/core/registry";
import { TrainingModulePlaceholder } from "@/modules/training/training-workspace";

interface ReviewModulePageProps {
  params: Promise<{ moduleId: string }>;
}

export function generateStaticParams() {
  return OPERATIONS_SOFTWARE_MODULES.map((module) => ({ moduleId: module.id }));
}

export async function generateMetadata({ params }: ReviewModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  return { title: softwareModule ? `Ôn tập ${softwareModule.shortName}` : "Module không tồn tại" };
}

export default async function ReviewModulePage({ params }: ReviewModulePageProps) {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  if (!softwareModule) notFound();
  return <TrainingModulePlaceholder module={softwareModule} mode="review" />;
}

