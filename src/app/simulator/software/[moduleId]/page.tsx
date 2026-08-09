import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOperationsSoftwareModule, OPERATIONS_SOFTWARE_MODULES } from "@/modules/core/registry";
import { OperationsSoftwareSimulator } from "@/modules/operations/software-module-pages";

interface SoftwareModulePageProps {
  params: Promise<{ moduleId: string }>;
}

export function generateStaticParams() {
  return OPERATIONS_SOFTWARE_MODULES.map((softwareModule) => ({ moduleId: softwareModule.id }));
}

export async function generateMetadata({ params }: SoftwareModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  return { title: softwareModule?.name ?? "Module không tồn tại" };
}

export default async function SimulatorSoftwareModulePage({ params }: SoftwareModulePageProps) {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  if (!softwareModule) notFound();
  return <OperationsSoftwareSimulator module={softwareModule} />;
}
