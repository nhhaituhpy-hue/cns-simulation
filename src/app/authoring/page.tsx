import type { Metadata } from "next";
import { getSimulatorModule } from "@/modules/core/registry";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";
import { SCENARIO_PARAMETERS_MODULES } from "@/lib/scenario-parameters";

export const metadata: Metadata = { title: "Quản trị kịch bản" };

export default function AuthoringPage() {
  const modules = SCENARIO_PARAMETERS_MODULES.flatMap((entry) => {
    const simulatorModule = getSimulatorModule(entry.moduleId);
    return simulatorModule ? [simulatorModule] : [];
  });

  return <TrainingWorkspaceCatalog mode="authoring" modules={modules} />;
}
