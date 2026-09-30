import type { Metadata } from "next";
import { getSimulatorModule } from "@/modules/core/registry";
import { TrainingWorkspaceCatalog } from "@/modules/training/training-workspace";
import { SCENARIO_PARAMETERS_MODULES } from "@/lib/scenario-parameters";
import { ADSB_MODULE } from "@/modules/devices/adsb";

export const metadata: Metadata = { title: "Quản trị kịch bản" };

export default function AuthoringPage() {
  const scenarioParametersModules = SCENARIO_PARAMETERS_MODULES.flatMap((entry) => {
    const simulatorModule = getSimulatorModule(entry.moduleId);
    return simulatorModule ? [simulatorModule] : [];
  });
  const modules = [...scenarioParametersModules, ADSB_MODULE].filter(
    (module, index, all) => all.findIndex((candidate) => candidate.id === module.id) === index,
  );

  return (
    <TrainingWorkspaceCatalog
      mode="authoring"
      modules={modules}
    />
  );
}
