import type { SimulatorModuleDefinition } from "@/modules/core/types";

export const VSAT_SOFTWARE_MODULE = {
  id: "vsat",
  category: "operations-software",
  status: "planned",
  name: "Phần mềm khai thác VSAT",
  shortName: "VSAT",
  description: "Khung mô phỏng phần mềm vận hành và bảo dưỡng hệ thống VSAT.",
  routes: {
    admin: "/admin/software/vsat",
    student: "/student/software/vsat",
    simulator: "/simulator/software/vsat",
    authoring: "/authoring/vsat",
    review: "/review/vsat",
  },
} as const satisfies SimulatorModuleDefinition<"vsat">;
