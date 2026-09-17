import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const DVOR_1150_MODULE = {
  id: "dvor-1150",
  category: "device",
  status: "available",
  name: "DVOR 1150",
  shortName: "DVOR 1150",
  description: "Mô phỏng thiết bị và giao diện PMDT đơn giản của hệ thống Model 1150 DVOR.",
  routes: {
    admin: "/simulator/dvor-1150",
    student: "/student/dvor-1150",
    simulator: "/simulator/dvor-1150",
    authoring: "/authoring/dvor-1150",
    review: "/review/dvor-1150",
  },
} as const satisfies SimulatorModuleDefinition<"dvor-1150">;
