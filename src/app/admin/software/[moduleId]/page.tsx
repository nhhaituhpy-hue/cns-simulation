import { notFound, redirect } from "next/navigation";
import { getOperationsSoftwareModule } from "@/modules/core/registry";

export default async function LegacyAdminSoftwareModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const module = getOperationsSoftwareModule(moduleId);
  if (!module) notFound();
  redirect(module.routes.simulator);
}
