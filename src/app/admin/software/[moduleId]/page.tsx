import { notFound, redirect } from "next/navigation";
import { getOperationsSoftwareModule } from "@/modules/core/registry";

export default async function LegacyAdminSoftwareModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const softwareModule = getOperationsSoftwareModule(moduleId);
  if (!softwareModule) notFound();
  redirect(softwareModule.routes.simulator);
}

