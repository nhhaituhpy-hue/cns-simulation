import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const DVOR_220_SOFTWARE_MODULE = {
  id: "dvor-220",
  category: "operations-software",
  status: "available",
  trainingStatus: "available",
  reviewStatus: "available",
  name: "Phần mềm khai thác DVOR 220",
  shortName: "DVOR 220",
  description: "Mô phỏng PMDT/LMI vận hành, bảo dưỡng và chẩn đoán MOPIENS 220 DVOR.",
  routes: {
    admin: "/admin/software/dvor-220",
    student: "/student/software/dvor-220",
    simulator: "/simulator/software/dvor-220",
    authoring: "/authoring/dvor-220",
    review: "/review/dvor-220",
  },
} as const satisfies SimulatorModuleDefinition<"dvor-220">;
