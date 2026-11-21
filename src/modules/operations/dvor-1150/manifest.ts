import type { SimulatorModuleDefinition } from "@/modules/core/types";
import { DVOR_1150_MODULE } from "@/modules/devices/dvor-1150/manifest";

export const DVOR_1150_SOFTWARE_MODULE = {
  id: "dvor-1150",
  category: "operations-software",
  status: "available",
  name: "Phần mềm khai thác DVOR 1150",
  shortName: "DVOR 1150",
  description: "Mô phỏng DEMO PMDT vận hành và bảo dưỡng DVOR 1150.",
  routes: {
    ...DVOR_1150_MODULE.routes,
    simulator: "/simulator/software/dvor-1150",
  },
} as const satisfies SimulatorModuleDefinition<"dvor-1150">;
