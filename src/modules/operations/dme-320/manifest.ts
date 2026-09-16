import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const DME_320_SOFTWARE_MODULE = {
  id: "dme-320",
  category: "operations-software",
  status: "available",
  trainingStatus: "available",
  reviewStatus: "available",
  name: "Phần mềm khai thác DME 320",
  shortName: "DME 320",
  description: "Mô phỏng PMDT/LMI vận hành, bảo dưỡng và chẩn đoán MOPIENS 320 DME.",
  routes: {
    admin: "/admin/software/dme-320",
    student: "/student/software/dme-320",
    simulator: "/simulator/software/dme-320",
    authoring: "/authoring/dme-320",
    review: "/review/dme-320",
  },
} as const satisfies SimulatorModuleDefinition<"dme-320">;
