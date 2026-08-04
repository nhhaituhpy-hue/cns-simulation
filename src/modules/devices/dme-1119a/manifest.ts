import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const DME_1119A_MODULE = {
  id: "dme-1119a",
  category: "device",
  status: "available",
  name: "DME 1119A",
  shortName: "DME 1119A",
  description: "Mô phỏng thiết bị và giao diện PMDT của hệ thống DME 1119A.",
  routes: {
    admin: "/admin/dme",
    student: "/student/dme",
    simulator: "/simulator/dme-1119a",
    authoring: "/admin/dme",
    review: "/student/dme",
  },
  legacyId: "dme",
} as const satisfies SimulatorModuleDefinition<"dme-1119a">;
