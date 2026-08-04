import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOperationsSoftwareModule, OPERATIONS_SOFTWARE_MODULES } from "@/modules/core/registry";
import { OperationsSoftwarePlaceholder } from "@/modules/operations/software-module-pages";

interface SoftwareModulePageProps {
  params: Promise<{ moduleId: string }>;
}

export function generateStaticParams() {
  return OPERATIONS_SOFTWARE_MODULES.map((module) => ({ moduleId: module.id }));
}

export async function generateMetadata({ params }: SoftwareModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const module = getOperationsSoftwareModule(moduleId);
  return { title: module?.name ?? "Module không tồn tại" };
}

export default async function SimulatorSoftwareModulePage({ params }: SoftwareModulePageProps) {
  const { moduleId } = await params;
  const module = getOperationsSoftwareModule(moduleId);
  if (!module) notFound();
  return <OperationsSoftwarePlaceholder module={module} />;
}
