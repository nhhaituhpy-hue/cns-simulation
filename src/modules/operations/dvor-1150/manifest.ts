import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const DVOR_1150_SOFTWARE_MODULE = {
  id: "dvor-1150",
  category: "operations-software",
  status: "planned",
  name: "Phần mềm khai thác DVOR 1150",
  shortName: "DVOR 1150",
  description: "Khung mô phỏng phần mềm vận hành và bảo dưỡng DVOR 1150.",
  routes: {
    admin: "/admin/software/dvor-1150",
    student: "/student/software/dvor-1150",
    simulator: "/simulator/software/dvor-1150",
    authoring: "/authoring/dvor-1150",
    review: "/review/dvor-1150",
  },
} as const satisfies SimulatorModuleDefinition<"dvor-1150">;
