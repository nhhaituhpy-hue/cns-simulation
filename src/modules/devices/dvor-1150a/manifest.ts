import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const DVOR_1150A_MODULE = {
  id: "dvor-1150a",
  category: "device",
  status: "available",
  name: "DVOR 1150A",
  shortName: "DVOR 1150A",
  description: "Mô phỏng thiết bị và giao diện PMDT của hệ thống DVOR 1150A.",
  routes: {
    admin: "/admin/vor",
    student: "/student/vor",
    simulator: "/simulator/dvor-1150a",
    authoring: "/admin/vor",
    review: "/student/vor",
  },
  legacyId: "vor",
} as const satisfies SimulatorModuleDefinition<"dvor-1150a">;
