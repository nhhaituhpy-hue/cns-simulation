import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOperationsSoftwareModule, OPERATIONS_SOFTWARE_MODULES } from "@/modules/core/registry";
import { DVOR_1150_MODULE } from "@/modules/devices/dvor-1150/manifest";
import { OperationsSoftwareSimulator } from "@/modules/operations/software-module-pages";

interface SoftwareModulePageProps {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return OPERATIONS_SOFTWARE_MODULES.map((softwareModule) => ({ moduleId: softwareModule.id }));
}

export async function generateMetadata({ params }: SoftwareModulePageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  return { title: softwareModule?.name ?? "Module không tồn tại" };
}

export default async function SimulatorSoftwareModulePage({ params, searchParams }: SoftwareModulePageProps) {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  if (!softwareModule) notFound();
  if (softwareModule.id === DVOR_1150_MODULE.id) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
        query.append(key, entry);
      }
    }
    redirect(DVOR_1150_MODULE.routes.simulator + (query.size ? `?${query}` : ""));
  }
  return <OperationsSoftwareSimulator module={softwareModule} />;
}
